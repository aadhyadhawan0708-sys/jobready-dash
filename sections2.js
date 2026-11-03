// LMS and Trends tabs + the section router.

async function viewLms(el) {
  const d = await sec("lms");
  const last = d.dau[d.dau.length - 1] || { n: 0, avg_min: 0 }, prev = d.dau[d.dau.length - 2] || { n: 0 };
  const rTot = d.ratings.reduce((a, r) => a + r.n, 0), rAvg = rTot ? d.ratings.reduce((a, r) => a + r.rating * r.n, 0) / rTot : null;
  const buys30 = d.lms_app_purchases.reduce((a, r) => a + r.banked, 0), buysToday = d.lms_app_purchases.find((r) => r.d === d.dau[d.dau.length - 1]?.d);
  const enrMtd = d.courses.reduce((a, c) => a + c.enrolled, 0), stMtd = d.courses.reduce((a, c) => a + c.started, 0), halfMtd = d.courses.reduce((a, c) => a + c.half, 0);
  const maxR = Math.max(1, ...d.ratings.map((r) => r.n));
  el.innerHTML = `<div class="grid">` + card("LMS", kpiGrid([
    ["Active learners today", n0(last.n), pctChg(last.n, prev.n) + " vs yesterday"], ["Weekly active", n0(d.totals.wau), "monthly " + n0(d.totals.mau)],
    ["Avg time per active learner", (last.avg_min ?? 0) + " min", "today"], ["Lessons completed today", n0(d.totals.lessons_today), ""],
    ["Rating · 30 days", rAvg ? rAvg.toFixed(2) : "–", rTot + " ratings · goal 4.2"], ["Bought inside LMS · 30d", inr(buys30), (buysToday ? buysToday.orders + " today · " + inr(buysToday.banked) : "none today")],
    ["Started learning", pct(enrMtd ? stMtd / enrMtd : null), stMtd + " of " + enrMtd + " this month · goal 65%"], ["Reached 50%", pct(enrMtd ? halfMtd / enrMtd : null, 1), halfMtd + " this month · goal 6%"],
  ]))
    + card("Daily active learners", barChart(d.dau.map((r) => dm(r.d)), d.dau.map((r) => r.n)), "last 30 days")
    + card("Paid enrolments per day", barChart(d.enrollments.map((r) => dm(r.d)), d.enrollments.map((r) => r.paid)), "packs count once per course", "c6")
    + card("LMS app purchases", d.lms_app_purchases.length ? barChart(d.lms_app_purchases.map((r) => dm(r.d)), d.lms_app_purchases.map((r) => r.banked), inrK) : `<div class="empty">No purchases inside the LMS in 30 days.</div>`, "banked per day", "c6")
    + card("Ratings · 30 days", `<div class="rows">${[5, 4, 3, 2, 1].map((s) => { const r = d.ratings.find((x) => x.rating === s) || { n: 0 }; return `<div class="row"><div class="nm">${"★".repeat(s)}</div><div class="track"><i style="width:${r.n / maxR * 100}%;background:var(--warn)"></i></div><div class="val num">${r.n}</div></div>`; }).join("")}</div>`, "", "c4")
    + card("Courses · this month's paid enrolments", `<div class="scroll">${table(["Course", "Enrolled", "Started", "50%+", "Avg progress", "Rating"], d.courses.filter((c) => c.enrolled > 0).map((c) => [esc(c.title), c.enrolled, pct(c.enrolled ? c.started / c.enrolled : null), c.half, (c.avg_progress ?? 0) + "%", c.rating ?? "–"]))}</div>`, "", "c8")
    + `</div>`;
}

