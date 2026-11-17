# Don't Forget 📌

<div align="center">

![Don't Forget Banner](https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=1200&h=380&q=80)

### *“Think It. Save It. Never Forget It.”*

A modern, fast, and privacy-first personal memory and reminder web application designed to capture everyday information instantly and deliver reliable alerts right when you need them.

[![React](https://img.shields.io/badge/React-18.3-61dafb?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646cff?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=flat-square&logo=supabase)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

[Live Demo](#quick-start) • [Features](#key-features) • [Architecture](#architecture) • [Setup Guide](#installation--setup) • [Email Scheduling](#scheduled-reminders--email-delivery)

</div>

---

## 📖 Overview

In our day-to-day lives, we juggle library book deadlines, grocery lists, project tasks, gift ideas, and doctor appointments across fragmented notes apps. 

**Don't Forget** solves this friction with **Natural-Language Instant Capture**: simply type naturally (e.g., *"Return library book on Nov 5"* or *"Call friend at 6 PM"*), and the system detects dates, times, and categories automatically. With background server scheduling and transactional email delivery, you'll receive reminders on time—even when your browser or computer is closed.

---

## ✨ Key Features

### ⚡ 1. Natural-Language Instant Capture
- **Frictionless Entry**: Capture thoughts, to-dos, or dates with single-line natural phrases.
- **Smart NLP Date Engine**: Parses expressions like *"tomorrow at 6 PM"*, *"next Monday"*, *"this weekend"*, or explicit calendar dates.
- **Ambiguity Confirmation**: Confirms interpreted dates before setting reminders rather than guessing or silently scheduling.
- **Save Plain Text or Scheduled**: Toggle reminder alerts on or off per item with a single click.

### 📬 2. Multi-Channel Reminders & Notifications
- **Server-Side Scheduled Emails**: Responsive HTML reminder emails sent directly to your registered address via Resend integration.
- **Background Cron Delivery**: Background checks using PostgreSQL/Supabase Edge Functions ensure emails are sent even if you're logged out or offline.
- **Desktop Web Notifications**: Native browser alerts for items due within 30 minutes.
- **In-App Notification Center**: Notification inbox with unread counters, mark-as-read, and clear-all actions.

### 🗂️ 3. Built-In Specialized Categories
| Category | Purpose & Specialized Fields |
|---|---|
| **Tasks** | To-dos with Low / Medium / High / Urgent priorities, due dates, and completion status. |
| **Dates & Reminders** | Birthdays, doctor appointments, recurring payments, and meetings. |
| **Shopping Lists** | Multi-list grocery and hardware checklists with quantities, units, and strike-through items. |
| **Library Books** | Book title, author, library branch, return deadlines, and returned status to avoid late fees. |
| **Saved Links** | Safe URL bookmarks with domain detection and personal notes. |
| **Ideas & Thoughts** | Instant capture for creative concepts, brainstorming, and snippets. |
| **Gift Ideas** | Recipient tracking, occasion tags, budget planning, and purchased status. |
| **Places to Visit** | Travel bucket lists, locations, and visited toggles. |

### 🔒 4. Security & Privacy
- **User-Isolated Data**: Supabase PostgreSQL with **Row Level Security (RLS)** guarantees users can only access their own records.
- **Secure Authentication**: Email and password sign-up/login, password visibility toggle, forgot password recovery, and session persistence.
- **Non-Sensitive GA4 Telemetry**: Google Analytics 4 integration (`G-0SHNQET22C`) records anonymous interaction events without transmitting private notes, URLs, or personal data.

### 🎨 5. Clean, Modern UX
- **Typography & Aesthetics**: Designed with Plus Jakarta Sans and minimal, distraction-free cards.
- **Light & Dark Mode**: System auto-detection with one-click theme switcher.
- **Universal Search & Filtering**: Instant search across titles, contents, authors, recipients, and categories with status filters (Pending / Completed) and sorting.

---

## 🏗️ Architecture

```
Don't Forget/
├── src/
│   ├── components/          # Reusable UI (Layout, QuickSaveBar, MemoryCard)
│   ├── context/             # React Contexts (AuthContext, MemoryContext, ThemeContext)
│   ├── lib/                 # Core utilities
│   │   ├── analytics.ts     # GA4 tracking with privacy sanitization
│   │   ├── nlpParser.ts     # Natural language date & category detection
│   │   ├── reminderScheduler.ts # Notification & email dispatch engine
│   │   ├── localStore.ts    # Transparent offline fallback storage
│   │   └── supabase.ts      # Supabase client configuration
│   ├── pages/               # Views (LandingPage, AuthPages, Dashboard, Shopping, Settings)
│   └── types/               # TypeScript interfaces & domain models
├── supabase/
│   ├── schema.sql           # Complete PostgreSQL schema with RLS policies
│   ├── cron_setup.sql       # Automated minute-by-minute reminder runner
│   └── functions/           # Supabase Edge Functions (Resend email dispatch)
└── public/
```

---

## 🚀 Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Git](https://git-scm.com/)
- A free [Supabase](https://supabase.com/) account (optional for cloud persistence; offline mode works out of the box)

### 1. Clone the Repository
```bash
git clone https://github.com/santhoshdayalan753-creator/Don-t-Forget.git
cd Don-t-Forget
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory (refer to `.env.example`):
```env
# Supabase PostgreSQL Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Google Analytics 4 (Preconfigured)
VITE_GA_MEASUREMENT_ID=G-0SHNQET22C

# Optional: Email Reminder Webhook (Resend / Edge Function)
VITE_NOTIFICATION_WEBHOOK_URL=https://your-project.supabase.co/functions/v1/send-reminder-email
```

### 4. Database Setup (Supabase)
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard) → **SQL Editor**.
2. Run the SQL schema from [`supabase/schema.sql`](supabase/schema.sql).
3. *([Optional](#scheduled-reminders--email-delivery))* Run [`supabase/cron_setup.sql`](supabase/cron_setup.sql) to enable automated background reminder triggers.

> **Production checklist:** see [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) for auth redirect URLs, SMTP, edge function secrets, Vercel env vars and the end-to-end database test suite (`npm run test:e2e`).

### 5. Start Development Server
```bash
npm run dev
```
Open **[http://127.0.0.1:5173/](http://127.0.0.1:5173/)** in your browser.

---

## ⏰ Scheduled Reminders & Email Delivery

The email reminder system is built to notify users **even if the browser is closed**:

1. **Scheduling**: When creating a memory with a date and time, toggle **Reminder Alert** on.
2. **Idempotent Dispatch**: Uses a database ledger (`reminder_dispatch_logs`) to prevent duplicate email delivery.
3. **Email Provider**: Integrated with [Resend](https://resend.com) for fast deliverability.
4. **Testing Email Alerts**:
   - Navigate to **Profile & Settings** (`/settings`).
   - Click **Send Test Email** to verify that your email configuration dispatches correctly.

---

## 🧪 Available Scripts

| Command | Action |
|---|---|
| `npm run dev` | Starts Vite local dev server with Hot Module Replacement (HMR). |
| `npm run build` | Runs TypeScript typecheck (`tsc -b`) and produces optimized production build in `/dist`. |
| `npm run preview` | Locally serves the production build. |

---

## 🛡️ Privacy & Compliance

- **No Personal Data in Analytics**: Only non-sensitive interaction names (e.g. `quick_save`, `task_completed`) are forwarded to GA4.
- **Strict Data Ownership**: Row Level Security ensures queries without an authenticated session token return zero user records.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

<div align="center">
  <sub>Built with care for everyday productivity. “Think It. Save It. Never Forget It.”</sub>
</div>
