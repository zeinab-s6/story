# بک‌اند اپلیکیشن قصه‌گویی

بک‌اند Express برای اپلیکیشن موبایل قصه‌گویی والدین — تولید قصه‌های کوتاه، امن و مناسب سن برای کودکان ۰ تا ۷ سال.

## معماری

```
Frontend (جداگانه deploy)
        ↓
Backend Express API
        ↓
Story Agent → Prompt Builder → Mock / OpenAI Service
        ↓
Output Normalizer → Safety Agent
        ↓
SQLite (node:sqlite)
        ↓
TTS Service → ElevenLabs / OpenAI Text-to-Speech / Mock
        ↓
JSON + Audio Stream Response
```

## قابلیت خواندن قصه با صدا

این بک‌اند از **ElevenLabs**، **OpenAI Text-to-Speech** و **Mock** برای خواندن قصه‌های تولیدشده پشتیبانی می‌کند.

### ترکیب پیشنهادی (GapGPT + ElevenLabs)

- **قصه (متن):** `STORY_PROVIDER=openai` + `OPENAI_BASE_URL=https://api.gapgpt.app/v1`
- **صدا (TTS):** `TTS_PROVIDER=elevenlabs` + `ELEVENLABS_API_KEY`
- **تست محلی بدون API:** `TTS_PROVIDER=mock`

- **حالت اصلی production با GapGPT:** `TTS_PROVIDER=elevenlabs` با مدل `eleven_multilingual_v2` (پشتیبانی فارسی)
- **حالت OpenAI TTS:** `TTS_PROVIDER=openai` با مدل پیشنهادی `gpt-4o-mini-tts`
- **صدای پیش‌فرض ElevenLabs:** `ELEVENLABS_VOICE_ID` یا alias مثل `rachel` در body درخواست
- **صدای پیش‌فرض OpenAI:** `alloy` (و سایر صداهای built-in OpenAI)
- **صدای اختصاصی والد:** اختیاری است (`CUSTOM_VOICE_ENABLED`) — با ElevenLabs یا OpenAI
- اگر Custom Voice برای اکانت فعال نباشد، بک‌اند **خودکار** به صداهای آماده برمی‌گردد
- **Mock mode** فقط برای تست محلی API است (`TTS_PROVIDER=mock`)
- آپلود نمونه صدای والد نیاز به **رضایت صریح** (`consentAudio`) دارد
- در production، فایل‌های صوتی تولیدشده و نمونه‌های آپلودی باید روی volume پایدار باشند

### متغیرهای TTS

| متغیر | توضیح |
|-------|-------|
| `TTS_PROVIDER` | `elevenlabs` (پیشنهادی با GapGPT)، `openai` یا `mock` (تست محلی) |
| `ELEVENLABS_API_KEY` | کلید ElevenLabs |
| `ELEVENLABS_VOICE_ID` | شناسه صدای پیش‌فرض ElevenLabs |
| `ELEVENLABS_MODEL_ID` | مدل TTS — پیش‌فرض `eleven_multilingual_v2` |
| `ELEVENLABS_STABILITY` | پایداری صدا (۰ تا ۱) |
| `ELEVENLABS_SIMILARITY_BOOST` | شباهت به صدای اصلی (۰ تا ۱) |
| `OPENAI_TTS_MODEL` | مدل TTS OpenAI — پیش‌فرض `gpt-4o-mini-tts` |
| `OPENAI_TTS_VOICE` | صدای پیش‌فرض OpenAI — پیش‌فرض `alloy` |
| `OPENAI_TTS_FORMAT` | `mp3`, `wav` (ElevenLabs: mp3/wav؛ OpenAI: mp3, wav, opus, aac, flac) |
| `OPENAI_BASE_URL` | برای GapGPT: `https://api.gapgpt.app/v1` |
| `CUSTOM_VOICE_ENABLED` | `true` / `false` — صدای اختصاصی اختیاری |
| `AUDIO_STORAGE_DIR` | مسیر ذخیره صداهای تولیدشده |
| `VOICE_UPLOAD_DIR` | مسیر نمونه‌های صوتی آپلودشده |
| `MAX_AUDIO_UPLOAD_MB` | حداکثر حجم آپلود (پیش‌فرض ۱۰) |

### نمونه env برای Production (GapGPT + ElevenLabs)

```env
STORY_PROVIDER=openai
OPENAI_API_KEY=your-gapgpt-key
OPENAI_BASE_URL=https://api.gapgpt.app/v1
OPENAI_MODEL=gpt-4o-mini

TTS_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=your-elevenlabs-key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
ELEVENLABS_MODEL_ID=eleven_multilingual_v2

CUSTOM_VOICE_ENABLED=false
AUDIO_STORAGE_DIR=/data/audio
VOICE_UPLOAD_DIR=/data/voice-uploads
```

