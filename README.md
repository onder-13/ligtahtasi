# Lig Tahtası

Süper Lig 2026–27 için puan durumu, fikstür, sonuçlar, gol krallığı ve takım bilgileri gösteren tek sayfalık site. Türkçe/İngilizce.

Veriler **her 30 dakikada bir Vikipedi'den** (tr.wikipedia.org, CC BY-SA 4.0) otomatik alınır. Bu iş GitHub'ın kendi sunucularında çalışır; senin bilgisayarının ya da Claude'un açık olması gerekmez. Canlı skor yoktur: bir maçın sonucu, Vikipedi'ye eklendikten sonraki ilk çalıştırmada siteye gelir.

## Dosyalar

| Dosya | Ne işe yarar |
|---|---|
| `index.html` | Sitenin kendisi. |
| `data.json` | Tüm veriler. Sayfa her şeyi buradan okur; GitHub'daki program bunu günceller. |
| `scripts/lig-veri.mjs` | Vikipedi metnini okuyup `data.json`'ı üreten çözümleyici. |
| `scripts/guncelle.mjs` | Vikipedi'den sayfaları indirip çözümleyiciyi çalıştıran başlatıcı. |
| `.github/workflows/guncelle.yml` | GitHub'a "bunu 30 dakikada bir çalıştır" diyen ayar. |
| `.nojekyll` | GitHub Pages'in dosyaları olduğu gibi yayınlaması için boş işaret dosyası. |
| `lig-tahtasi.html` | Claude'da yayınlanan sürümün kaynağı (GitHub için gerekmez). |
| `sunucu.ps1` | Kendi bilgisayarında denemek için küçük yerel sunucu (GitHub için gerekmez). |

## GitHub'da yayına alma (bir kez yapılır)

### 1. Depo (repository) oluştur
1. github.com'a gir, sağ üstteki **+** → **New repository**.
2. **Repository name:** `ligtahtasi`
3. **Public** seçili olsun (ücretsiz yayın için gerekli).
4. Başka hiçbir kutuyu işaretleme, **Create repository**'ye bas.

### 2. Dosyaları yükle
1. Açılan sayfada **uploading an existing file** bağlantısına tıkla.
2. Masaüstündeki `lig tahtasi` klasörünü aç ve şunları seçip tarayıcıdaki kutuya **sürükle**:
   `index.html`, `data.json`, `README.md`, `.nojekyll`, `scripts` klasörü, `.github` klasörü.
3. Altta **Commit changes**'e bas.
4. Kontrol: depo sayfasında `.github/workflows/guncelle.yml` ve `scripts/` görünmeli. `.github` klasörü yüklenmediyse 2. adımı sadece o klasör için tekrarla.

### 3. Siteyi aç (GitHub Pages)
1. Depoda **Settings** → soldan **Pages**.
2. **Source:** *Deploy from a branch*. **Branch:** `main`, klasör `/ (root)` → **Save**.
3. 1–2 dakika sonra sayfanın üstünde adresin çıkar: `https://KULLANICIADIN.github.io/ligtahtasi/`

### 4. Otomatik güncellemeyi başlat
1. Depoda **Actions** sekmesine gir. "Workflows aren't being run…" gibi bir uyarı varsa **I understand… enable them**'e bas.
2. Soldan **Verileri güncelle** → sağda **Run workflow** → **Run workflow**.
3. Bir dakika içinde yeşil tik görmelisin. Bundan sonra kendiliğinden her 30 dakikada bir çalışır.
4. Kırmızı çarpı görürsen üzerine tıkla; hata mesajını Claude'a göster.

> Program `data.json`'ı kaydedemiyorsa: **Settings → Actions → General → Workflow permissions → Read and write permissions → Save**.

## Kendi alan adını bağlamak (isteğe bağlı)

`ligtahtasi.com` gibi bir alan adı aldıysan: **Settings → Pages → Custom domain** kutusuna yaz ve kaydet. GitHub sana alan adı firmanın panelinde hangi DNS kayıtlarını girmen gerektiğini gösterir. HTTPS sertifikası ücretsiz ve otomatik gelir.

## Bilgisayarında denemek

Sayfa `data.json`'ı okuduğu için dosyaya çift tıklayınca veriler yüklenmez. VS Code'da **Live Server** eklentisiyle `index.html` → **Open with Live Server**, ya da:

```powershell
powershell -ExecutionPolicy Bypass -File .\sunucu.ps1
```

ve tarayıcıda `http://localhost:8765`.

## Bilinen sınırlar

- **Canlı değil:** Skorlar, Vikipedi'ye eklendikten sonra gelir. Genelde maçtan kısa süre sonra olur ama bazen saatler sürebilir.
- **Gecikme:** GitHub'ın zamanlayıcısı yoğun saatlerde birkaç dakika gecikebilir.
- **Vikipedi düzeni değişirse** program güvenli tarafta kalır: beklenenden az maç okursa `data.json`'a dokunmaz ve Actions'ta kırmızı çarpı görünür.
- **Elle tutulan bilgiler:** Teknik direktör, stat ve kapasite `data.json` içindeki `teams` bölümünde durur; program bunları değiştirmez.
- **Sezon değişince** (`2027-28`), `scripts/lig-veri.mjs` dosyasının başındaki `SEASON` değeri güncellenmeli.
- GitHub, 60 gün boyunca hiç değişiklik olmayan depolarda zamanlayıcıyı durdurabilir. Sezon içinde program düzenli kayıt yaptığı için sorun olmaz; yaz arasından sonra Actions sekmesine bir göz at.
