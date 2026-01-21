# 🌱 Bloomie - Proje Yol Haritası ve Eksikler

*Son Güncelleme: Ocak 2026*

---

## 📊 Mevcut Durum Özeti

### ✅ Tamamlanan Özellikler

| Kategori | Özellik | Durum |
|----------|---------|-------|
| **Auth** | Email/Password giriş | ✅ |
| **Auth** | Kayıt & Email doğrulama | ✅ |
| **Auth** | Şifre sıfırlama | ✅ |
| **Auth** | Oturum kalıcılığı | ✅ |
| **Nurtures** | Bebek/Pet/Bitki ekleme | ✅ |
| **Nurtures** | Nurture düzenleme/silme | ✅ |
| **Logging** | Doğal dil ile log girişi | ✅ |
| **Logging** | AI ile parsing | ✅ |
| **Logging** | Fotoğraf ekleme | ✅ |
| **AI** | Chat asistanı | ✅ |
| **AI** | Fotoğraf analizi | ✅ |
| **AI** | Insights oluşturma | ✅ |
| **Voice** | Ses kaydı | ✅ |
| **Voice** | Whisper transkripsiyon | ✅ |
| **Voice** | Text-to-Speech | ✅ |
| **Calendar** | Takvim görünümü | ✅ |
| **Reminders** | Hatırlatıcı oluşturma | ✅ |
| **Premium** | Premium UI | ✅ |
| **Settings** | Ayarlar ekranı | ✅ |
| **Backend** | Supabase entegrasyonu | ✅ |
| **Backend** | 6 Edge Function | ✅ |
| **Offline** | Lokal veri önbelleği | ✅ |

---

## 🚨 Kritik Eksikler (Yüksek Öncelik)

### 1. ⚠️ In-App Purchase Entegrasyonu (ZORUNLU)
**Durum:** Yok  
**Açıklama:** Premium satın alma UI'ı var ama App Store/Play Store IAP entegrasyonu yok.  
**Hedef Pazar:** 🇺🇸 Amerika

**Yapılması Gerekenler:**
- [ ] `react-native-iap` veya `expo-in-app-purchases` kurulumu
- [ ] App Store Connect'te ürün tanımlama (monthly/yearly subscription)
- [ ] Google Play Console'da ürün tanımlama
- [ ] Satın alma akışı implementasyonu
- [ ] Receipt validation (Supabase Edge Function ile sunucu tarafı doğrulama)
- [ ] Subscription restore özelliği
- [ ] Subscription status webhook'ları (App Store Server Notifications, Google RTDN)
- [ ] Sandbox/test ortamı testleri

---

### 2. ⚠️ Push Notifications (Kısıtlı)
**Durum:** Expo Go'da çalışmıyor  
**Açıklama:** Remote push notifications için Development Build gerekli.

**Yapılması Gerekenler:**
- [ ] EAS Build ile Development Build oluşturma
- [ ] Firebase Cloud Messaging (Android) entegrasyonu
- [ ] APNs (iOS) entegrasyonu
- [ ] Push token yönetimi
- [ ] Scheduled notifications testi

---

### 3. ⚠️ expo-av Deprecated
**Durum:** SDK 54'te kaldırılacak  
**Açıklama:** Ses kaydı için expo-av kullanılıyor, expo-audio'ya geçilmeli.

**Yapılması Gerekenler:**
- [ ] `expo-audio` paketine geçiş
- [ ] `VoiceModeScreen.tsx` güncelleme
- [ ] `voice.ts` service güncelleme
- [ ] Ses kaydı testleri

---

## 🔧 Orta Öncelikli Eksikler

### 4. 📱 Sosyal Giriş (Google/Apple)
**Durum:** UI var, fonksiyon yok  
**Açıklama:** "Coming Soon" mesajı gösteriyor.

**Yapılması Gerekenler:**
- [ ] Google Sign-In entegrasyonu (Expo Auth Session)
- [ ] Apple Sign-In entegrasyonu
- [ ] Supabase OAuth yapılandırması
- [ ] Deep linking ayarları

---

### 5. 🖼️ Splash Screen & App Icon
**Durum:** Varsayılan Expo ikonları  
**Açıklama:** Özel tasarım gerekli.

**Yapılması Gerekenler:**
- [ ] Özel splash screen tasarımı (1284x2778px)
- [ ] App icon tasarımı (1024x1024px)
- [ ] Adaptive icon (Android)
- [ ] Notification icon
- [ ] `app.json` güncelleme

---

### 6. 📦 Supabase Storage Kurulumu
**Durum:** Schema'da tanımlı ama kurulmamış  
**Açıklama:** Fotoğraf yükleme için bucket gerekli.

