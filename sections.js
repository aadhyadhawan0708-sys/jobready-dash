// Category tabs: Targets, Meta, SKUs, LMS, Trends. Data comes from the jr-dash-sections function.
const SEC_API = "https://xbgqzsbwgmhnmqsuvzex.supabase.co/functions/v1/jr-dash-sections";
async function sec(a, body = {}) {
  const r = await fetch(SEC_API + "?a=" + a, { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ error: "bad_response" }));
  if (!r.ok) { const e = new Error(j.error || "http " + r.status); e.status = r.status; throw e; }
  return j;
}
const x2 = (v) => v == null ? "–" : Number(v).toFixed(2);
const n0 = (v) => v == null ? "–" : Math.round(v).toLocaleString("en-IN");
const roasTag = (r) => r == null ? "–" : `<span class="${r >= 1.3 ? "up" : r >= 1 ? "" : "down"}">${x2(r)}</span>`;
const kpiGrid = (items, cls = "") => `<div class="kpis ${cls}">${items.map(([l, v, s]) => `<div class="kpi"><div class="l">${l}</div><div class="v num">${v}</div><div class="s">${s ?? ""}</div></div>`).join("")}</div>`;
const card = (title, body, sub = "", span = "") => `<div class="card ${span}"><h2>${title} <span>${sub}</span></h2>${body}</div>`;
const pctChg = (a, b) => b ? `<span class="${a >= b ? "up" : "down"}">${a >= b ? "▲" : "▼"} ${Math.abs((a / b - 1) * 100).toFixed(0)}%</span>` : "–";