async function viewTrends(el) {
  const d = await sec("trends");
  const days = d.days.slice(-30), gst = 1.18;
  const last14 = d.days.slice(-15);
  const dayRows = last14.slice(1).reverse().map((r) => {
    const i = last14.indexOf(r), p = last14[i - 1], wk = d.days[d.days.indexOf(r) - 7];
    return [new Date(r.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }), inr(r.banked), pctChg(r.banked, p?.banked), wk ? pctChg(r.banked, wk.banked) : "–", r.orders,
      r.orders ? inr(r.banked / r.orders) : "–", r.spend == null ? "–" : inr(r.spend), r.spend ? roasTag(r.banked / (r.spend * gst)) : "–", pct(r.orders + r.failed ? r.orders / (r.orders + r.failed) : null)];
  });
  const weeks = d.weeks;
  const wkRows = weeks.slice().reverse().map((w) => {
    const p = weeks[weeks.indexOf(w) - 1], partial = w.days < 7;
    const avg = w.banked / w.days, pavg = p ? p.banked / p.days : null;
    return [`${dm(w.week)}${partial ? ` <small>(${w.days}d)</small>` : ""}`, inr(w.banked), inr(avg), pavg ? pctChg(avg, pavg) : "–", w.orders, w.orders ? inr(w.banked / w.orders) : "–",
      w.spend_days ? inr(w.spend) : "–", w.spend_days ? roasTag(w.banked / (w.spend * gst)) : "–", pct(w.orders + w.failed ? w.orders / (w.orders + w.failed) : null)];
  });
  el.innerHTML = `<div class="grid">`
    + card("Daily banked · 30 days", barChart(days.map((r) => dm(r.date)), days.map((r) => r.banked), inrK, days.map((r) => r.spend == null ? null : r.spend * gst))
      + `<div class="legend"><span><i style="background:var(--accent)"></i>Banked</span><span><i style="background:var(--blue)"></i>Meta spend × 1.18</span></div>`, d.spend_source === "live" ? "spend live" : d.spend_source === "synced" ? "spend as last synced" : "")
    + card("Week on week", `<div class="scroll">${table(["Week of", "Banked", "Per day", "WoW (per day)", "Orders", "AOV", "Spend", "ROAS", "Capture"], wkRows)}</div>`, "Monday start, partial weeks compared per day")
    + card("Day by day", `<div class="scroll">${table(["Day", "Banked", "vs prev day", "vs same day last week", "Orders", "AOV", "Spend", "ROAS", "Capture"], dayRows)}</div>`, "last 14 days")
    + card("Revenue mix by day", barChart(days.map((r) => dm(r.date)), days.map((r) => r.meta), inrK, days.map((r) => r.whatsapp + r.lms_app))
      + `<div class="legend"><span><i style="background:var(--accent)"></i>Meta-tagged</span><span><i style="background:var(--blue)"></i>WhatsApp + LMS app</span></div>`, "")
    + `</div>`;
}

// ---------- router ----------
const SECTIONS = { overview: "Overview", targets: "Target scorecard", meta: "Meta", sku: "SKUs", lms: "LMS", trends: "Growth trends" };
const VIEWS = { targets: viewTargets, meta: viewMeta, sku: viewSku, lms: viewLms, trends: viewTrends };
let current = "overview";
async function showSection(name) {
  current = name;
  try { localStorage.setItem("jr_tab", name); } catch {}
  document.querySelectorAll(".nav a").forEach((a) => a.classList.toggle("on", a.dataset.s === name));
  $("secTitle").textContent = SECTIONS[name];
  document.body.classList.remove("nav-open");
  const ov = name === "overview";
  $("ovGrid").classList.toggle("hidden", !ov);
  $("sec").classList.toggle("hidden", ov);
  if (ov) return load();
  const el = $("sec");
  $("errs").innerHTML = "";
  el.innerHTML = `<div class="empty pad">Loading ${SECTIONS[name]}…</div>`;
  $("refreshBtn").classList.add("spin");
  try { await VIEWS[name](el); }
  catch (e) { if (e.status === 401) return lock(); el.innerHTML = ""; showErr(e); }
  finally { $("refreshBtn").classList.remove("spin"); }
}
