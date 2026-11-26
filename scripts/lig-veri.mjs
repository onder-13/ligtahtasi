// Lig Tahtası — Vikipedi'deki Süper Lig sayfalarını okuyup data.json'ı üreten çözümleyici.
// Saf modül: ağ veya dosya erişimi yok; Node'da da tarayıcıda da çalışır.
//
// Kaynaklar (tr.wikipedia.org, içerik CC BY-SA 4.0):
//   tablo   : "Şablon:<sezon> Süper Lig puan durumu"   → tüm skorlar, haftalara göre
//   maclar  : "Şablon:<sezon> Süper Lig maçları/maçlar" → tarih, saat, gol atanlar
//   anaSayfa: "<sezon> Süper Lig"                       → gol krallığı tablosu

export const SEASON = "2026-27";
export const PAGES = {
  tablo: `Şablon:${SEASON} Süper Lig puan durumu`,
  maclar: `Şablon:${SEASON} Süper Lig maçları/maçlar`,
  anaSayfa: `${SEASON} Süper Lig`,
};

// Vikipedi takım kodu → sitedeki takım kimliği
export const CODE = {
  GAL: "gs", TRA: "ts", BJK: "bjk", AME: "amed", KAS: "kas", FNB: "fb", "İBF": "ibfk", KOC: "koc", "GÖZ": "goz",
  "ÇYR": "riz", "ÇFK": "cor", GEN: "gen", EFK: "erz", ALA: "ala", KON: "kon", GFK: "gaz", SAM: "sam", "EYÜ": "eyup",
};
// Takım adı (link metni) → kimlik; aksansız küçük harfle anahtar kelime eşleşmesi
const NAME_KEYS = [
  ["galatasaray", "gs"], ["trabzon", "ts"], ["besiktas", "bjk"], ["amed", "amed"], ["kasimpasa", "kas"],
  ["fenerbahce", "fb"], ["basaksehir", "ibfk"], ["kocaeli", "koc"], ["goztepe", "goz"], ["rize", "riz"],
  ["corum", "cor"], ["genclerbirligi", "gen"], ["erzurum", "erz"], ["alanya", "ala"], ["konya", "kon"],
  ["gaziantep", "gaz"], ["samsun", "sam"], ["eyup", "eyup"],
];
const DERBY = new Set(["gs", "fb", "bjk", "ts"]);
const MON_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const MON_LONG = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const WEEKDAY = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

export function norm(s) {
  return String(s).toLocaleLowerCase("tr")
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
export function teamIdFromName(name) {
  const n = norm(name);
  for (const [k, id] of NAME_KEYS) if (n.includes(k)) return id;
  return null;
}
// [[Hedef|Metin]] → Metin, [[Hedef]] → Hedef (parantezli açıklama atılır)
function linkText(s) {
  const m = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/.exec(s);
  if (!m) return null;
  return (m[2] || m[1].replace(/\s*\([^)]*\)\s*$/, "")).trim();
}
const stripComments = s => s.replace(/<!--[\s\S]*?-->/g, "");

/* ---------- 1) Skorlar: puan durumu şablonu ---------- */
export function parseScores(raw) {
  const out = [];
  let week = null;
  for (const line of raw.split("\n")) {
    const wk = /<!--\s*(\d+)\.\s*Hafta\s*-->/.exec(line);
    if (wk) { week = +wk[1]; continue; }
    if (!line.includes("match_") || week === null) continue;
    // Link ve şablonları sadeleştir: [[A|1-2]] → 1-2, {{kısaltma|13.|..}} → ~
    let s = line.replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, "$1").replace(/\[\[([^\]]*)\]\]/g, "$1");
    while (/\{\{[^{}]*\}\}/.test(s)) s = s.replace(/\{\{[^{}]*\}\}/g, "~");
    for (const part of s.split("|match_").slice(1)) {
      const m = /^([^_=\s]+)_([^_=\s]+)\s*=\s*([^|]*)/u.exec(part);
      if (!m) continue;
      const h = CODE[m[1]], a = CODE[m[2]];
      if (!h || !a) continue;
      const sc = /^(\d+)\s*[-–]\s*(\d+)$/.exec(m[3].trim());
      out.push({ week, h, a, played: !!sc, hs: sc ? +sc[1] : null, as: sc ? +sc[2] : null });
    }
  }
  return out;
}

