# 🌱 Bloomie

**One journal for everything you nurture** - A beautiful React Native app for tracking the care of your babies, pets, and plants.

![Bloomie Preview](./assets/preview.png)

## ✨ Features

### Core Features (Free)
- 📝 **Magic Input** - Natural language entry: "Fed Leo 120ml at 3pm"
- 🤖 **AI-Powered Parsing** - GPT-4o-mini understands and categorizes your entries
- 📅 **Timeline View** - Beautiful chronological view of all care activities
- 🔔 **Smart Reminders** - Auto-suggested based on your activities
- 📱 **Cross-Platform** - iOS, Android, and Web support

### Premium Features ($4.99/month or $39.99/year)
- 🔓 **Unlimited Nurtures** - Track as many as you want
- 📊 **Advanced Insights** - AI-powered pattern recognition
- 📸 **Unlimited Photos** - Capture every moment
- 📁 **Full History** - Access complete care journal
- 📤 **Export Data** - PDF & CSV exports
- 🎨 **Custom Themes** - Personalize your experience

### Family Plan (Premium+)
- 👨‍👩‍👧 **Family Sharing** - Up to 5 members
- 🔔 **Advanced Notifications** - SMS/Email digests
- 📈 **Growth Charts** - Visual progress tracking

## 🛠 Tech Stack

- **Frontend**: React Native (Expo)
- **Backend**: Supabase (Auth, Database, Storage, Edge Functions)
- **AI**: OpenAI GPT-4o-mini (via Supabase Edge Functions - secure!)
- **State**: Zustand
- **Navigation**: React Navigation
- **Design**: Warm, cozy UI with terracotta & sage colors

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Supabase CLI (`npm install -g supabase`)

### Setup

1. **Clone and install dependencies**
```bash
cd Bloomie
npm install
```

2. **Configure Supabase**
   
   Your Supabase is already configured! The credentials are in `src/constants/config.ts`.
   
   To deploy the database schema:
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Open SQL Editor
   - Run the contents of `supabase/schema.sql`

3. **Deploy Edge Functions**
   
   Edge Functions handle OpenAI calls securely:
   
   ```bash
   # Login to Supabase CLI
   npx supabase login
   
   # Link to your project
   npx supabase link --project-ref fpocejfognopgtizdert
   
   # Set OpenAI API key as secret
   npx supabase secrets set OPENAI_API_KEY=your-openai-key
   
   # Deploy functions
   npx supabase functions deploy parse-journal
   npx supabase functions deploy generate-insights
   ```

4. **Run the app**
```bash
# Development
npm start

# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## 📁 Project Structure

```
Bloomie/
├── App.tsx                      # Entry point
├── src/
│   ├── screens/                 # Screen components
│   │   ├── SplashScreen.tsx     # "Life is made of small moments"
│   │   ├── OnboardingScreen.tsx # Category selection
│   │   ├── AuthScreen.tsx       # Login/Signup
│   │   ├── HomeScreen.tsx       # Main + Magic Input + Timeline
│   │   ├── CalendarScreen.tsx   # Calendar view
│   │   ├── InsightsScreen.tsx   # AI insights
│   │   └── ...
│   ├── services/
│   │   ├── supabase.ts          # Database & auth
│   │   ├── openai.ts            # AI via Edge Functions (secure!)
│   │   └── notifications.ts     # Push notifications
│   ├── stores/useAppStore.ts    # Zustand state
│   ├── components/              # Reusable UI
│   └── constants/               # Theme, config
├── supabase/
│   ├── schema.sql               # Database schema
│   └── functions/
│       ├── parse-journal/       # AI text parsing
│       └── generate-insights/   # AI pattern analysis
└── package.json
```

## 🔐 Security Architecture

**Important**: OpenAI API is NEVER called directly from the React Native app!

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   React Native  │ ──► │ Supabase Edge    │ ──► │   OpenAI    │
│      App        │     │   Function       │     │    API      │
└─────────────────┘     └──────────────────┘     └─────────────┘
        │                       │
        │                       │ API Key stored
        │                       │ as secret
        ▼                       ▼
   User input            Secure processing
```

Benefits:
- API keys never exposed to client
- Rate limiting at edge
- Request validation
- Logging & monitoring

## 🎨 Design System

### Colors
| Name | Hex | Usage |
|------|-----|-------|
| Primary | `#E07A5F` | Terracotta - main actions |
| Sage | `#81B29A` | Plants, success |
| Sand | `#F2E9E4` | Backgrounds |
| Cream | `#FFF8F0` | Light backgrounds |
| Yellow | `#F2CC8F` | Highlights, stars |

### Nurture Colors
- **Baby**: Pink gradient `#FFE5D9` → `#FFCAD4`
- **Pet**: Warm gradient `#FFE8D6` → `#DDBEA9`
- **Plant**: Green gradient `#E2ECE9` → `#BFD8BD`

### Typography
- **Display**: Nunito (800 weight for headings)
- **Body**: Nunito (400-600 weight)
- **Hand**: Patrick Hand (for playful text)

## 🚀 Deployment

### iOS (App Store)
```bash
eas build --platform ios --profile production
eas submit --platform ios
```

### Android (Play Store)
```bash
eas build --platform android --profile production
eas submit --platform android
```

## 📧 Support

- Email: support@bloomie.app
- Website: [bloomie.app](https://bloomie.app)

---

Made with 💚 for nurturers everywhere
