function render(d) {
  const t = d.today_summary, m = d.month, tg = d.targets || {};
  $("dot").classList.toggle("stale", !d.live_razorpay);
  $("updated").textContent = new Date(d.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  $("errs").innerHTML = d.errors?.length ? `<div class="err">${d.errors.map(esc).join("<br>")}</div>` : "";
  $("liveChip").textContent = d.live_razorpay ? "live Razorpay" : "ledger (≤2h old)";
  $("todayLbl").textContent = new Date(d.today + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  $("banked").textContent = inr(t.banked);
  const diff = t.banked - t.yesterday_same_time;
  const dp = t.yesterday_same_time ? diff / t.yesterday_same_time : null;
  $("vsY").innerHTML = `<span class="${diff >= 0 ? "up" : "down"}">${diff >= 0 ? "▲" : "▼"} ${inr(Math.abs(diff))}${dp != null ? " (" + pct(Math.abs(dp)) + ")" : ""}</span> vs yesterday by now · yesterday closed ${inr(t.yesterday_total)}`;
  const dayFrac = ((Date.now() / 1000 + 19800) % 86400) / 86400;
  const goal = tg.daily_inr || 100000;
  $("tgtBar").style.width = Math.min(100, t.banked / goal * 100) + "%";
  $("tgtPace").style.left = Math.min(100, dayFrac * 100) + "%";
  $("tgtL").textContent = pct(t.banked / goal) + " of " + inrK(goal) + " day target";
  $("tgtR").textContent = (goal - t.banked > 0 ? inr(goal - t.banked) + " to go" : "target hit");

  $("mLbl").textContent = new Date(m.start + "T00:00:00").toLocaleDateString("en-IN", { month: "long" });
  $("mtd").textContent = inrK(m.banked);
  const mg = tg.month_inr || 3000000;
  $("mPace").innerHTML = `Pace <b class="num">${inrK(m.pace)}</b> vs ${inrK(mg)} target`;
  $("mBar").style.width = Math.min(100, m.banked / mg * 100) + "%";
  $("mL").textContent = pct(m.banked / mg, 1);
  $("mR").textContent = m.roas != null ? "ROAS " + m.roas.toFixed(2) : "";

  const roasCls = (r) => r == null ? "" : r >= (tg.roas || 1.3) ? "up" : r >= 1 ? "" : "down";
  $("kpis").innerHTML = [
    ["Orders", t.orders, "AOV " + inr(t.aov)],
    ["Meta spend", t.meta_spend == null ? "–" : inr(t.meta_spend), t.meta_spend == null ? "Meta not synced yet" : "+GST " + inr(t.meta_spend * (tg.gst || 1.18))],
    ["ROAS · all banked", t.roas == null ? "–" : `<span class="${roasCls(t.roas)}">${t.roas.toFixed(2)}</span>`, "Meta-tagged " + (t.meta_roas == null ? "–" : t.meta_roas.toFixed(2)) + " · target " + (tg.roas || 1.3)],
    ["Payment capture", pct(t.capture_rate), t.failed + " failed · " + inr(t.failed_inr)],
  ].map(([l, v, s]) => `<div class="kpi"><div class="l">${l}</div><div class="v num">${v}</div><div class="s num">${s}</div></div>`).join("");

  const srcs = Object.entries(d.by_source_today).sort((a, b) => b[1].inr - a[1].inr);
  const max = Math.max(1, ...srcs.map(([, v]) => v.inr));
  $("sources").innerHTML = srcs.length ? srcs.map(([k, v]) => `<div class="row"><div class="nm"><i style="background:var(--s-${k})"></i>${SRC[k] || esc(k)}</div><div class="track"><i style="width:${v.inr / max * 100}%;background:var(--s-${k})"></i></div><div class="val num">${inr(v.inr)}<small>${v.orders} · ${pct(v.inr / Math.max(1, t.banked))}</small></div></div>`).join("") : `<div class="empty">No captured payments yet today.</div>`;

  $("hourly").innerHTML = lineChart(d.hourly.today, d.hourly.yesterday);
  $("trend").innerHTML = trendChart(d.trend, tg.gst || 1.18);

  $("courses").innerHTML = table(["Course", "Orders", "Banked"], d.by_course_today.map((c) => [esc(c.course.replace(/-/g, " ")), c.orders, inr(c.inr)]));
  if (d.meta?.connected) {
    $("metaSt").textContent = d.meta.synced_at ? "synced " + new Date(d.meta.synced_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "live";
    $("camps").innerHTML = table(["Campaign", "Spend", "Clicks", "Purch."], d.meta.campaigns_today.map((c) => [esc(c.name), inr(c.spend), c.clicks, c.purchases]));
  } else { $("metaSt").textContent = "not connected"; $("camps").innerHTML = `<div class="empty">Meta spend has not synced yet, so spend and ROAS are hidden.</div>`; }

  const wa = d.whatsapp || {}; const waSrc = d.by_source_today.whatsapp || { inr: 0, orders: 0 };
  $("wa").innerHTML = kv([["Banked today", inr(waSrc.inr) + ` <small class="chip">${waSrc.orders} order${waSrc.orders === 1 ? "" : "s"}</small>`], ["Gupshup wallet", wa.wallet == null ? "–" : inr(Number(wa.wallet))], ...(wa.sends_today || []).map((s) => ["Sent · " + esc(s.flow), s.n])])
    + subTable(d.owned_campaigns_today.filter((c) => c.src === "whatsapp"));
  const em = d.email || {}; const emSrc = d.by_source_today.email || { inr: 0, orders: 0 };
  $("email").innerHTML = kv([["Banked today", inr(emSrc.inr) + ` <small class="chip">${emSrc.orders} order${emSrc.orders === 1 ? "" : "s"}</small>`], ...(em.connected ? [["Sent today", (em.today.sent || 0).toLocaleString("en-IN")], ["Opens / clicks", (em.today.opens || 0) + " / " + (em.today.clicks || 0)], ["Reputation", em.reputation ?? "–"]] : [["Mandrill", "not connected"]])])
    + subTable(d.owned_campaigns_today.filter((c) => c.src === "email"));
  $("fails").innerHTML = kv([["Failed payments", t.failed], ["Value", inr(t.failed_inr)]]) + (d.fail_reasons_today.length ? table(["Reason", "#"], d.fail_reasons_today.map((r) => [esc(r.reason), r.n])) : "");

  const l = d.lms;
  $("lms").innerHTML = l ? [
    ["Enrolments today", l.enrol_today, "paid courses, packs count per course"],
    ["Started learning", pct(l.enrol_mtd ? l.started_mtd / l.enrol_mtd : null), `${l.started_mtd} of ${l.enrol_mtd} this month · goal 65%`],
    ["Reached 50%", pct(l.enrol_mtd ? l.half_mtd / l.enrol_mtd : null, 1), `${l.half_mtd} this month · goal 6%`],
    ["Active learners today", l.active_today, l.live_courses + " live courses"],
    ["Rating · 30 days", l.rating_30d ?? "–", l.ratings_30d + " ratings · goal 4.2"],
    ["Completed", l.completed_mtd, "this month's enrolments"],
  ].map(([a, v, s]) => `<div class="kpi"><div class="l">${a}</div><div class="v num">${v}</div><div class="s">${s}</div></div>`).join("") : `<div class="empty">LMS unavailable.</div>`;
}
const kv = (rows) => `<div class="rows" style="gap:8px;margin-bottom:10px">${rows.map(([k, v]) => `<div style="display:flex;justify-content:space-between;gap:10px;font-size:14px"><span style="color:var(--muted)">${k}</span><span class="num">${v}</span></div>`).join("")}</div>`;
const table = (h, rows) => rows.length ? `<table><tr>${h.map((x) => `<th>${x}</th>`).join("")}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td class="num">${c}</td>`).join("")}</tr>`).join("")}</table>` : `<div class="empty">Nothing yet today.</div>`;
const subTable = (rows) => rows.length ? table(["Campaign", "Orders", "Banked"], rows.map((c) => [esc(c.campaign), c.orders, inr(c.inr)])) : "";

function lineChart(a, b) {
  const W = 560, H = 190, P = 26, nowH = new Date(Date.now() + 19800e3).getUTCHours();
  const max = Math.max(1, ...a, ...b) * 1.08;
  const x = (i) => P + i * (W - P - 6) / 23, y = (v) => H - 20 - v / max * (H - 34);
  const path = (arr, upto) => arr.slice(0, upto + 1).map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join("");
  const grid = [0, .5, 1].map((f) => `<line x1="${P}" x2="${W - 6}" y1="${y(max / 1.08 * f)}" y2="${y(max / 1.08 * f)}" stroke="var(--line)"/><text x="0" y="${y(max / 1.08 * f) + 4}" fill="var(--faint)" font-size="10">${inrK(max / 1.08 * f)}</text>`).join("");
  const xl = [0, 6, 12, 18, 23].map((h) => `<text x="${x(h)}" y="${H - 4}" fill="var(--faint)" font-size="10" text-anchor="middle">${h}h</text>`).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${grid}${xl}<path d="${path(b, 23)}" fill="none" stroke="var(--faint)" stroke-width="2" stroke-dasharray="4 4"/><path d="${path(a, nowH)}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/><circle cx="${x(nowH)}" cy="${y(a[nowH])}" r="4" fill="var(--accent)"/></svg>`;
}
function trendChart(rows, gst) {
  rows = rows.slice(-14);
  const W = 1100, H = 220, P = 40, n = rows.length, bw = (W - P) / n;
  const max = Math.max(1, ...rows.map((r) => Math.max(r.banked, (r.spend || 0) * gst))) * 1.1;
  const y = (v) => H - 22 - v / max * (H - 36);
  const bars = rows.map((r, i) => `<rect data-tip="${r.date}: banked ${inr(r.banked)}${r.spend != null ? " · spend+GST " + inr(r.spend * gst) + " · ROAS " + (r.spend ? (r.banked / (r.spend * gst)).toFixed(2) : "–") : ""}" x="${P + i * bw + bw * .18}" y="${y(r.banked)}" width="${bw * .64}" height="${Math.max(0, H - 22 - y(r.banked))}" rx="4" fill="var(--accent)" opacity="${i === n - 1 ? 1 : .75}"/>`).join("");
  const sp = rows.some((r) => r.spend != null) ? `<path d="${rows.map((r, i) => (i ? "L" : "M") + (P + i * bw + bw / 2).toFixed(1) + " " + y((r.spend || 0) * gst).toFixed(1)).join("")}" fill="none" stroke="var(--blue)" stroke-width="2.5"/>` : "";
  const xl = rows.map((r, i) => i % 2 === n % 2 ? "" : `<text x="${P + i * bw + bw / 2}" y="${H - 6}" fill="var(--faint)" font-size="11" text-anchor="middle">${+r.date.slice(8)}/${+r.date.slice(5, 7)}</text>`).join("");
  const grid = [0, .5, 1].map((f) => `<line x1="${P}" x2="${W}" y1="${y(max / 1.1 * f)}" y2="${y(max / 1.1 * f)}" stroke="var(--line)"/><text x="0" y="${y(max / 1.1 * f) + 4}" fill="var(--faint)" font-size="11">${inrK(max / 1.1 * f)}</text>`).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${grid}${bars}${sp}${xl}</svg>`;
}
document.addEventListener("pointermove", (e) => { const t = e.target.closest?.("[data-tip]"); const tip = $("tip"); if (!t) { tip.style.display = "none"; return; } tip.textContent = t.dataset.tip; tip.style.display = "block"; tip.style.left = Math.min(e.clientX + 12, innerWidth - 260) + "px"; tip.style.top = (e.clientY + 12) + "px"; });