function barChart(labels, values, fmt = n0, line = null) {
  const sm = innerWidth < 700, W = sm ? 560 : 1100, H = sm ? 230 : 200, P = sm ? 50 : 44, fs = sm ? 15 : 11, n = values.length || 1, bw = (W - P) / n;
  const max = Math.max(1, ...values, ...(line || []).map((v) => v || 0)) * 1.1;
  const y = (v) => H - 22 - (v || 0) / max * (H - 34);
  const bars = values.map((v, i) => `<rect data-tip="${labels[i]}: ${fmt(v)}${line ? " · " + fmt(line[i]) : ""}" x="${P + i * bw + bw * .15}" y="${y(v)}" width="${bw * .7}" height="${Math.max(0, H - 22 - y(v))}" rx="3" fill="var(--accent)" opacity="${i === n - 1 ? 1 : .75}"/>`).join("");
  const ln = line && line.some((v) => v != null) ? `<path d="${line.map((v, i) => (i ? "L" : "M") + (P + i * bw + bw / 2).toFixed(1) + " " + y(v).toFixed(1)).join("")}" fill="none" stroke="var(--blue)" stroke-width="2.5"/>` : "";
  const step = Math.ceil(n / (sm ? 5 : 8));
  const xl = labels.map((l, i) => (n - 1 - i) % step ? "" : `<text x="${P + i * bw + bw / 2}" y="${H - 5}" fill="var(--faint)" font-size="${fs}" text-anchor="middle">${l}</text>`).join("");
  const grid = [0, .5, 1].map((f) => `<line x1="${P}" x2="${W}" y1="${y(max / 1.1 * f)}" y2="${y(max / 1.1 * f)}" stroke="var(--line)"/><text x="0" y="${y(max / 1.1 * f) + 4}" fill="var(--faint)" font-size="${fs}">${fmt(max / 1.1 * f)}</text>`).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${grid}${bars}${ln}${xl}</svg>`;
}
const dm = (d) => +d.slice(8) + "/" + +d.slice(5, 7);

// ---------- Targets ----------
const TARGET_DEFS = [
  ["banked_inr", "Banked revenue (month)", "inr", "proj"], ["daily_banked_inr", "Avg banked per day", "inr", "act"],
  ["roas", "ROAS (all banked ÷ spend+GST)", "x", "act"], ["meta_spend_inr", "Meta spend (month)", "inr", "proj"],
  ["orders", "Orders (month)", "n", "proj"], ["aov_inr", "AOV", "inr", "act"], ["capture_rate_pct", "Payment capture", "pct", "act"],
  ["whatsapp_banked_inr", "WhatsApp banked (month)", "inr", "proj"], ["lms_app_banked_inr", "LMS app banked (month)", "inr", "proj"],
  ["lms_start_pct", "Buyers who start learning", "pct", "act"], ["lms_half_pct", "Buyers at 50% progress", "pct", "act"],
  ["lms_rating", "LMS rating", "x", "act"], ["new_courses", "New courses launched", "n", "act"],
];
const fmtT = (v, t) => v == null ? "–" : t === "inr" ? inr(v) : t === "pct" ? Number(v).toFixed(1) + "%" : t === "x" ? x2(v) : n0(v);
let tgMonth = null;
async function viewTargets(el) {
  tgMonth ??= new Date(Date.now() + 19800e3).toISOString().slice(0, 7);
  const d = await sec("targets", { month: tgMonth });
  const rows = TARGET_DEFS.map(([k, label, t, mode]) => {
    const tg = d.targets[k], act = d.actual[k], cmp = mode === "proj" ? d.projected[k] : act;
    const ratio = tg && cmp != null ? cmp / tg : null;
    const pill = ratio == null ? `<span class="chip">no target</span>` : k === "meta_spend_inr"
      ? `<span class="chip ${ratio <= 1.05 ? "ok" : "bad"}">${(ratio * 100).toFixed(0)}% of budget</span>`
      : `<span class="chip ${ratio >= 1 ? "ok" : ratio >= .9 ? "mid" : "bad"}">${(ratio * 100).toFixed(0)}%</span>`;
    const bar = ratio == null ? "" : `<div class="bar sm"><i style="width:${Math.min(100, ratio * 100)}%;background:${k === "meta_spend_inr" ? "var(--blue)" : ratio >= 1 ? "var(--accent)" : ratio >= .9 ? "var(--warn)" : "var(--bad)"}"></i></div>`;
    return `<tr><td class="tl">${label}${bar}</td><td><input class="tin" data-k="${k}" inputmode="decimal" value="${tg ?? ""}" placeholder="set"></td><td class="num" data-l="Actual">${fmtT(act, t)}</td><td class="num" data-l="Month-end">${mode === "proj" ? fmtT(d.projected[k], t) : "–"}</td><td>${pill}</td></tr>`;
  }).join("");
  el.innerHTML = card(`Target scorecard`, `
    <div class="tbar"><input type="month" id="tgM" value="${tgMonth}"><button class="btn sm" id="tgSave">Save targets</button><span id="tgMsg" class="muted"></span></div>
    <div class="scroll"><table class="tt"><tr><th>Metric</th><th>Target</th><th>Actual</th><th>Projected month-end</th><th>Status</th></tr>${rows}</table></div>
    <p class="muted foot">Day ${d.days_done.toFixed(1)} of ${d.days_in_month}. Totals are judged on projected month-end, rates on actual. Spend: ${d.spend_source === "live" ? "live from Meta" : d.spend_source === "synced" ? "last synced Meta spend" : "not connected"}.</p>`);
  $("tgM").onchange = (e) => { tgMonth = e.target.value; showSection("targets"); };
  $("tgSave").onclick = async () => {
    const t = {}; document.querySelectorAll(".tin").forEach((i) => { if (i.value.trim() !== "") t[i.dataset.k] = Number(i.value.replace(/[,₹\s]/g, "")); });
    $("tgMsg").textContent = "Saving…";
    try { await sec("set-targets", { month: tgMonth, targets: t }); showSection("targets"); } catch (e) { $("tgMsg").textContent = "Couldn't save: " + e.message; }
  };
}

// ---------- Meta ----------
const adRows = (list) => list.map((a) => [esc(a.name), inr(a.spend), inr(a.banked), a.orders, roasTag(a.roas), a.cpa ? inr(a.cpa) : "–", a.ctr != null ? a.ctr.toFixed(2) + "%" : "–", a.freq ? a.freq.toFixed(2) : "–"]);
const AD_H = ["Ad", "Spend 7d", "Banked 7d", "Orders", "ROAS", "Cost/order", "CTR", "Freq"];
async function viewMeta(el) {
  const d = await sec("meta");
  if (!d.connected) {
    el.innerHTML = `<div class="err">Live Meta isn't connected yet, so spend per ad, ROAS per ad, CPM, CTR and frequency are missing. Add <b>META_ACCESS_TOKEN</b> under Supabase → Edge Functions → Secrets and this tab fills in by itself. Until then you see banked revenue per ad from Razorpay.</div>`
      + card("Banked by ad · last 7 days", table(["Ad", "Banked 7d", "Orders", "Banked today"], d.ads.map((a) => [esc(a.name), inr(a.banked), a.orders, inr(a.banked_today)])), "from Razorpay ct= tag");
    return;
  }
  const a = d.account_7d;
  el.innerHTML = `<div class="grid">` + card("Meta · last 7 days", kpiGrid([
    ["Spend", inr(a.spend), "+GST " + inr(a.spend * 1.18)], ["ROAS · all banked", roasTag(a.roas_all), inr(a.banked_all) + " banked"],
    ["ROAS · Meta-tagged", roasTag(a.roas_meta), inr(a.banked_meta) + " from Meta clicks"], ["CPM", inr(a.cpm), "CTR " + a.ctr.toFixed(2) + "%"],
    ["Link clicks", n0(a.clicks), "reach " + n0(a.reach)], ["Frequency", x2(a.frequency), "7-day, account"],
    ["Pixel purchases", n0(a.pixel_purchases), "Meta's count"], ["Spend per pixel purchase", a.pixel_purchases ? inr(a.spend / a.pixel_purchases) : "–", "before GST"],
  ]), d.window.since + " → " + d.window.until)
    + card("Best converting ads", `<div class="scroll">${table(AD_H, adRows(d.best))}</div>`, "spend ≥ ₹1,500, by banked ROAS", "c6")
    + card("Losing ads", `<div class="scroll">${table(AD_H, adRows(d.losing))}</div>`, "spend ≥ ₹1,500, ROAS < 0.8", "c6")
    + card("Top spenders", `<div class="scroll">${table(AD_H, adRows(d.top_spend))}</div>`, "last 7 days")
    + card("Campaigns today", table(["Campaign", "Spend", "Clicks", "Pixel purch."], d.campaigns_today.map((c) => [esc(c.name), inr(c.spend), c.clicks, c.pixel])))
    + `</div>`;
}

