# Roadmap — Pi Mainnet hazırlık

## Aşama 0 — Audit (tamamlandı)
- [x] Frontend/backend/DB/security audit raporu

## P0 — Mainnet kritik
- [ ] PI_LOGIN_SECRET oluştur, Pi girişini uçtan uca çalıştır
- [ ] Ağ seçimini sunucuya taşı (PI_NETWORK), istemci Testnet/Mainnet seçicisini kaldır
- [ ] E-posta/şifre girişini birincil auth olmaktan çıkar
- [ ] Sipariş/ödeme tekilleştirme (çift sipariş, çift payment, çift release engeli)
- [ ] Fonlanmamış escrow release engeli + admin aksiyonlarının audit log'u
- [ ] Payment/Order state machine netleştirme

## P1 — Marketplace
- [ ] verified filtresi sorguya taşı + sayfalama
- [ ] Moderasyon kapısı (pending → approved) gerçekten uygulansın
- [ ] Reddedilen ilanın yeniden onayı durumu geri getirsin
- [ ] Buy Now / Reserve ayrımı, kullanılmayan demo veriyi kaldır

## P2 — Seller / order / admin
- [ ] Satıcı menüsünden `paid` kaldır, hataları kullanıcıya göster
- [ ] escrow released → listing sold + order completed senkronu
- [ ] Reviews tekillik + satın alma kanıtı

## P3 — UX / dil / performans
- [ ] Çeviri anahtarları + 12 dil sözlüğü, RTL kontrolü
- [ ] Boş/hata durumları, .env.example

## Ek istekler (2. mesaj)
- [ ] Domain/marka uyumu raporu ("pi" ile başlayan domain riski)
- [ ] GCV/fiat yalnızca bilgilendirici; işlem para birimi Pi
- [ ] A2U/escrow güvenlik denetimi (çift release, seed sunucuda)
- [ ] Gereksiz kişisel veri toplama denetimi
- [ ] Harici yönlendirme olmadan tüm akışların uygulama içinde tamamlanması
- [ ] Final uyum tablosu (PASS/WARNING/FAIL)

## Bloke (kullanıcıya bağlı)
- [ ] Pi Developer Portal ayarları ve gerçek Pi Browser cihaz testi
