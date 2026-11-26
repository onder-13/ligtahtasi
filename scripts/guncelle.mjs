// Lig Tahtası veri güncelleyici (Node 20+, ek paket gerekmez).
// Vikipedi'den Süper Lig sayfalarını indirir, data.json'ı yeniden üretir; değişiklik yoksa dosyaya dokunmaz.
// Çalıştır:  node scripts/guncelle.mjs
import { readFile, writeFile } from "node:fs/promises";
import { build, PAGES } from "./lig-veri.mjs";

const DATA = new URL("../data.json", import.meta.url);
const repo = process.env.GITHUB_REPOSITORY ? ` (+https://github.com/${process.env.GITHUB_REPOSITORY})` : "";
const UA = `LigTahtasi/1.0 fan-site data reader${repo}`;

async function raw(title) {
  const url = "https://tr.wikipedia.org/w/index.php?action=raw&title=" + encodeURIComponent(title);
  for (let i = 1; i <= 3; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      if (r.ok) return await r.text();
      console.warn(`${title}: HTTP ${r.status} (deneme ${i})`);
    } catch (e) { console.warn(`${title}: ${e.message} (deneme ${i})`); }
    await new Promise(res => setTimeout(res, 3000 * i));
  }
  return null;
}

const prev = JSON.parse(await readFile(DATA, "utf8"));
const [tablo, maclar, anaSayfa] = await Promise.all([raw(PAGES.tablo), raw(PAGES.maclar), raw(PAGES.anaSayfa)]);
if (!tablo) { console.error("Puan durumu şablonu indirilemedi; veri değiştirilmedi."); process.exit(1); }

const { data, changed, warnings } = build(prev, { tablo, maclar, anaSayfa });
for (const w of warnings) console.warn("Uyarı: " + w);
if (!changed) { console.log("Değişiklik yok."); process.exit(0); }
await writeFile(DATA, JSON.stringify(data, null, 1) + "\n", "utf8");
console.log(`data.json güncellendi: ${data.results.length} sonuç, ${data.weekDone}. hafta tamam, sıradaki hafta ${data.fixturesWeek} (${data.fixtures.length} maç).`);
