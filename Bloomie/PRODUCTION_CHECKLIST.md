# 🚀 Production Deployment Checklist - Bloomie

## ✅ Yayın Öncesi Yapılanlar

- [x] ✅ `app.json` yapılandırması güncellendi (İngilizce izin mesajları)
- [x] ✅ iOS ve Android izinleri eklendi
- [x] ✅ Bundle identifiers ayarlandı (com.bloomie.app)
- [x] ✅ Version: 1.0.0
- [x] ✅ Tüm yeni özellikler eklendi (Smart Notifications, Photo Analysis, Weekly Report, Health Tracking)

---

## ⚠️ YAYIN ÖNCESİ MUTLAKA YAPILMASI GEREKENLER

### 1. EAS Project ID ⚠️ ÖNEMLİ
```bash
# EAS hesabı ile login ol:
eas login

# EAS project oluştur:
eas init

# app.json'daki "your-project-id" gerçek project ID ile değiştirilecek
```

**Not:** `app.json` dosyasında şu anda `"projectId": "your-project-id"` var. Bu mutlaka gerçek EAS project ID ile değiştirilmeli!

---

### 2. Supabase Production Kontrolü

#### ✅ Mevcut Ayarlar:
- **Supabase URL**: `https://fpocejfognopgtizdert.supabase.co`
- **Anon Key**: Config dosyasında mevcut
- **Edge Functions**: Deploy edilmiş durumda

#### ⚠️ Kontrol Edilmesi Gerekenler:
```bash
# Tüm Edge Functions'ları production'a deploy et:
supabase functions deploy chat-assistant --no-verify-jwt
supabase functions deploy perplexity-search --no-verify-jwt
supabase functions deploy analyze-photo --no-verify-jwt
supabase functions deploy transcribe-audio --no-verify-jwt
supabase functions deploy parse-voice-command --no-verify-jwt
supabase functions deploy generate-insights --no-verify-jwt

# API Keys'in Supabase secrets'ta olduğundan emin ol:
supabase secrets list

# Şunlar olmalı:
# - OPENAI_API_KEY (Supabase secrets'ta)
# - PERPLEXITY_API_KEY (Supabase secrets'ta)
```

---

### 3. App Store & Play Store Hazırlığı

