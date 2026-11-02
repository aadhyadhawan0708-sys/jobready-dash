const API = "https://xbgqzsbwgmhnmqsuvzex.supabase.co/functions/v1/jr-dashboard";
const SRC = {meta:"Meta ads",whatsapp:"WhatsApp",lms_app:"LMS app",email:"Email",google:"Google",chatgpt:"ChatGPT",other:"Other tagged",untagged:"Untagged"};
const $ = (id) => document.getElementById(id);
const inr = (v) => v == null ? "–" : "₹" + Math.round(v).toLocaleString("en-IN");
const inrK = (v) => v == null ? "–" : v >= 1e5 ? "₹" + (v/1e5).toFixed(2) + "L" : v >= 1e3 ? "₹" + (v/1e3).toFixed(1) + "K" : "₹" + Math.round(v);
const pct = (v, d = 0) => v == null ? "–" : (v * 100).toFixed(d) + "%";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const store = { get(k){ try { return localStorage.getItem(k) } catch { return null } }, set(k,v){ try { localStorage.setItem(k,v) } catch {} } };

let token = null, timer = null, hiddenAt = 0, last = null;

async function call(a, body = {}, auth = false) {
  const r = await fetch(API + "?a=" + a, { method: "POST", headers: { "content-type": "application/json", ...(auth && token ? { authorization: "Bearer " + token } : {}) }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ error: "bad_response" }));
  if (!r.ok) { const e = new Error(j.error || ("http " + r.status)); e.status = r.status; throw e; }
  return j;
}
const MSG = { bad_setup_code:"That setup code isn't valid or has expired.", origin_not_allowed:"This address isn't approved for the dashboard yet.", challenge_expired:"That took too long, try again.", unknown_passkey:"This device's Face ID key isn't recognised. Use a setup code to add it.", not_verified:"Face ID check failed.", no_passkeys:"No device is set up yet." };
const say = (m) => { $("lockMsg").textContent = m || ""; };

async function initLock() {
  show("lock");
  if (!window.PublicKeyCredential) { say("This browser can't use Face ID / Touch ID."); return; }
  let registered = false;
  try { registered = (await call("status")).registered; } catch { say("Can't reach the dashboard server. Check your connection."); }
  $("unlockBox").classList.toggle("hidden", !registered);
  $("setupBox").classList.toggle("hidden", registered);
  $("addDeviceBtn").classList.toggle("hidden", !registered);
  $("setupBox").style.display = registered ? "none" : "flex";
  if (registered && !document.hidden) unlock(true);
}
async function unlock(auto) {
  say(""); $("unlockBtn").disabled = true;
  try {
    const opts = await call("login-options");
    const resp = await SimpleWebAuthnBrowser.startAuthentication(opts);
    token = (await call("login-verify", { response: resp })).token;
    openApp();
  } catch (e) { if (!auto || e.name !== "NotAllowedError") say(MSG[e.message] || (e.name === "NotAllowedError" ? "Face ID was cancelled." : e.message)); }
  finally { $("unlockBtn").disabled = false; }
}
async function setup() {
  const code = $("codeIn").value.trim(); if (!code) return say("Enter the setup code.");
  say(""); $("setupBtn").disabled = true;
  try {
    const opts = await call("reg-options", { code });
    const resp = await SimpleWebAuthnBrowser.startRegistration(opts);
    const label = /iPhone|iPad/.test(navigator.userAgent) ? "iPhone" : /Mac/.test(navigator.userAgent) ? "Mac" : "Device";
    token = (await call("reg-verify", { code, response: resp, label })).token;
    store.set("jr_dev", "1"); openApp();
  } catch (e) { say(MSG[e.message] || e.message); }
  finally { $("setupBtn").disabled = false; }
}
function show(which) { $("lock").classList.toggle("hidden", which !== "lock"); $("app").classList.toggle("hidden", which !== "app"); }
function lock() { token = null; last = null; clearInterval(timer); show("lock"); initLock(); }
function openApp() { show("app"); load(); clearInterval(timer); timer = setInterval(() => !document.hidden && load(), 60000); }

async function load(force = false) {
  $("refreshBtn").classList.add("spin");
  try { last = await call("data", { force }, true); render(last); }
  catch (e) { if (e.status === 401) return lock(); $("errs").innerHTML = `<div class="err">Couldn't refresh: ${esc(e.message)}</div>`; $("dot").classList.add("stale"); }
  finally { $("refreshBtn").classList.remove("spin"); }
}

$("unlockBtn").onclick = () => unlock(false);
$("setupBtn").onclick = setup;
$("addDeviceBtn").onclick = () => { $("setupBox").classList.remove("hidden"); $("setupBox").style.display = "flex"; $("addDeviceBtn").classList.add("hidden"); };
$("refreshBtn").onclick = () => load(true);
$("lockBtn").onclick = lock;
// Re-lock when the app has been in the background for more than 2 minutes.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  if (token && Date.now() - hiddenAt > 120000) lock(); else if (token) load();
});
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
initLock();