/* ---------- 2) Ayrıntılar: maç kutuları ---------- */
function field(body, name) {
  const re = new RegExp(`\\n\\|${name}[ \\t]*=([\\s\\S]*?)(?=\\n\\|[^\\s=|]+[ \\t]*=|$)`, "u");
  const m = re.exec(body);
  return m ? m[1].trim() : "";
}
function parseGoals(text, side) {
  const goals = [];
  for (const line of text.split("\n")) {
    const tpls = [...line.matchAll(/\{\{\s*gol\s*\|([^}]*)\}\}/giu)];
    if (!tpls.length) continue;
    const name = linkText(line) || line.replace(/\{\{[^}]*\}\}/g, "").replace(/^[*\s]+/, "").trim();
    for (const t of tpls) {
      const toks = t[1].split("|").map(x => x.trim());
      let last = null;
      for (const tok of toks) {
        if (/^\d+(\+\d+)?$/.test(tok)) { last = [side, name, tok + "'"]; goals.push(last); }
        else if (last && /^(p|pen|penaltı)$/i.test(tok)) last[2] += " (P)";
        else if (last && /^(kk|k\.k\.|og|o\.g\.)$/i.test(tok)) last[2] += " (KK)";
      }
    }
  }
  return goals;
}
export function parseDetails(raw) {
  const map = new Map();
  const re = /\|\s*([^\s|=]+?)-([^\s|=]+?)\s*=\s*\{\{Kapanabilir futbol maçı kutusu([\s\S]*?)\n\}\}/gu;
  for (const m of raw.matchAll(re)) {
    const h = CODE[m[1]], a = CODE[m[2]];
    if (!h || !a) continue;
    const body = "\n" + m[3];
    const d = /Başlangıç tarihi\|(\d{4})\|(\d{1,2})\|(\d{1,2})/u.exec(field(body, "tarih"));
    const t = /(\d{1,2})[.:](\d{2})/.exec(field(body, "zaman"));
    const sc = /(\d+)\s*[-–]\s*(\d+)/.exec(field(body, "sonuç"));
    map.set(`${h}-${a}`, {
      date: d ? `${d[1]}-${d[2].padStart(2, "0")}-${d[3].padStart(2, "0")}` : null,
      time: t ? `${t[1].padStart(2, "0")}:${t[2]}` : null,
      week: +(/\d+/.exec(field(body, "tur")) || [0])[0] || null,
      score: sc ? [+sc[1], +sc[2]] : null,
      goals: [...parseGoals(field(body, "goller1"), "h"), ...parseGoals(field(body, "goller2"), "a")],
    });
  }
  return map;
}

/* ---------- 3) Gol krallığı: ana sayfa tablosu ---------- */
export function parseScorers(raw, limit = 10) {
  const start = raw.indexOf("=== Gol krallığı ===");
  if (start < 0) return null;
  let sec = stripComments(raw.slice(start));
  const end = sec.indexOf("\n|}");
  if (end > 0) sec = sec.slice(0, end);
  const rows = [];
  for (const row of sec.split(/\n\|-/)) {
    if (!/bayraksimge/i.test(row)) continue;
    const links = [...row.matchAll(/\[\[[^\]]+\]\]/g)];
    if (links.length < 2) continue;
    const player = linkText(links[0][0]);
    const team = teamIdFromName(linkText(links[1][0]));
    const after = row.slice(links[1].index + links[1][0].length);
    const apps = /align=center\|\s*(\d+)/.exec(after);
    const goals = /'''(\d+)'''/.exec(after);
    if (!player || !team || !goals) continue;
    rows.push([player, team, apps ? +apps[1] : 0, +goals[1]]);
  }
  rows.sort((x, y) => y[3] - x[3] || x[2] - y[2]);
  return rows.slice(0, limit);
}

/* ---------- yardımcılar ---------- */
function dateParts(iso) { const [y, m, d] = iso.slice(0, 10).split("-").map(Number); return { y, m, d }; }
export function shortLabel(iso) { const { m, d } = dateParts(iso); return `${d} ${MON_SHORT[m - 1]}`; }
export function dayLabel(iso) {
  const { y, m, d } = dateParts(iso);
  const wd = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  return `${d} ${MON_LONG[m - 1]} ${WEEKDAY[wd]}`;
}
export function nowIstanbulISO(now = new Date()) {
  const t = new Date(now.getTime() + 3 * 3600e3).toISOString().slice(0, 19);
  return `${t}+03:00`;
}

