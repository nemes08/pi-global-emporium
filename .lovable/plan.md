# Pi Global Emporium — Mainnet Readiness Audit & Fix Plan

Mevcut kod tabanı korunur. Tasarım, marketplace mantığı, Supabase şeması ve çalışan route'lar silinmez.

## A. Mevcut mimari (çalışıyor)

- TanStack Start (React + TS), Tailwind luxury tema, 13 dil + RTL, GCV/USD/EUR/TRY fiyat motoru (USD taban).
- Supabase: profiles, listings (+media, contacts), favorites, conversations/messages, notifications, orders, offers, escrows (+events), disputes, reviews, verification_requests, reports, user_roles, pi_payouts, activity_logs. RLS ve tetikleyiciler kurulu; fiyat/durum kurcalaması DB tetikleyicileriyle engelliyor.
- Pi entegrasyonu: Pi SDK yükleyici, `/v2/me` ile sunucu tarafı kimlik doğrulama, ödeme approve/complete + incomplete-payment kurtarma, gerçek A2U zincir ödemesi (release/refund), admin payout paneli.
- Admin konsolu, escrow ekranı, seller doğrulama, AI arama, legal sayfalar, validation-key.txt.

## B. Kritik bulgular

**P0 — Mainnet / güvenlik / auth / payment**
1. Pi ile giriş çalışmıyor: sunucu `PI_LOGIN_SECRET` bekliyor ama bu secret projede tanımlı değil → her Pi girişi hata veriyor.
2. Ağ karışıklığı: sunucu `mainnet`, ancak Pi cüzdan kartı varsayılan olarak Testnet/Sandbox seçili ve kullanıcıya ağ seçimi sunuluyor. Ağ sunucu tarafından belirlenmeli, kullanıcı seçmemeli.
3. E-posta/şifre girişi hâlâ birincil auth olarak açık (kayıt, şifre sıfırlama). Mainnet kuralına aykırı; Pi Authentication tek giriş yolu olmalı.
4. Sipariş oluşturma ile ödeme arasında tekilleştirme yok: aynı ilan için aynı alıcı birden fazla bekleyen sipariş/escrow açabiliyor.
5. Admin, hiç fonlanmamış bir escrow'u "released" yapabiliyor — denetim izini bozar.

**P1 — Temel marketplace**
6. `marketplace.ts`: "verified" filtresi `limit`'ten sonra istemcide uygulanıyor → eksik/boş sonuçlar; marketplace'te sayfalama yok.
7. Moderasyon gerçek bir kapı değil: ilanlar `approved` doğar, sorgular `moderation_status` filtrelemez; admin "bekleyen" sayısı hep 0.
8. Reddedilen ilan yeniden onaylanınca `archived` kalıyor, bir daha görünmüyor.
9. "Buy Now" ve "Reserve with Pi" aynı işi yapıyor — ayrım yok.
10. `catalog.ts` içinde kullanılmayan statik demo ilan verisi duruyor.

**P2 — Seller / order / admin**
11. Satıcı durum menüsünde `paid` seçeneği var; DB reddediyor ve hata sessizce yutuluyor.
12. `escrows.released` → `listings.sold` ve `orders.completed` senkronizasyonu yok; "Mark sold" tamamen elle ve denetimsiz.
13. Reviews'te `(seller_id, buyer_id)` tekil kısıtı yok → yinelenen yorum mümkün; satın alma kanıtı zorunlu değil.
14. Gold/Premium dealer seviyesi için tanımlı bir kazanım süreci yok.

**P3 — UX / yerelleştirme / performans**
15. Sadece İngilizce sözlük tam; diğer 12 dil çoğunlukla İngilizceye düşüyor, form/dashboard/admin metinleri `t()` kullanmıyor. Arapça RTL karışık yön gösteriyor.
16. Bildirimler yalnızca uygulama içi.

## C. Yapılacak işler (öncelik sırasıyla)

### P0
- `PI_LOGIN_SECRET` oluşturulacak (rastgele, sunucuda saklanır; kullanıcıdan istenmez) ve Pi girişi uçtan uca çalışır hale getirilecek.
- Ağ (mainnet/testnet) yalnızca sunucu `PI_NETWORK` değerinden okunacak; istemcideki Testnet/Mainnet seçici kaldırılacak, `piSignIn`/`linkPiIdentity` istemciden gelen `sandbox` değerini yok sayacak.
- `/auth` sadece Pi girişi olacak: e-posta/şifre kayıt-giriş formu ve şifre sıfırlama rotaları devre dışı bırakılacak (mevcut hesaplar için veri kaybı olmadan; rotalar Pi girişine yönlendirilir).
- Sipariş tekilleştirme: aynı alıcı+ilan için açık sipariş varsa yenisi engellenecek (DB kısıtı + net kullanıcı mesajı).
- Admin escrow durum değişiklikleri, fonlanmamış escrow'un `released` olmasını engelleyecek şekilde sınırlanacak.

### P1
- `verified` filtresi ve sıralama sorguya taşınacak; marketplace'e gerçek sayfalama eklenecek.
- Moderasyon kapısı: yeni/güncellenen yayın ilanları `pending` doğacak, herkese açık sorgular yalnızca `approved` gösterecek, sahibi kendi ilanını her durumda görecek.
- Onay aksiyonu, daha önce reddedilmiş ilanın durumunu tekrar `active` yapacak.
- "Reserve" ile "Buy Now" ayrıştırılacak (tek CTA + net akış), kullanılmayan demo veri silinecek.

### P2
- Satıcı menüsünden `paid` kaldırılacak; tüm sipariş/escrow hataları kullanıcıya anlaşılır mesajla gösterilecek.
- Escrow `released` olduğunda ilan `sold`, sipariş `completed` olacak (DB tetikleyicisi); elle "Mark sold" yalnızca satılmamış, siparişsiz ilanlar için kalacak.
- Reviews: `(seller_id, buyer_id)` tekil kısıtı + tamamlanmış sipariş zorunluluğu.

### P3
- Kullanıcıya görünen metinler çeviri anahtarlarına taşınacak, 12 dil sözlüğü tamamlanacak, RTL kontrol edilecek.
- Boş/hata durumları ve yükleme göstergeleri gözden geçirilecek; "Coming soon" benzeri metinler kalmayacak.
- `.env.example` açıklamalı olarak eklenecek (gizli değer içermez).

## D. Teknik notlar

- Şema değişiklikleri geriye dönük uyumlu migration'larla: yeni kısıt/tetikleyiciler eklenir, kolon düşürülmez.
- Pi ödeme akışı olduğu gibi korunur (approve → blockchain → complete → sunucu doğrulaması sonrası `funded`); frontend kendi başına "ödeme başarılı" demez.
- Private key / seed / passphrase hiçbir yerde kullanıcıdan istenmez; A2U seed yalnızca sunucu ortam değişkeninde kalır.
- Her aşamadan sonra typecheck + production build doğrulanır.

## E. Senin yapman gerekenler (uygulama dışı)

- Pi Developer Portal: production domain, Mainnet app konfigürasyonu, validation key doğrulaması.
- Gerçek Pi Browser cihaz testi (giriş, ödeme, sipariş).
