# JarWise — Build Plan

T. Harv Eker এর 6 Jar Money Management Method এর উপর ভিত্তি করে একটি modern personal finance app।

## Tech Stack
- Frontend: React + TanStack Start + Tailwind CSS + shadcn/ui
- Backend: Lovable Cloud (Supabase) — auth, DB, RLS
- Charts: Recharts
- Theme: next-themes দিয়ে dark/light toggle
- Animations: Framer Motion (subtle)

## Design System
- Palette: Dark navy (`#0B1F3A`), Emerald accents (`#10B981`), off-white cards, slate neutrals
- Typography: Inter (body) + Space Grotesk (headings)
- Modern minimal — generous whitespace, rounded-2xl cards, soft shadows
- Mobile-first responsive, dark/light toggle (header)

## Database Schema (Lovable Cloud)

**profiles** (auto-created on signup via trigger)
- id (uuid, FK auth.users), full_name, avatar_url, currency (default 'USD'), theme_preference, created_at

**jars** (per user, seeded with 6 defaults on signup)
- id, user_id, name, key (NEC/LTSS/EDU/PLAY/FFA/GIVE), percentage, color, icon, balance

**incomes**
- id, user_id, amount, source, note, received_at, created_at
- Trigger: income insert → auto-distribute across jars by percentage (updates jar balances)

**expenses**
- id, user_id, jar_id, amount, category, note, spent_at, created_at
- Trigger: expense insert → decrement jar balance

**categories** (preset + custom per user)

RLS: সব table এ `user_id = auth.uid()` policy।

## Routes

**Public**
- `/` — Landing (hero, 6 jar explanation, features, CTA)
- `/login` — Email/password + Google sign-in
- `/register` — Signup
- `/forgot-password` — Reset email request
- `/reset-password` — New password form

**Protected (`_authenticated` layout)**
- `/dashboard` — Total balance, 6 jar cards with progress, recent transactions, monthly summary
- `/income` — Add income form + history table, auto-distribution preview
- `/expenses` — Add expense (pick jar + category) + filterable history
- `/jars` — 6 jar details, balance, recent activity per jar (fixed percentages displayed)
- `/reports` — Advanced: monthly trends (line), income vs expense (bar), jar distribution (pie), category breakdown, CSV/PDF export
- `/settings` — Currency, theme, notifications
- `/profile` — Name, avatar upload, email, password change

## Auth Flow
- Email/password + Google OAuth (Lovable broker)
- Forgot password → email link → `/reset-password`
- `_authenticated` layout route gates protected pages with `beforeLoad` redirect
- `onAuthStateChange` listener at root invalidates router + query cache
- Signup trigger seeds 6 default jars with fixed Eker percentages

## 6 Default Jars (fixed)
| Jar | % | Purpose |
|---|---|---|
| NEC — Necessities | 55% | rent, food, bills |
| LTSS — Long-term Savings | 10% | big purchases |
| EDU — Education | 10% | books, courses |
| PLAY | 10% | fun, treats |
| FFA — Financial Freedom | 10% | investments |
| GIVE | 5% | charity, gifts |

## Technical Details

- TanStack file-based routing, প্রতিটা public route এর নিজস্ব `head()` meta (SEO)
- Server functions (`createServerFn` + `requireSupabaseAuth`) — income/expense mutations
- Browser Supabase client সরাসরি reads এর জন্য React Query এর সাথে
- DB triggers (Postgres) — jar balance auto-update on income/expense insert/update/delete
- Recharts দিয়ে responsive charts, jsPDF + papaparse export এর জন্য
- next-themes provider root এ, system preference detect

## Build Order
1. Lovable Cloud enable + Google OAuth provider
2. DB migration — tables, RLS, signup trigger, jar distribution trigger
3. Auth pages (login/register/forgot/reset) + `_authenticated` guard
4. Root layout, theme toggle, sidebar nav
5. Landing page
6. Dashboard + Jars
7. Income + Expenses (forms + tables)
8. Reports + export
9. Settings + Profile

পরিমাণ বড়, তাই approve করলে আমি step-by-step build করব এবং প্রতিটা milestone এ verify করব।