// ---------- SKUs ----------
let skuSort = "d7";
async function viewSku(el) {
  const d = await sec("sku");
  const list = [...d.skus].filter((s) => s.sku !== "untagged").sort((a, b) => (b[skuSort] ?? -1) - (a[skuSort] ?? -1));
  const selling = list.filter((s) => s.d7_orders > 0);
  const best = [...selling].sort((a, b) => b.d7 - a.d7).slice(0, 5), worst = [...selling].sort((a, b) => a.d7 - b.d7).slice(0, 5);
  const nm = (s) => esc(s.title || s.sku.replace(/-/g, " "));
  const th = (k, l) => `<th class="sortable${skuSort === k ? " on" : ""}" data-s="${k}">${l}</th>`;
  el.innerHTML = `<div class="grid">` + card("SKUs", kpiGrid([
    ["Live courses", d.live_courses, "published in LMS"], ["SKUs selling (7d)", selling.length, "with at least one order"],
    ["Best SKU (7d)", best[0] ? `<span style="font-size:16px">${esc(best[0].sku.replace(/-/g, " "))}</span>` : "–", best[0] ? inr(best[0].d7) : ""], ["No sales this month / 7d", d.no_sales_7d_or_mtd.length, "live courses"],
  ])) + card("Best performing · 7 days", table(["SKU", "Banked", "Orders", "ROAS"], best.map((s) => [nm(s), inr(s.d7), s.d7_orders, roasTag(s.roas_7d)])), "", "c6")
    + card("Least performing · 7 days", table(["SKU", "Banked", "Orders", "ROAS"], worst.map((s) => [nm(s), inr(s.d7), s.d7_orders, roasTag(s.roas_7d)])), "with at least one sale", "c6")
    + card("All SKUs", `<div class="scroll"><table><tr><th>SKU</th>${th("today", "Today")}${th("d7", "7 days")}${th("mtd", "Month")}${th("spend_7d", "Spend 7d")}${th("roas_7d", "ROAS 7d")}${th("failed_7d", "Failed 7d")}</tr>${list.map((s) => `<tr><td>${nm(s)}</td><td class="num">${inr(s.today)} <small>${s.today_orders}</small></td><td class="num">${inr(s.d7)} <small>${s.d7_orders}</small></td><td class="num">${inr(s.mtd)} <small>${s.mtd_orders}</small></td><td class="num">${s.spend_7d == null ? "–" : inr(s.spend_7d)}</td><td class="num">${roasTag(s.roas_7d)}</td><td class="num">${s.failed_7d}</td></tr>`).join("")}</table></div>`, d.spend_mapped ? "spend mapped from ad names" : "ROAS needs the Meta token")
    + card("Live courses with no sales", table(["Course", "Language"], d.no_sales_7d_or_mtd.map((c) => [esc(c.title), esc(c.language || "")])), "this month or last 7 days")
    + `</div>`;
  el.querySelectorAll(".sortable").forEach((t) => (t.onclick = () => { skuSort = t.dataset.s; viewSku(el); }));
}