### نمونه env برای Production (OpenAI TTS)

```env
STORY_PROVIDER=openai
TTS_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=alloy
OPENAI_TTS_FORMAT=mp3
CUSTOM_VOICE_ENABLED=false
AUDIO_STORAGE_DIR=/data/audio
VOICE_UPLOAD_DIR=/data/voice-uploads
```

### Volume پایدار برای فایل‌های صوتی

```env
AUDIO_STORAGE_DIR=/data/audio
VOICE_UPLOAD_DIR=/data/voice-uploads
```

فایل‌های صوتی تولیدشده در `AUDIO_STORAGE_DIR` و نمونه‌های صدای والد در `VOICE_UPLOAD_DIR` ذخیره می‌شوند.

## راه‌اندازی محلی

```bash
cd storytelling/backend
npm install
cp .env.example .env
npm run dev
```

سرور روی `http://localhost:3000` اجرا می‌شود.

## حالت Mock (قصه + صدا)

در `.env`:

```env
STORY_PROVIDER=mock
TTS_PROVIDER=mock
```

بدون نیاز به کلید API، قصه و صدای fake تولید می‌شوند.

## حالت GapGPT + ElevenLabs

```env
STORY_PROVIDER=openai
OPENAI_API_KEY=your-gapgpt-key
OPENAI_BASE_URL=https://api.gapgpt.app/v1
OPENAI_MODEL=gpt-4o-mini

TTS_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=your-elevenlabs-key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
OPENAI_TTS_FORMAT=mp3
```

کلید API فقط در بک‌اند نگهداری می‌شود و هرگز به فرانت‌اند ارسال نمی‌شود.

## حالت OpenAI (قصه + TTS)

```env
STORY_PROVIDER=openai
TTS_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=alloy
OPENAI_TTS_FORMAT=mp3
```

کلید API فقط در بک‌اند نگهداری می‌شود و هرگز به فرانت‌اند ارسال نمی‌شود.

## متغیرهای محیطی Production

| متغیر | توضیح |
|-------|-------|
| `NODE_ENV` | `production` |
| `FRONTEND_ORIGIN` | آدرس دقیق فرانت‌اند |
| `DATABASE_PATH` | مسیر دیتابیس روی volume پایدار |
| `BACKUP_DIR` | مسیر پشتیبان‌گیری |
| `STORY_PROVIDER` | `mock` یا `openai` |
| `TTS_PROVIDER` | `mock`، `openai` یا `elevenlabs` |
| `OPENAI_BASE_URL` | آدرس GapGPT یا OpenAI |
| `ELEVENLABS_API_KEY` | کلید ElevenLabs (اگر TTS_PROVIDER=elevenlabs) |
| `OPENAI_TTS_MODEL` | مدل TTS |
| `OPENAI_TTS_VOICE` | صدای پیش‌فرض |
| `CUSTOM_VOICE_ENABLED` | فعال‌سازی صدای اختصاصی |
| `AUDIO_STORAGE_DIR` | مسیر صداهای تولیدشده |
| `VOICE_UPLOAD_DIR` | مسیر آپلود نمونه صدا |
| `ADMIN_TOKEN` | توکن دسترسی ادمین |
| `RATE_LIMIT_WINDOW_MS` | پنجره محدودیت (پیش‌فرض ۶۰۰۰۰) |
| `RATE_LIMIT_MAX` | حداکثر درخواست (پیش‌فرض ۲۰) |

### Volume پایدار

```env
DATABASE_PATH=/data/storytelling.sqlite
BACKUP_DIR=/data/backups
```

دیتابیس را **داخل پوشه سورس‌کد** در production قرار ندهید.

## ⚠️ هشدار SQLite

- برای production جدی، **فقط یک instance** از بک‌اند اجرا کنید.
- از **persistent volume** استفاده کنید.
- پشتیبان‌گیری منظم انجام دهید.
- اگر scaling افقی لازم شد، repositories را به PostgreSQL منتقل کنید.

## پشتیبان‌گیری

```bash
curl -X POST http://localhost:3000/api/admin/backups \
  -H "Authorization: Bearer change-this-admin-token"
```

فایل پشتیبان در `BACKUP_DIR` با نام `storytelling-YYYY-MM-DD-HH-mm.sqlite` ذخیره می‌شود.

## API — لیست Postman