function computeTable(played, teamIds) {
  const T = Object.fromEntries(teamIds.map(id => [id, { id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }]));
  for (const m of played) {
    const h = T[m.h], a = T[m.a];
    h.p++; a.p++; h.gf += m.hs; h.ga += m.as; a.gf += m.as; a.ga += m.hs;
    if (m.hs > m.as) { h.w++; a.l++; h.pts += 3; }
    else if (m.hs < m.as) { a.w++; h.l++; a.pts += 3; }
    else { h.d++; a.d++; h.pts++; a.pts++; }
  }
  return Object.values(T)
    .sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || x.id.localeCompare(y.id))
    .map(r => [r.id, r.p, r.w, r.d, r.l, r.gf, r.ga, r.pts]);
}

function computeFacts(results, teams) {
  if (!results.length) return null;
  const nm = id => teams[id]?.n || id;
  const lbl = r => r[1] ? ` (${r[1]})` : "";
  const byMargin = [...results].sort((a, b) => Math.abs(b[4] - b[5]) - Math.abs(a[4] - a[5]) || (b[4] + b[5]) - (a[4] + a[5]) || a[0] - b[0]);
  const byTotal = [...results].sort((a, b) => (b[4] + b[5]) - (a[4] + a[5]) || a[0] - b[0]);
  const big = byMargin[0], high = byTotal[0];
  const series = {};
  for (const r of [...results].sort((a, b) => a[0] - b[0])) {
    for (const [id, f, g] of [[r[2], r[4], r[5]], [r[3], r[5], r[4]]]) (series[id] ||= []).push(f > g ? "W" : f < g ? "L" : "D");
  }
  const longest = test => {
    let best = 0, who = [];
    for (const [id, s] of Object.entries(series)) {
      let cur = 0, mx = 0;
      for (const x of s) { cur = test(x) ? cur + 1 : 0; mx = Math.max(mx, cur); }
      if (mx > best) { best = mx; who = [id]; } else if (mx === best && mx > 0) who.push(id);
    }
    return best ? `${who.map(nm).join(", ")} · ${best} maç` : "—";
  };
  return [
    ["En farklı skor", `${nm(big[2])} ${big[4]}–${big[5]} ${nm(big[3])}${lbl(big)}`],
    ["En gollü maç", `${nm(high[2])} ${high[4]}–${high[5]} ${nm(high[3])}${lbl(high)}`],
    ["En uzun galibiyet serisi", longest(x => x === "W")],
    ["En uzun yenilmezlik serisi", longest(x => x !== "L")],
    ["En uzun mağlubiyet serisi", longest(x => x === "L")],
  ];
}