**Yapılması Gerekenler:**
- [ ] `nurture-photos` bucket oluşturma
- [ ] Storage policies ekleme
- [ ] Fotoğraf yükleme servisi güncelleme
- [ ] Fotoğraf silme özelliği

---

### 7. 🌐 Çoklu Dil Desteği (i18n) - DÜŞÜK ÖNCELİK
**Durum:** Sadece İngilizce  
**Açıklama:** Amerika pazarı için İngilizce yeterli. İleride genişleme için düşünülebilir.

**Yapılması Gerekenler (Opsiyonel):**
- [ ] i18n kütüphanesi ekleme (i18next)
- [ ] İspanyolca desteği (ABD'deki İspanyolca konuşanlar için)
- [ ] Dil seçimi ayarları
- [ ] AI yanıtları için dil desteği

---

### 8. 📊 Veri Dışa Aktarma
**Durum:** UI var, fonksiyon yok  
**Açıklama:** Premium özellik olarak planlanmış.

**Yapılması Gerekenler:**
- [ ] PDF export servisi
- [ ] CSV export servisi
- [ ] Email ile gönderme
- [ ] Share sheet entegrasyonu

---

### 9. 👨‍👩‍👧 Aile Paylaşımı
**Durum:** Database şeması var, UI yok  
**Açıklama:** Family Plan özelliği.

**Yapılması Gerekenler:**
- [ ] Davet gönderme UI
- [ ] Davet kabul etme akışı
- [ ] Paylaşılan nurture görünümü
- [ ] İzin yönetimi (view/edit)

---

## 📝 Düşük Öncelikli İyileştirmeler

### 10. 🎨 UI/UX İyileştirmeleri
- [ ] Onboarding akışında animasyonlar
- [ ] Skeleton loading ekranları
- [ ] Pull-to-refresh animasyonları
- [ ] Haptic feedback tutarlılığı
- [ ] Dark mode desteği

### 11. 📈 Analytics & Monitoring
- [ ] Crash reporting (Sentry)
- [ ] Analytics (Mixpanel/Amplitude)
- [ ] Performance monitoring
- [ ] Error boundary'ler

### 12. 🔒 Güvenlik İyileştirmeleri
- [ ] Rate limiting (API)
- [ ] Input validation güçlendirme
- [ ] Secure storage (hassas veriler)
- [ ] Certificate pinning

### 13. ⚡ Performans Optimizasyonları
- [ ] Image caching (FastImage)
- [ ] List virtualization (FlashList)
- [ ] Bundle size optimizasyonu
- [ ] Lazy loading

### 14. 🧪 Test Altyapısı
- [ ] Unit testler (Jest)
- [ ] Component testleri (React Native Testing Library)
- [ ] E2E testleri (Detox)
- [ ] API testleri

---

## 🚀 Yayın Öncesi Kontrol Listesi

### App Store/Play Store Gereksinimleri
- [ ] Privacy Policy sayfası (gerçek URL)
- [ ] Terms of Service sayfası (gerçek URL)
- [ ] App Store açıklaması
- [ ] Ekran görüntüleri (6.7", 5.5", iPad)
- [ ] App Preview videosu
- [ ] Yaş derecelendirmesi
- [ ] Data Safety form (Play Store)
- [ ] App Privacy (App Store)

### Teknik Gereksinimler
- [ ] EAS Project ID güncelleme
- [ ] Production Supabase projesi
- [ ] Production API anahtarları
- [ ] Environment variables yönetimi
- [ ] App versioning stratejisi

---

## 📅 Önerilen Geliştirme Sırası

### Faz 1: Kritik (1-2 Hafta)
1. Development Build oluşturma
2. Push Notifications düzeltme
3. expo-audio geçişi
4. Splash screen & icons

### Faz 2: In-App Purchase (2-3 Hafta)
5. react-native-iap entegrasyonu
6. App Store Connect & Play Console ürün tanımlama
7. Receipt validation (Supabase Edge Function)
8. Subscription yönetimi & restore
9. Sandbox testleri

### Faz 3: Sosyal Giriş (1 Hafta)
10. Google Sign-In
11. Apple Sign-In

### Faz 4: Gelişmiş Özellikler (2-3 Hafta)
12. Storage kurulumu
13. Veri dışa aktarma
14. Aile paylaşımı

### Faz 5: Yayın Hazırlığı (1-2 Hafta)
15. Final testler
16. App Store Connect hazırlığı (screenshots, açıklama, privacy policy)
17. Google Play Console hazırlığı
18. Production deploy & yayın

---

## 📞 Notlar

- Supabase Edge Function'lar deploy edilmeli (`supabase functions deploy`)
- OpenAI API key Supabase secrets'a eklenmeli
- Gerçek SUPABASE_ANON_KEY kullanılmalı (mevcut key placeholder olabilir)

---

*Bu döküman proje ilerledikçe güncellenmelidir.*
