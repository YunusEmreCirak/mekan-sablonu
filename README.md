# Mekân şablonu

Restoran ve kafeler için hazırlanmış, iki örnek kimlikle sunulan web sitesi şablonu.

- **Restoran — Lodos:** https://yunusemrecirak.github.io/mekan-sablonu/
- **Kafe — Pervaz:** https://yunusemrecirak.github.io/mekan-sablonu/kafe/
- **QR masa modu:** adresin sonuna `?masa=7` eklenince sayfa doğrudan menüyle açılır, masa numarası ve Wi-Fi şifresi alt çubukta görünür.

Lodos ve Pervaz kurgusal işletmelerdir; fiyatlar, saatler ve iletişim bilgileri örnektir. Sayfalar arama motorlarına kapalıdır (`noindex`).

## Neler var

- Dijital menü: kategori çubuğu, TR/EN dil seçimi, beslenme ve alerjen filtreleri, ürün ayrıntı penceresi
- Her üründe içerik, kalori ve 14 alerjenin numaralı kodları (Türk Gıda Kodeksi sırası)
- Servis, kuver ve masa ücreti satırı yok; fiyatlar KDV dahil
- Canlı "açık / kapalı" durumu ve bugünü işaretleyen saat tablosu (İstanbul saatine göre)
- Rezervasyon talep formu: uygun günler ve saatler çalışma saatlerinden hesaplanır, sonuç işletmeye gidecek mesaj olarak hazırlanır
- Pervaz'a özel: canlı fırın saatleri, kahve defteri, saate göre açısı değişen pencere ışığı, bütün kek siparişi
- Lodos'a özel: yatay kayan imza tabaklar, saat saat akşam akışı, menüde imleci takip eden fotoğraf önizlemesi
- Açılış animasyonu (oturum başına bir kez), yumuşak kaydırma, şablonlar arası sayfa geçişi
- Hareket azaltma tercihine, klavyeye ve ekran okuyuculara uyum

## Yapı

```
index.html, kafe/index.html   üretilen sayfalar (elle düzenlemeyin)
src/content.py                menü, saatler, adres, rezervasyon kuralları
src/templates/*.html          sayfa iskeletleri
src/build.py                  sayfaları üretir
assets/css/main.css           tüm stil; marka farkları html[data-brand] değişkenlerinde
assets/js/main.js             etkileşimler
assets/img/                   görseller (her biri 3 boyutta WebP)
```

## Menüyü veya içeriği güncellemek

1. `src/content.py` içinde ürünü, fiyatı ya da saati değiştirin.
2. Sayfaları yeniden üretin:

   ```
   python src/build.py
   ```

3. Değişikliği gönderin; GitHub Pages bir dakika içinde yayına alır.

Yeni görsel eklerken `assets/img/<marka>/<ad>-480.webp`, `-960.webp`, `-1500.webp` boyutlarını üretin ve `src/images.json` içine ölçüleriyle ekleyin.

Kaynaklar ve lisanslar: [CREDITS.md](CREDITS.md)