| Method | Endpoint | توضیح |
|--------|----------|-------|
| GET | `/health` | وضعیت سرویس |
| GET | `/api/stories/goals` | لیست اهداف قصه |
| POST | `/api/stories/generate` | تولید قصه |
| GET | `/api/stories/:id` | دریافت قصه |
| DELETE | `/api/stories/:id` | حذف قصه |
| GET | `/api/stories/session/:sessionId` | قصه‌های یک نشست |
| POST | `/api/stories/:id/feedback` | ثبت بازخورد |
| POST | `/api/stories/:id/audio` | تولید صدای قصه |
| GET | `/api/stories/:id/audio` | لیست صداهای یک قصه |
| GET | `/api/stories/:storyId/audio/:audioId` | پخش/دانلود فایل صوتی |
| GET | `/api/voices/mode` | وضعیت TTS و صدای اختصاصی |
| POST | `/api/voices/profiles` | ثبت پروفایل صدای والد (multipart) |
| GET | `/api/voices/session/:sessionId` | پروفایل‌های صدا برای نشست |
| GET | `/api/voices/:id` | دریافت یک پروفایل صدا |
| DELETE | `/api/voices/:id` | حذف پروفایل صدا |
| POST | `/api/feedback/:storyId` | ثبت بازخورد (سازگار) |
| POST | `/api/admin/backups` | پشتیبان‌گیری (ادمین) |
| GET | `/api/admin/stats` | آمار (ادمین) |

## نمونه curl

### Health

```bash
curl http://localhost:3000/health
```

### اهداف

```bash
curl http://localhost:3000/api/stories/goals
```

### تولید قصه

```bash
curl -X POST http://localhost:3000/api/stories/generate \
  -H "Content-Type: application/json" \
  -d "{\"age\":3,\"interest\":\"خرگوش\",\"goal\":\"sleep\",\"mood\":\"sleepy\",\"durationMinutes\":3,\"childName\":\"سارا\"}"
```

### دریافت قصه

```bash
curl http://localhost:3000/api/stories/1
```

### بازخورد

```bash
curl -X POST http://localhost:3000/api/stories/1/feedback \
  -H "Content-Type: application/json" \
  -d "{\"rating\":5,\"note\":\"عالی بود\"}"
```

### آمار ادمین

```bash
curl http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer change-this-admin-token"
```

## تست Postman — صدا

### ۱. بررسی حالت TTS

```bash
curl http://localhost:3000/api/voices/mode
```

### ۲. تولید قصه

```bash
curl -X POST http://localhost:3000/api/stories/generate \
  -H "Content-Type: application/json" \
  -d "{\"age\":3,\"interest\":\"خرگوش\",\"goal\":\"sleep\",\"mood\":\"sleepy\",\"durationMinutes\":3,\"childName\":\"سارا\"}"
```

### ۳. تولید صدای قصه

با ElevenLabs:
```bash
curl -X POST http://localhost:3000/api/stories/1/audio \
  -H "Content-Type: application/json" \
  -d "{\"voice\":\"rachel\",\"format\":\"mp3\"}"
```

با OpenAI:
```bash
curl -X POST http://localhost:3000/api/stories/1/audio \
  -H "Content-Type: application/json" \
  -d "{\"voice\":\"alloy\",\"format\":\"mp3\"}"
```

برای production با GapGPT:
`STORY_PROVIDER=openai` + `OPENAI_BASE_URL` و `TTS_PROVIDER=elevenlabs` + `ELEVENLABS_API_KEY` تنظیم شود.

### ۴. پخش فایل صوتی

```bash
curl http://localhost:3000/api/stories/1/audio/1 --output story.mp3
```

### ۵. (اختیاری) آپلود پروفایل صدای والد

```bash
curl -X POST http://localhost:3000/api/voices/profiles \
  -F "sessionId=session-123" \
  -F "parentLabel=مادر" \
  -F "consentAudio=@consent.mp3" \
  -F "sampleAudio=@sample.mp3"
```

### ۶. تولید صدا با voiceProfileId

```bash
curl -X POST http://localhost:3000/api/stories/1/audio \
  -H "Content-Type: application/json" \
  -d "{\"voiceProfileId\":1,\"voice\":\"alloy\",\"format\":\"mp3\"}"
```

اگر صدای اختصاصی در دسترس نباشد، با صدای آماده ElevenLabs یا OpenAI ادامه می‌دهد.

## ساختار پروژه

```
backend/
├── server.js
├── .env.example
└── src/
    ├── config/       # env, cors
    ├── db/           # database, migrations
    ├── middleware/   # rate limit, auth, logging
    ├── routes/       # story, feedback, admin, voice
    ├── agents/       # story, safety, prompt, normalizer
    ├── services/     # openai, mock, backup, tts, elevenlabs, audio storage, custom voice
    ├── data/         # story goals, tts voices, elevenlabs presets
    ├── repositories/ # story, feedback, usage, voice profile, story audio
    ├── validators/
    └── utils/
```
