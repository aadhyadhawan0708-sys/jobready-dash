const API = "https://xbgqzsbwgmhnmqsuvzex.supabase.co/functions/v1/jr-dashboard";
const AVATAR = "icons/avatar.jpg";
const SRC = {meta:"Meta ads",whatsapp:"WhatsApp",lms_app:"LMS app",email:"Email",google:"Google",chatgpt:"ChatGPT",other:"Other tagged",untagged:"Untagged"};
const $ = (id) => document.getElementById(id);
const inr = (v) => v == null ? "–" : "₹" + Math.round(v).toLocaleString("en-IN");
const inrK = (v) => v == null ? "–" : v >= 1e5 ? "₹" + (v/1e5).toFixed(2) + "L" : v >= 1e3 ? "₹" + (v/1e3).toFixed(1) + "K" : "₹" + Math.round(v);
const pct = (v, d = 0) => v == null ? "–" : (v * 100).toFixed(d) + "%";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const store = { get(k){ try { return localStorage.getItem(k) } catch { return null } }, set(k,v){ try { localStorage.setItem(k,v) } catch {} }, del(k){ try { localStorage.removeItem(k) } catch {} } };
// The unlock lives only for this app session: closing the app (or 10 min in the background) asks for Face ID / password again.
const sess = { get(k){ try { return sessionStorage.getItem(k) } catch { return null } }, set(k,v){ try { sessionStorage.setItem(k,v) } catch {} }, del(k){ try { sessionStorage.removeItem(k) } catch {} } };
const RELOCK_MS = 10 * 60 * 1000;

let token = null, timer = null, last = null, hiddenAt = 0, viewDay = null; // viewDay null = today, live
const DAY_API = "https://xbgqzsbwgmhnmqsuvzex.supabase.co/functions/v1/jr-dash-day";
const istToday = () => new Date(Date.now() + 19800e3).toISOString().slice(0, 10);
async function dayData(day) {
  const r = await fetch(DAY_API, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: JSON.stringify({ day }) });
  const j = await r.json().catch(() => ({ error: "bad_response" }));
  if (!r.ok) { const e = new Error(j.error || "http " + r.status); e.status = r.status; throw e; }
  return j;
}
function setDay(day) {
  const t = istToday();
  if (!day || day >= t) day = null;
  viewDay = day;
  $("dayIn").value = day || t; $("dayIn").max = t;
  $("todayBtn").classList.toggle("ghost", !!day);
  $("nextDay").disabled = !day;
  load(true);
}
const shiftDay = (n) => { const d = new Date((viewDay || istToday()) + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); setDay(d.toISOString().slice(0, 10)); };

async function call(a, body = {}, auth = false) {
  const r = await fetch(API + "?a=" + a, { method: "POST", headers: { "content-type": "application/json", ...(auth && token ? { authorization: "Bearer " + token } : {}) }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ error: "bad_response" }));
  if (!r.ok) { const e = new Error(j.error || ("http " + r.status)); e.status = r.status; throw e; }
  return j;
}
const MSG = { bad_setup_code:"That setup code or password isn't valid.", origin_not_allowed:"This address isn't approved for the dashboard yet.", challenge_expired:"That took too long, try again.", unknown_passkey:"This device's Face ID key isn't recognised. Tap “Add this device” and enter your password.", not_verified:"Face ID check failed.", no_passkeys:"No device is set up yet.", bad_password:"Wrong password.", locked_out:"Too many wrong tries. Wait 15 minutes." };
const say = (m) => { $("lockMsg").textContent = m || ""; };

const tokenExp = (t) => { try { return JSON.parse(atob(t.split(".")[0].replace(/-/g, "+").replace(/_/g, "/"))).exp * 1000; } catch { return 0; } };
function saveToken(t) { token = t; sess.set("jr_tok", t); }
async function longToken() { try { saveToken((await sec("renew")).token); } catch {} }

async function initLock() {
  store.del("jr_tok"); // older versions kept the unlock for 12 h on the device
  const t = sess.get("jr_tok");
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
function lock() { token = null; last = null; sess.del("jr_tok"); clearInterval(timer); show("lock"); initLock(); }
function openApp() {
  show("app");
  showSection(SECTIONS[store.get("jr_tab")] ? store.get("jr_tab") : "overview");
  clearInterval(timer);
  timer = setInterval(() => { if (!document.hidden && current === "overview" && !viewDay) load(); }, 60000);
}

async function load(force = false) {
  $("refreshBtn").classList.add("spin");
  try { last = viewDay ? await dayData(viewDay) : await call("data", { force }, true); render(last); }
  catch (e) { if (e.status === 401) return lock(); showErr(e); }
  finally { $("refreshBtn").classList.remove("spin"); }
}

// Friendly error with Retry and a way back to the lock screen.
function showErr(e) {
  const busy = e.status === 402 || e.status === 503 || e.status === 546;
  const msg = busy ? "The data server (Supabase) is refusing requests right now. Check the Supabase project, then tap Retry."
    : !navigator.onLine ? "You're offline. Connect to the internet and tap Retry." : "Couldn't load the data (" + esc(e.message) + ").";
  $("errs").innerHTML = `<div class="err">${msg} <button class="btn sm" id="retryBtn" style="margin-left:8px">Retry</button> <button class="btn sm ghost" id="relockBtn">Lock</button></div>`;
  $("dot").classList.add("stale");
  $("retryBtn").onclick = () => { $("errs").innerHTML = ""; current === "overview" ? load(true) : showSection(current); };
  $("relockBtn").onclick = lock;
}

document.querySelectorAll(".avatar").forEach((i) => (i.src = AVATAR));
$("unlockBtn").onclick = unlock;
$("pwBtn").onclick = pwUnlock;
$("pwIn").onkeydown = (e) => { if (e.key === "Enter") pwUnlock(); };
$("setupBtn").onclick = setup;
$("addDeviceBtn").onclick = () => { $("setupBox").classList.remove("hidden"); $("addDeviceBtn").classList.add("hidden"); };
$("refreshBtn").onclick = () => current === "overview" ? load(true) : showSection(current);
$("lockBtn").onclick = lock;
$("dayIn").max = istToday(); $("dayIn").value = istToday();
$("dayIn").onchange = (e) => setDay(e.target.value);
$("todayBtn").onclick = () => setDay(null);
$("prevDay").onclick = () => shiftDay(-1);
$("nextDay").onclick = () => shiftDay(1);
$("nextDay").disabled = true;
$("menuBtn").onclick = () => document.body.classList.toggle("nav-open");
$("scrim").onclick = () => document.body.classList.remove("nav-open");
document.querySelectorAll(".nav a").forEach((a) => (a.onclick = (e) => { e.preventDefault(); showSection(a.dataset.s); }));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  if (!token) return;
  if (tokenExp(token) < Date.now() || (hiddenAt && Date.now() - hiddenAt > RELOCK_MS)) return lock();
  if (current === "overview" && !viewDay) load();
});
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
initLock();
