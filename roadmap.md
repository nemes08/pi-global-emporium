# Roadmap — Pi Mainnet hazırlık

## Aşama 0 — Audit (tamamlandı)
- [x] Frontend/backend/DB/security audit raporu

## P0 — Mainnet kritik
- [x] PI_LOGIN_SECRET oluştur, Pi girişini uçtan uca çalıştır
- [x] Ağ seçimini sunucuya taşı (PI_NETWORK), istemci Testnet/Mainnet seçicisini kaldır
- [x] E-posta/şifre girişini kaldır — tek giriş yolu Pi Authentication
- [x] Sipariş/ödeme tekilleştirme (çift sipariş, çift payment, çift release engeli)
- [x] Fonlanmamış escrow release engeli + admin aksiyonlarının audit log'u
- [x] Payment/Order state machine netleştirme (satıcı geçişleri kısıtlı)

## P1 — Marketplace
- [x] verified filtresi sorguya taşındı + sayfalama
- [x] Moderasyon kapısı (pending → approved) uygulanıyor
- [x] Reddedilen ilanın yeniden onayı durumu geri getiriyor
- [x] Tek "Buy with Pi" akışı, kullanılmayan demo veri kaldırıldı

## P2 — Seller / order / admin
- [x] Satıcı menüsünden `paid` kaldırıldı, hatalar kullanıcıya gösteriliyor
- [x] escrow released → listing sold + order completed senkronu (DB trigger)
- [x] Reviews tekillik + satın alma kanıtı (DB trigger)

## P3 — UX / dil / performans
- [ ] Çeviri anahtarları + 12 dil sözlüğü tamamlanması, RTL gözden geçirme
- [x] Boş/hata durumları, .env.example

## Ek istekler (2. mesaj)
- [x] Domain/marka uyumu raporu ("pi" ile başlayan domain riski) — kullanıcı aksiyonu gerekli
- [x] GCV/fiat yalnızca bilgilendirici; işlem para birimi Pi
- [x] A2U/escrow güvenlik denetimi (çift release engeli, seed yalnızca sunucuda)
- [x] Gereksiz kişisel veri toplama denetimi (Pi girişinde e-posta toplanmıyor)
- [x] Harici yönlendirme olmadan tüm akışların uygulama içinde tamamlanması

## Bloke (kullanıcıya bağlı)
- [ ] Yeni production domain ("pi" ile başlamayan) bağlanması
- [ ] Pi Developer Portal ayarları ve gerçek Pi Browser cihaz testi
- [ ] 12 dil için profesyonel çeviri metinleri