/* ---------- ana işlev ---------- */
// prev: mevcut data.json nesnesi; raw: {tablo, maclar, anaSayfa} ham vikimetinleri
// Dönüş: {data, changed, warnings}
export function build(prev, raw, now = new Date()) {
  const warnings = [];
  const scores = parseScores(raw.tablo);
  if (scores.length < 250) throw new Error(`Puan durumu şablonunda beklenenden az maç bulundu (${scores.length}). Sayfa düzeni değişmiş olabilir; veri güncellenmedi.`);
  const details = raw.maclar ? parseDetails(raw.maclar) : new Map();
  if (details.size < 250) warnings.push(`Maç ayrıntıları sayfasında az maç bulundu (${details.size}); tarih/gol bilgisi eksik kalabilir.`);
  const teamIds = Object.keys(prev.teams);

  const played = scores.filter(m => m.played).sort((a, b) => a.week - b.week);
  const results = played.map(m => {
    const d = details.get(`${m.h}-${m.a}`);
    const r = [m.week, d?.date ? shortLabel(d.date) : "", m.h, m.a, m.hs, m.as];
    if (d?.goals?.length) {
      const gh = d.goals.filter(g => g[0] === "h").length, ga = d.goals.filter(g => g[0] === "a").length;
      if (gh === m.hs && ga === m.as) r.push(d.goals); // sadece skorla tutarlıysa göster
    }
    r.sortKey = (d?.date || "9") + (d?.time || "");
    return r;
  }).sort((x, y) => x[0] - y[0] || x.sortKey.localeCompare(y.sortKey)).map(r => { delete r.sortKey; return r; });

  // Sıradaki hafta: tarihi bugünden 1 gün öncesinden yeni (ya da tarihsiz) oynanmamış maçı olan en küçük hafta
  const todayISO = nowIstanbulISO(now).slice(0, 10);
  const yesterday = new Date(Date.parse(todayISO + "T00:00:00Z") - 864e5).toISOString().slice(0, 10);
  const pending = scores.filter(m => !m.played).map(m => ({ ...m, det: details.get(`${m.h}-${m.a}`) }));
  const upcoming = pending.filter(m => !m.det?.date || m.det.date >= yesterday);
  const nextWeek = upcoming.length ? Math.min(...upcoming.map(m => m.week)) : null;
  const maxPlayed = played.length ? Math.max(...played.map(m => m.week)) : 0;
  const weekDone = nextWeek ? Math.min(maxPlayed, nextWeek - 1) : maxPlayed;

  const prevFx = new Map((prev.fixtures || []).map(f => [`${f[2]}-${f[3]}`, f]));
  const fixtures = nextWeek ? upcoming.filter(m => m.week === nextWeek).map(m => {
    const d = m.det, old = prevFx.get(`${m.h}-${m.a}`);
    if (d?.date && d.time) return [dayLabel(d.date), `${d.date}T${d.time}:00+03:00`, m.h, m.a];
    if (old && /T\d\d:\d\d/.test(old[1])) return [old[0], old[1], m.h, m.a]; // Vikipedi'de saat yoksa eldeki saati koru
    if (d?.date) return [dayLabel(d.date), d.date, m.h, m.a];
    return ["Tarih belli değil", "", m.h, m.a];
  }).sort((x, y) => (x[1] || "9").localeCompare(y[1] || "9")) : [];

  const derbyIdx = fixtures.findIndex(f => DERBY.has(f[2]) && DERBY.has(f[3]));
  const scorers = raw.anaSayfa ? parseScorers(raw.anaSayfa) : null;
  if (!scorers || !scorers.length) warnings.push("Gol krallığı okunamadı; önceki liste korundu.");

  // Ertelenmiş (tarihi geçmiş, oynanmamış) maçlar için otomatik not; elle yazılan notes/notesEn'e dokunulmaz
  const autoNotes = {}, autoNotesEn = {};
  const postponed = pending.filter(m => m.det?.date && m.det.date < yesterday);
  for (const w of [...new Set(postponed.map(m => m.week))]) {
    const names = postponed.filter(m => m.week === w).map(m => `${prev.teams[m.h].n} – ${prev.teams[m.a].n}`).join(", ");
    autoNotes[w] = `${names}: sonuç henüz yok (maç ertelenmiş olabilir).`;
    autoNotesEn[w] = `${names}: no result yet (the match may have been postponed).`;
  }

  const data = {
    ...prev,
    weekDone,
    table: computeTable(played, teamIds),
    results,
    fixturesWeek: nextWeek || prev.fixturesWeek,
    fixtures,
    featured: derbyIdx >= 0 ? derbyIdx : null,
    featuredLabel: derbyIdx >= 0 ? "Haftanın derbisi" : null,
    scorers: scorers && scorers.length ? scorers : prev.scorers,
    facts: computeFacts(results, prev.teams) || prev.facts,
    autoNotes, autoNotesEn,
    sources: [
      ["Vikipedi (CC BY-SA 4.0)", "https://tr.wikipedia.org/wiki/" + encodeURIComponent(PAGES.anaSayfa.replace(/ /g, "_"))],
      ["Vikipedi maç listesi", "https://tr.wikipedia.org/wiki/" + encodeURIComponent(`${SEASON} Süper Lig maçları`.replace(/ /g, "_"))],
    ],
  };
  delete data.factsEn;
  const strip = o => JSON.stringify({ ...o, updated: null });
  const changed = strip(data) !== strip(prev);
  data.updated = changed ? nowIstanbulISO(now) : prev.updated;
  return { data, changed, warnings };
}