#### iOS (App Store Connect):
- [ ] App Store listing (açıklama, keywords, kategoriler)
- [ ] Screenshots (6.7", 6.5", 5.5" iPhone, iPad)
- [ ] App Privacy Details (App Store Connect'te)
- [ ] Age rating (4+ olmalı)
- [ ] Support URL (Privacy Policy, Terms of Service)
- [ ] In-App Purchase products tanımlama (Premium Monthly & Yearly)

#### Android (Google Play Console):
- [ ] Play Store listing (açıklama, screenshots)
- [ ] Data Safety Form doldur
- [ ] Content rating
- [ ] Privacy Policy URL
- [ ] In-App Purchase products tanımlama
- [ ] App signing key (EAS otomatik oluşturur)

---

### 4. Build & Test

```bash
# Development build (test için):
eas build --profile development --platform ios
eas build --profile development --platform android

# Production build:
eas build --profile production --platform ios
eas build --profile production --platform android

# Submit to stores:
eas submit --platform ios
eas submit --platform android
```

---

### 5. Environment Variables

**Production'da kullanılacak:**
- ✅ `SUPABASE_URL` - Config dosyasında mevcut
- ✅ `SUPABASE_ANON_KEY` - Config dosyasında mevcut
- ✅ `OPENAI_API_KEY` - Supabase secrets'ta (edge function'da kullanılıyor)
- ✅ `PERPLEXITY_API_KEY` - Supabase secrets'ta

**⚠️ Önemli:** API keys hiçbir zaman React Native koduna yazılmamalı! Tüm API çağrıları Supabase Edge Functions üzerinden yapılıyor - ✅ Doğru yapılmış!

---

### 6. Asset Kontrolü

Aşağıdaki dosyaların mevcut olduğundan emin ol:
- [ ] `./assets/icon.png` (1024x1024)
- [ ] `./assets/splash-icon.png` (1242x2436)
- [ ] `./assets/adaptive-icon.png` (1024x1024)
- [ ] `./assets/notification-icon.png` (96x96)
- [ ] `./assets/favicon.png` (48x48)

---

### 7. Test Checklist

#### Fonksiyonel Testler:
- [ ] ✅ Kullanıcı kayıt/giriş çalışıyor mu?
- [ ] ✅ Nurture ekleme/silme
- [ ] ✅ Log kaydetme (text, voice, photo)
- [ ] ✅ AI chat (Perplexity entegrasyonu)
- [ ] ✅ Push notifications (test cihazında)
- [ ] ✅ Photo health analysis
- [ ] ✅ Weekly report
- [ ] ✅ Health tracking
- [ ] ✅ Premium ekran (şimdilik placeholder)

#### UI/UX Testleri:
- [ ] ✅ Tüm ekranlar doğru render ediliyor mu?
- [ ] ✅ Navigation çalışıyor mu?
- [ ] ✅ Dark mode yok (light mode only - ✅)
- [ ] ✅ Keyboard handling
- [ ] ✅ Safe area insets

#### Performans:
- [ ] ✅ Yavaş yükleme yok
- [ ] ✅ Memory leak yok
- [ ] ✅ API çağrıları optimize

---

### 8. Legal & Privacy

- [ ] Privacy Policy oluştur (GDPR uyumlu)
- [ ] Terms of Service oluştur
- [ ] App Store Connect'te Privacy Policy URL ekle
- [ ] Play Console'da Privacy Policy URL ekle

**Örnek Privacy Policy içeriği:**
- Kullanıcı verilerinin nasıl toplandığı
- Verilerin nasıl kullanıldığı
- Supabase'de saklanması
- OpenAI/Perplexity API'lerine gönderilmesi (edge function üzerinden)
- Kullanıcı hakları (veri silme, erişim vb.)

---

### 9. Monitoring & Analytics

**Önerilen (opsiyonel ama önerilir):**
- [ ] Sentry entegrasyonu (hata takibi)
- [ ] Analytics (Firebase Analytics veya Supabase Analytics)
- [ ] Crash reporting

---

### 10. Post-Launch

Yayınlandıktan sonra:
- [ ] App Store/Play Store reviews'ları takip et
- [ ] Crash reports kontrol et
- [ ] API usage ve maliyetleri takip et
- [ ] Kullanıcı feedback'leri topla

---

## 📝 Önemli Notlar

1. **EAS Project ID** - Mutlaka gerçek ID ile değiştirilmeli!
2. **API Keys** - Hiçbir zaman client-side'da expose edilmemeli (✅ Şu anda doğru)
3. **Push Notifications** - EAS project ID olmadan çalışmaz (local notifications çalışır ama)
4. **In-App Purchases** - Henüz implement edilmemiş (gelecek güncelleme)
5. **Console.log'lar** - Production build'de otomatik strip edilir (sorun değil)

---

## 🎯 Hızlı Başlangıç

### İlk Production Build:
```bash
# 1. EAS login
eas login

# 2. Project initialize (project ID otomatik oluşturulur)
eas init

# 3. Build profiles kontrol et (eas.json oluştur)
# Production profile varsayılan olarak mevcut

# 4. iOS build
eas build --platform ios --profile production

# 5. Android build
eas build --platform android --profile production

# 6. Test et (TestFlight/Internal Testing)

# 7. Submit
eas submit --platform ios
eas submit --platform android
```

---

## ✅ Son Kontrol Listesi (Yayın Öncesi 1 Gün)

- [ ] EAS project ID güncellendi mi?
- [ ] Tüm Edge Functions production'da deploy edildi mi?
- [ ] API keys Supabase secrets'ta mı?
- [ ] App Store/Play Store listings hazır mı?
- [ ] Screenshots hazır mı?
- [ ] Privacy Policy URL eklendi mi?
- [ ] Test build'ler test edildi mi?
- [ ] Version number doğru mu? (1.0.0)
- [ ] Bundle ID'ler doğru mu? (com.bloomie.app)

---

**🎉 Hazırsın! İyi şanslar!**
