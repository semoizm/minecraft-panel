# Semoizm - Minecraft AFK Bot Paneli

Açık kaynaklı, web üzerinden kontrol edilebilen **Mineflayer** tabanlı Minecraft AFK bot paneli.

## Özellikler
- Web arayüzü üzerinden Minecraft sunucusuna bağlanma ve çıkış yapma (IP, Port, Bot Adı, Sürüm desteği)
- Gerçek zamanlı sunucu sohbetini görüntüleme ve sohbete mesaj/komut gönderme
- Belirlenen aralıklarla otomatik mesaj gönderme (Oto Başlat / Oto Durdur)
- `render.yaml` ile Render üzerinde hızlı kurulum desteği

## Kurulum (Render)

1. Bu deponun GitHub bağlantısını kopyalayın.
2. [Render](https://render.com) hesabınıza giriş yapın ve **New -> Blueprint** (veya **New -> Web Service**) adımını seçin.
3. GitHub depo bağlantısını yapıştırıp servisi oluşturun ve kurulumun (`npm install` & `npm start`) tamamlanmasını bekleyin.
4. Kurulum bittiğinde Render'ın verdiği `https://...onrender.com` adresini kopyalayın.

## 7/24 Aktif Tutma (Uptime)

Render ücretsiz planındaki servislerin uykuya geçip bot bağlantısının düşmemesi için:
1. Aldığınız Render URL'sini **Dark Studio Uptime** sistemine ekleyin.
2. Uptime kaydının aktif ve düzenli istek atar durumda olduğundan emin olun.

## Notlar
- Bazı Minecraft sunucuları paylaşımlı bulut/datacenter IP adreslerini engelleyebilir; bu durumda bağlantı hatası alabilirsiniz.
- Sürüm kutusunu boş bırakırsanız sistem sürümü otomatik algılamaya çalışır.

---

by [Dark Studio](https://bit.ly/darkkod)