const API = "https://xbgqzsbwgmhnmqsuvzex.supabase.co/functions/v1/jr-dashboard";
const AVATAR = "icons/avatar.jpg";
const SRC = {meta:"Meta ads",whatsapp:"WhatsApp",lms_app:"LMS app",email:"Email",google:"Google",chatgpt:"ChatGPT",other:"Other tagged",untagged:"Untagged"};
const $ = (id) => document.getElementById(id);
const inr = (v) => v == null ? "–" : "₹" + Math.round(v).toLocaleString("en-IN");
const inrK = (v) => v == null ? "–" : v >= 1e5 ? "₹" + (v/1e5).toFixed(2) + "L" : v >= 1e3 ? "₹" + (v/1e3).toFixed(1) + "K" : "₹" + Math.round(v);
const pct = (v, d = 0) => v == null ? "–" : (v * 100).toFixed(d) + "%";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const store = { get(k){ try { return localStorage.getItem(k) } catch { return null } }, set(k,v){ try { localStorage.setItem(k,v) } catch {} }, del(k){ try { localStorage.removeItem(k) } catch {} } };

let token = null, timer = null, last = null;

async function call(a, body = {}, auth = false) {
  const r = await fetch(API + "?a=" + a, { method: "POST", headers: { "content-type": "application/json", ...(auth && token ? { authorization: "Bearer " + token } : {}) }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ error: "bad_response" }));
  if (!r.ok) { const e = new Error(j.error || ("http " + r.status)); e.status = r.status; throw e; }
  return j;
}
const MSG = { bad_setup_code:"That setup code or password isn't valid.", origin_not_allowed:"This address isn't approved for the dashboard yet.", challenge_expired:"That took too long, try again.", unknown_passkey:"This device's Face ID key isn't recognised. Tap “Add this device” and enter your password.", not_verified:"Face ID check failed.", no_passkeys:"No device is set up yet.", bad_password:"Wrong password.", locked_out:"Too many wrong tries. Wait 15 minutes." };
const say = (m) => { $("lockMsg").textContent = m || ""; };

// The unlock is remembered on this device for 12 hours, so Face ID is asked once, not on every open.
const tokenExp = (t) => { try { return JSON.parse(atob(t.split(".")[0].replace(/-/g, "+").replace(/_/g, "/"))).exp * 1000; } catch { return 0; } };
function saveToken(t) { token = t; store.set("jr_tok", t); }
async function longToken() { try { saveToken((await sec("renew")).token); } catch {} }

async function initLock() {
  const t = store.get("jr_tok");
  if (t && tokenExp(t) > Date.now() + 60000) { token = t; return openApp(); }
  show("lock");
  if (!window.PublicKeyCredential) $("unlockBox").classList.add("hidden");
  let registered = false;
  try { registered = (await call("status")).registered; } catch { say("Can't reach the dashboard server. Check your connection."); }
  $("unlockBox").classList.toggle("hidden", !registered || !window.PublicKeyCredential);
  $("addDeviceBtn").classList.toggle("hidden", !registered);
  $("setupBox").classList.toggle("hidden", registered);
}
async function unlock() {
  say(""); $("unlockBtn").disabled = true;
  try {
    const opts = await call("login-options");
    const resp = await SimpleWebAuthnBrowser.startAuthentication(opts);
    saveToken((await call("login-verify", { response: resp })).token);
    await longToken(); openApp();
  } catch (e) { say(MSG[e.message] || (e.name === "NotAllowedError" ? "Face ID was cancelled. Tap the button again, then Continue." : e.message)); }
  finally { $("unlockBtn").disabled = false; }
}
async function pwUnlock() {
  const p = $("pwIn").value; if (!p) return say("Enter your password.");
  say(""); $("pwBtn").disabled = true;
  try { saveToken((await sec("pw-login", { password: p })).token); $("pwIn").value = ""; openApp(); }
  catch (e) { say(MSG[e.message] || e.message); }
  finally { $("pwBtn").disabled = false; }
}
async function setup() {
  const code = $("codeIn").value.trim(); if (!code) return say("Enter your password or setup code.");
  say(""); $("setupBtn").disabled = true;
  try {
    const opts = await call("reg-options", { code });
    const resp = await SimpleWebAuthnBrowser.startRegistration(opts);
    const label = /iPhone|iPad/.test(navigator.userAgent) ? "iPhone" : /Mac/.test(navigator.userAgent) ? "Mac" : "Device";
    saveToken((await call("reg-verify", { code, response: resp, label })).token);
    await longToken(); openApp();
  } catch (e) { say(MSG[e.message] || e.message); }
  finally { $("setupBtn").disabled = false; }
}
function show(which) { $("lock").classList.toggle("hidden", which !== "lock"); $("app").classList.toggle("hidden", which !== "app"); }
function lock() { token = null; last = null; store.del("jr_tok"); clearInterval(timer); show("lock"); initLock(); }
function openApp() {
  show("app");
  showSection(SECTIONS[store.get("jr_tab")] ? store.get("jr_tab") : "overview");
  clearInterval(timer);
  timer = setInterval(() => { if (!document.hidden && current === "overview") load(); }, 60000);
}

async function load(force = false) {
  $("refreshBtn").classList.add("spin");
  try { last = await call("data", { force }, true); render(last); }
  catch (e) { if (e.status === 401) return lock(); $("errs").innerHTML = `<div class="err">Couldn't refresh: ${esc(e.message)}</div>`; $("dot").classList.add("stale"); }
  finally { $("refreshBtn").classList.remove("spin"); }
}

document.querySelectorAll(".avatar").forEach((i) => (i.src = AVATAR));
$("unlockBtn").onclick = unlock;
$("pwBtn").onclick = pwUnlock;
$("pwIn").onkeydown = (e) => { if (e.key === "Enter") pwUnlock(); };
$("setupBtn").onclick = setup;
$("addDeviceBtn").onclick = () => { $("setupBox").classList.remove("hidden"); $("addDeviceBtn").classList.add("hidden"); };
$("refreshBtn").onclick = () => current === "overview" ? load(true) : showSection(current);
$("lockBtn").onclick = lock;
$("menuBtn").onclick = () => document.body.classList.toggle("nav-open");
$("scrim").onclick = () => document.body.classList.remove("nav-open");
document.querySelectorAll(".nav a").forEach((a) => (a.onclick = (e) => { e.preventDefault(); showSection(a.dataset.s); }));
document.addEventListener("visibilitychange", () => {
  if (document.hidden || !token) return;
  if (tokenExp(token) < Date.now()) return lock();
  if (current === "overview") load();
});
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
initLock();
