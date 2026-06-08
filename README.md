# Togahh — Marketing Automation Dashboard

A full-stack marketing automation platform built for **Togahh Health** — covering Meta Ads creation, campaign management, competitor analysis, social media monitoring, newsletter automation, and outreach. Built on Next.js 16 with real-time Supabase integration, n8n workflow automation, and direct Meta Graph API execution.

---

## Table of Contents

- [System Overview](#system-overview)
- [Folder Structure](#folder-structure)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Database Schema](#database-schema)
- [API Routes](#api-routes)
- [Environment Variables](#environment-variables)
- [Installation & Setup](#installation--setup)
- [Deployment](#deployment)
- [Integrations](#integrations)

---

## System Overview

The repository contains **three distinct applications** running under a single Next.js instance:

| App | Route | Description |
|-----|-------|-------------|
| **Main Dashboard** | `/` | 10-tab marketing hub — ad creation, campaigns, approvals, reports |
| **Workflow Dashboard** | `/dashboard` | Campaign workflow management, scraper, cleanup, analytics |
| **Newsletter Engine** | `/newsletter` | AI newsletter generation, campaign history, service management |

All three share the same database (Supabase PostgreSQL via Prisma) and authentication layer (NextAuth).

---

## Folder Structure

```
togahh-dashboard/
├── prisma/
│   └── schema.prisma              # Database models (User, Campaign, ScraperJob, etc.)
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ads/
│   │   │   │   └── approve/       # Ad approval endpoint
│   │   │   ├── analytics/         # Workflow analytics
│   │   │   ├── auth/              # NextAuth [...nextauth] handler
│   │   │   ├── brand-config/      # Brand configuration
│   │   │   ├── campaigns/         # Campaign CRUD + approval
│   │   │   ├── cleanup/           # Cleanup trigger + status
│   │   │   ├── elevenlabs/        # ElevenLabs voice listing
│   │   │   ├── executions/        # Workflow execution lookup
│   │   │   ├── meta/
│   │   │   │   ├── account-balance/   # Meta ad account balance
│   │   │   │   ├── campaign-details/  # Fetch existing campaign info
│   │   │   │   ├── launch/            # Launch campaign to Meta (main)
│   │   │   │   ├── live-campaigns/    # Fetch active Meta campaigns
│   │   │   │   ├── locations/         # Meta geolocation search
│   │   │   │   ├── reports/           # Meta Ads insights & reporting
│   │   │   │   ├── status/            # Meta ad status check
│   │   │   │   └── update/            # Update live campaign settings
│   │   │   ├── notifications/error/   # Error alert notifications
│   │   │   ├── proxy/                 # Generic CORS proxy
│   │   │   ├── scraper/               # Lead scraper trigger + jobs
│   │   │   ├── seed/                  # DB seed endpoint
│   │   │   ├── trigger-ads/           # Trigger ad generation via n8n
│   │   │   ├── trigger-n8n/           # General n8n CORS proxy
│   │   │   ├── upload-ad/             # Upload ad creative to Supabase storage
│   │   │   ├── upload-ad-record/      # Save ad record to DB
│   │   │   ├── upload-url/            # Pre-signed upload URL
│   │   │   └── video-metadata/        # Video metadata lookup
│   │   │
│   │   ├── dashboard/
│   │   │   ├── analytics/         # Analytics page
│   │   │   ├── campaigns/         # Campaign list + new campaign form
│   │   │   ├── cleanup/           # Data cleanup interface
│   │   │   ├── scraper/           # Lead scraper + history
│   │   │   ├── layout.tsx         # Dashboard layout with sidebar
│   │   │   └── page.tsx           # Dashboard home
│   │   │
│   │   ├── newsletter/
│   │   │   ├── campaign/          # Newsletter campaign management
│   │   │   ├── generate/          # AI newsletter generation
│   │   │   ├── history/           # Newsletter history
│   │   │   ├── services/          # Mailing service configuration
│   │   │   └── layout.tsx         # Newsletter layout
│   │   │
│   │   ├── login/                 # Login page
│   │   ├── CampaignSetup.tsx      # Meta Ads campaign builder (3-step wizard)
│   │   ├── SocialDash.tsx         # Social media dashboard
│   │   ├── GeneratorModal.tsx     # Ad generation modal
│   │   ├── ImagePromptModal.tsx   # Image prompt editor
│   │   ├── RetryModal.tsx         # Ad retry interface
│   │   ├── VoiceExplorerModal.tsx # ElevenLabs voice previewer
│   │   ├── CustomSelect.tsx       # Styled dropdown component
│   │   ├── components.tsx         # Shared UI primitives (Card, Badge, Spinner, etc.)
│   │   ├── globals.css            # CSS custom properties / design tokens
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Main dashboard (10-tab hub)
│   │
│   ├── components/
│   │   ├── ui/                    # Radix UI + Tailwind component library
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ...
│   │   ├── analytics/             # Chart components (Recharts)
│   │   ├── campaigns/             # Campaign form + list
│   │   ├── cleanup/               # Cleanup status + history
│   │   ├── dashboard/             # Sidebar, header, stats cards
│   │   ├── scraper/               # Scraper form + results
│   │   └── providers.tsx          # TanStack Query + Toast providers
│   │
│   ├── context/
│   │   └── CampaignContext.tsx    # Campaign state context
│   │
│   ├── lib/
│   │   ├── auth.ts                # NextAuth configuration
│   │   ├── n8n.ts                 # n8n webhook helper
│   │   ├── prisma.ts              # Prisma client singleton
│   │   ├── supabase.ts            # Supabase client (Main project)
│   │   ├── socialSupabase.ts      # Supabase client (SocialDash project)
│   │   ├── utils.ts               # Utility functions (cn, formatters)
│   │   ├── validations.ts         # Zod validation schemas
│   │   └── hooks/
│   │       └── useN8nStatus.js    # Hook for polling n8n execution status
│   │
│   └── types/
│       └── index.ts               # Shared TypeScript types
│
├── .env                           # Environment variables (not committed)
├── CLAUDE.md                      # Developer architecture guide
├── next.config.ts                 # Next.js configuration
├── tailwind.config.ts             # Tailwind CSS configuration
├── tsconfig.json                  # TypeScript configuration
└── package.json
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Next.js (App Router) | 16.1.6 |
| **UI Library** | React | 19.2.3 |
| **Language** | TypeScript | 5.x |
| **Database** | PostgreSQL via Supabase | — |
| **ORM** | Prisma | 5.10.0 |
| **Realtime** | Supabase Realtime (2 projects) | 2.x |
| **Auth** | NextAuth.js (JWT + Credentials) | 4.x |
| **Styling** | Tailwind CSS v4 + CSS Variables | 4.3.0 |
| **Component Library** | Radix UI | 1.x / 2.x |
| **Data Fetching** | TanStack Query | 5.x |
| **Forms** | React Hook Form + Zod | 7.x / 3.x |
| **Charts** | Recharts | 2.x |
| **Icons** | Lucide React | 1.x |
| **Workflow Automation** | n8n (2 cloud instances) | cloud |
| **AI Voiceover** | ElevenLabs API | — |
| **Ad Platform** | Meta Graph API | v21.0 |
| **State (client)** | Zustand | 4.x |
| **Animations** | tailwindcss-animate | 1.x |

---

## Features

### Main Dashboard (`/`)

The main dashboard is a 10-tab single-page application:

#### 1. Overview
- Live KPI summary (impressions, spend, reach, CTR)
- Quick-action launchers for analysis and ad generation
- Real-time error alert feed from Supabase

#### 2. Ads Analysis
- AI-powered competitor analysis via n8n + GPT
- Sections: Executive Summary, Competitor Analysis, Gap Opportunities, Hook Analysis, Market Insights, Budget Recommendation, Action Plan, Ready Ad Scripts
- Filter by topic; results stored and reloadable

#### 3. Create Ad
- AI video and image ad generation with customizable parameters
- Video: duration (20s / 30s / 40s), style (Cinematic, Neon, Minimal, Dark & Moody), voiceover (ElevenLabs voices)
- Image: style, theme, prompt editing via modal
- Real-time generation status polling via Supabase Realtime
- Approval queue with voice assignment before acceptance

#### 4. Meta Ads *(grouped dropdown in sidebar)*

> **Approval** — Review and approve/reject generated ads; filter by format (video/image); inline media preview modal with editable ad copy fields

> **Campaign Setup** — 3-step Meta Ads campaign builder:
> - Step 1: Campaign settings (objective, CBO/non-CBO budget, schedule)
> - Step 2: Ad Set targeting (age, gender, geo-location search with country-code extraction, optimization goal, placements, device targeting)
> - Step 3: Ad Copy — auto-filled from `json data` column when a video is selected (Ad Name, Primary Text, Headline, Description, Destination URL, CTA)
> - Supports new campaign creation and appending to existing campaigns
> - Launches directly to Meta Graph API v21.0

> **Running Campaign** — Live campaign monitor (status, budget, impressions, spend, start date); inline budget and status editing; real-time sync with Meta API

> **Reports** — Meta Ads performance reports; campaign selector; metrics table (impressions, reach, spend, CTR, CPC, CPM); manual refresh

#### 5. Social-Dash
- Social media performance overview powered by a separate Supabase project
- Platform metrics aggregation

#### 6. Newsletter *(external app)*
- Opens the dedicated newsletter application

#### 7. Outreach *(external app)*
- Opens the dedicated outreach application

---

### Workflow Dashboard (`/dashboard`)

Server-rendered Next.js App Router section:

- **Campaigns** — Create and manage outreach campaign workflows; n8n-triggered execution; approval flow
- **Scraper** — Lead scraping via Apify; configure niche, location, max results; view job history
- **Cleanup** — Trigger contact cleanup workflows; view cleanup logs
- **Analytics** — Charts for campaign performance and lead pipeline (Recharts)

---

### Newsletter Engine (`/newsletter`)

Dedicated sub-application with four React Context providers:

- **Generate** — AI-powered newsletter content generation
- **Campaign** — Manage newsletter send campaigns
- **History** — View past newsletters
- **Services** — Configure mailing service credentials (persisted to localStorage)

---

## Database Schema

Managed via Prisma ORM against a Supabase PostgreSQL instance. Two connection strings are required (pooled for runtime, direct for migrations).

```
User
 └── WorkflowExecution (one-to-many)
      ├── Campaign (one-to-one)
      ├── ScraperJob (one-to-one)
      └── CleanupLog (one-to-one)

Session (NextAuth sessions)
```

**Supabase Tables (outside Prisma — managed directly in Supabase dashboard):**

| Table | Purpose |
|-------|---------|
| `your_name_table` | Ad creatives — stores media URL, format, approval status, and `json data` (ad metadata: name, primary_text, headline, description, destination_url) |
| `reports_json` | Meta Ads performance report snapshots |
| `status_table` | n8n workflow execution status tracking |
| `Error Alerts` | Real-time error notifications |

**`your_name_table` — `json data` column format:**

```json
{
  "ad_id": 1780833466372,
  "ad_type": "video",
  "ad_name": "Togahh_Video_PatientJourney_v1",
  "primary_text": "Save thousands vs Canada — full travel & aftercare included.",
  "headline": "Save Thousands — From $700 CAD",
  "ad_description": "Limited slots. Free consult.",
  "destination_url": "https://togahh.com"
}
```

---

## API Routes

All routes live under `src/app/api/`.

### Meta Ads

| Route | Method | Description |
|-------|--------|-------------|
| `/api/meta/launch` | POST | Launch a full campaign (campaign → ad set → creative → ad) to Meta |
| `/api/meta/live-campaigns` | GET | Fetch active campaigns from Meta Graph API |
| `/api/meta/update` | POST | Update budget, status, or targeting on a live campaign |
| `/api/meta/reports` | GET | Fetch campaign insights (impressions, spend, CTR, CPC) |
| `/api/meta/locations` | GET | Search Meta geolocation API (cities, regions, countries) |
| `/api/meta/campaign-details` | GET | Fetch objective and budget type of an existing campaign |
| `/api/meta/status` | GET | Check ad delivery status |

### Ad Management

| Route | Method | Description |
|-------|--------|-------------|
| `/api/upload-ad` | POST | Upload ad creative to Supabase Storage |
| `/api/upload-ad-record` | POST | Save ad record to `your_name_table` |
| `/api/upload-url` | GET | Generate a pre-signed upload URL |
| `/api/ads/approve` | POST | Mark an ad as approved in Supabase |
| `/api/trigger-ads` | POST | Trigger ad generation workflow via n8n |
| `/api/video-metadata` | GET | Fetch video metadata |

### Workflows & Automation

| Route | Method | Description |
|-------|--------|-------------|
| `/api/trigger-n8n` | POST | CORS proxy to n8n cloud webhooks |
| `/api/campaigns` | GET / POST | List and create campaign workflow executions |
| `/api/campaigns/[id]` | GET / PATCH | Get or update a specific campaign |
| `/api/campaigns/approve` | POST | Approve a campaign workflow |
| `/api/scraper` | POST | Trigger lead scraper via n8n + Apify |
| `/api/scraper/jobs` | GET | List scraper job history |
| `/api/cleanup/trigger` | POST | Trigger contact cleanup workflow |
| `/api/cleanup/status` | GET | Get cleanup job status |
| `/api/executions/[id]` | GET | Fetch workflow execution details |
| `/api/analytics` | GET | Aggregate workflow analytics |

### Other

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[...nextauth]` | ALL | NextAuth credential authentication |
| `/api/elevenlabs/voices` | GET | List available ElevenLabs voices |
| `/api/brand-config` | GET | Fetch brand configuration |
| `/api/notifications/error` | POST | Log error alert to Supabase |
| `/api/proxy` | POST | Generic CORS proxy for external requests |

---

## Environment Variables

Create a `.env` file in the project root:

```env
# ── Database ──────────────────────────────────────────────
# Pooled connection (used at runtime by Prisma)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?pgbouncer=true"

# Direct connection (used for migrations only)
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

# ── Supabase — Main Project ────────────────────────────────
# Used by the main dashboard, ad management, reports
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."

# ── Supabase — SocialDash Project ─────────────────────────
# Used exclusively by the Social-Dash tab
NEXT_PUBLIC_SOCIAL_DASH_SUPABASE_URL="https://YOUR_SECOND_PROJECT_ID.supabase.co"
NEXT_PUBLIC_SOCIAL_DASH_SUPABASE_ANON_KEY="eyJ..."

# ── Meta Graph API ─────────────────────────────────────────
# Long-lived user or system user access token
META_ACCESS_TOKEN="EAAx..."

# Ad account ID
META_AD_ACCOUNT_ID="YOUR_AD_ACCOUNT_ID"

# ── n8n Automation ─────────────────────────────────────────
# Primary n8n instance (Meta ads, campaigns, scraper, cleanup)
N8N_WEBHOOK_URL="https://n8n.srv881198.hstgr.cloud/webhook/..."
N8N_API_KEY="your_n8n_api_key"

# ── NextAuth ───────────────────────────────────────────────
NEXTAUTH_SECRET="your_random_secret_minimum_32_characters"
NEXTAUTH_URL="http://localhost:3000"

# ── ElevenLabs ─────────────────────────────────────────────
ELEVENLABS_API_KEY="el_..."
```

> **Note:** The SocialDash n8n instance (`n8n.srv1208919.hstgr.cloud`) is hardcoded in `SocialDash.tsx` and does not require an environment variable.

---

## Installation & Setup

### Prerequisites

- Node.js 18+
- A Supabase account with **two projects** created
- A Meta Developer app with an Ad Account
- n8n cloud instance(s) with webhooks configured

### 1. Clone & Install

```bash
git clone https://github.com/togahealthai-pixel/meta.git
cd meta
npm install
```

### 2. Configure Environment

```bash
# Copy the example and fill in all values
cp .env.example .env
```

### 3. Set Up the Database

```bash
# Push Prisma schema to your Supabase database
npx prisma db push

# Or run tracked migrations (recommended for production)
npx prisma migrate dev

# Regenerate Prisma client after any schema change
npx prisma generate
```

### 4. Set Up Supabase Tables

In your **main** Supabase project SQL editor:

```sql
-- Ad creatives
create table your_name_table (
  id          uuid default gen_random_uuid() primary key,
  text        text,
  time        timestamptz default now(),
  format      text,
  "Approved"  text,
  "json data" jsonb
);

-- Reports snapshots
create table reports_json (
  id         uuid default gen_random_uuid() primary key,
  data       jsonb,
  created_at timestamptz default now()
);

-- n8n execution status
create table status_table (
  id         uuid default gen_random_uuid() primary key,
  status     text,
  updated_at timestamptz default now()
);

-- Error alerts
create table "Error Alerts" (
  id         uuid default gen_random_uuid() primary key,
  message    text,
  created_at timestamptz default now()
);
```

Then enable **Realtime** on `your_name_table` in the Supabase dashboard (Table Editor → Realtime toggle).

### 5. Run Development Server

```bash
npm run dev
# http://localhost:3000
```

### Available Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint

npx prisma migrate dev    # Run DB migrations (dev)
npx prisma db push        # Push schema without migration history
npx prisma studio         # Open visual DB browser
npx prisma generate       # Regenerate Prisma client
```

---

## Deployment

Deployed on **Vercel** with automatic deployments on every push to `main`.

### Vercel Setup

1. Connect this GitHub repository to a Vercel project
2. Add all environment variables in Vercel **Settings → Environment Variables**
3. Set `NEXTAUTH_URL` to your production domain (e.g. `https://your-app.vercel.app`)
4. Every `git push origin main` triggers an automatic redeploy

### Build Notes

- `postinstall` script automatically runs `prisma generate` on every deploy
- `DATABASE_URL` must use the **pooled** Supabase connection string for Vercel serverless functions
- `DIRECT_URL` is only needed for migrations, not used at runtime

---

## Integrations

### Meta Graph API (v21.0)

The `/api/meta/launch` route handles the full campaign creation flow:

1. Upload video → `POST /advideos`
2. Poll until video processing completes → `GET /{video_id}?fields=status`
3. Fetch first frame → `GET /{video_id}?fields=picture`
4. Re-upload frame as ad image → `POST /adimages` (returns stable `image_hash` for thumbnail)
5. Create campaign → `POST /act_{id}/campaigns`
6. Create ad set → `POST /act_{id}/adsets`
7. Create ad creative → `POST /act_{id}/adcreatives`
8. Create ad → `POST /act_{id}/ads`

**CBO (Campaign Budget Optimization) rules:**

| Mode | Budget location | `is_adset_budget_sharing_enabled` |
|------|----------------|----------------------------------|
| CBO | Campaign level | Omitted |
| Non-CBO | Ad Set level | `false` (required by Meta) |

**Friendly error messages** are returned for known Meta error subcodes:

| Subcode | Meaning |
|---------|---------|
| 4834002 | CBO + ad set budget conflict |
| 4834011 | Missing `is_adset_budget_sharing_enabled` |
| 1443226 | Missing video thumbnail |
| 2490408 | Invalid optimization goal for objective |
| 1885252 | Video still processing |

---

### Supabase (Two Projects)

| Project | Environment Variables | Used By |
|---------|-----------------------|---------|
| Main | `NEXT_PUBLIC_SUPABASE_URL` | Ad management, reports, approval queue, realtime updates |
| SocialDash | `NEXT_PUBLIC_SOCIAL_DASH_SUPABASE_URL` | Social-Dash tab only |

Realtime subscriptions are active on `your_name_table` for live ad generation status updates.

---

### n8n (Two Instances)

| Instance | Used By |
|----------|---------|
| `n8n.srv881198.hstgr.cloud` | Meta ad generation, campaigns, scraper, cleanup — proxied via `/api/trigger-n8n` |
| `n8n.srv1208919.hstgr.cloud` | Social media / SocialDash — direct calls from `SocialDash.tsx` |

n8n webhooks return structured JSON. The following response field names are fixed and must not be renamed:

```
executive_summary    competitor_analysis    gap_opportunities
ready_ad_scripts     action_plan            hook_analysis
market_insights      budget_recommendation
```

---

### ElevenLabs

AI voiceover for video ads. Available voices: **Markmont, John, Adhalina, Clara**. Fetched via `/api/elevenlabs/voices` and selected per ad before approval.

---

### NextAuth

JWT-based authentication with bcrypt password hashing. Credentials (email + password) stored in the Prisma `User` table. Login page at `/login`. The dashboard layout auth wall is currently disabled — all routes are unprotected.

---

## Styling Guide

Two parallel styling systems — do **not** mix them:

| Section | Method | Tokens / Classes |
|---------|--------|-----------------|
| Main Dashboard (`page.tsx`, `CampaignSetup.tsx`, `SocialDash.tsx`) | Inline styles only | CSS variables from `globals.css` (`var(--primary)`, `var(--card-bg)`, `var(--radius-lg)`, etc.) |
| Dashboard & Newsletter apps | Tailwind CSS + Radix UI | Standard Tailwind utility classes |

---

## License

Private — All rights reserved. Togahh Health © 2025.
