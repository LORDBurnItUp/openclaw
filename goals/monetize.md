# Monetize — AI Infrastructure Revenue Goal

## Objective

Generate recurring, scalable revenue by selling **infrastructure**, not agents. This goal defines the full process for wiring payments, ads, API billing, and template sales into any AI product built on the GOTCHA framework.

Core philosophy: **NEVER sell agents. SELL INFRASTRUCTURE.**

An agent is a one-time engagement. Infrastructure is a subscription. Infrastructure has switching costs, compounding data moats, and 10x the LTV.

---

## The Infrastructure-First Framework

### Why Infrastructure Beats Agents for Revenue

| Model | Revenue Type | LTV | Defensibility |
|-------|-------------|-----|---------------|
| Agent freelancing | One-time | Low | None |
| SaaS infrastructure | Recurring | High | High (switching costs) |
| API metered billing | Usage-based | Scales with usage | Medium (integration lock-in) |
| Template/framework sale | One-time + community | Medium | Medium (authority) |

**The compounding argument:** Every paying user who joins a SaaS product permanently adds to MRR. Every agent project starts at $0 when it ends. Infrastructure compounds. Agents reset.

**The defensibility argument:** When a user's data lives in your database, their team is trained on your UI, and their workflows depend on your API — leaving costs more than staying. Agents create zero switching costs.

**The positioning argument:** "I built you an AI agent" positions you as a service provider. "This infrastructure powers your AI operations" positions you as a platform. Platforms command higher prices and retain customers longer.

---

## Revenue Stream Setup

### Stream 1: Stripe Subscription (Recurring SaaS)

**Goal:** Wire a recurring monthly/annual billing system before any product launches.

#### Step-by-Step Configuration

**1. Create Products and Prices in Stripe Dashboard**

```
Dashboard → Products → Add Product

Product: [App Name] Pro
  Price 1: $9/month (recurring, monthly interval)
  Price 2: $90/year (recurring, annual interval — "2 months free")
  Metadata: tier=pro

Product: [App Name] Starter
  Price 1: $1/month (recurring, monthly interval)
  Metadata: tier=starter

Product: [App Name] Team
  Price 1: $29/month per seat (recurring, monthly, per_seat)
  Metadata: tier=team
```

**2. Retrieve Price IDs**

After creating, copy the `price_` IDs. These go into:
- `.env` as `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_TEAM`
- Used by `tools/payments/create_checkout.py` at runtime

**3. Configure Checkout Session**

Use `tools/payments/create_checkout.py` to generate a hosted checkout URL:

```python
# tools/payments/create_checkout.py
# Parameters: price_id, customer_email, success_url, cancel_url
# Returns: checkout session URL
# User lands on Stripe-hosted page → enters card → redirects to success_url
```

**4. Handle Webhooks**

Deploy a webhook endpoint at `/api/stripe/webhook`. Use `tools/payments/handle_webhook.py`:

```
Events to handle:
- checkout.session.completed → provision user access
- customer.subscription.updated → update plan in DB
- customer.subscription.deleted → revoke access, send churn email
- invoice.payment_failed → send retry reminder, grace period logic
```

**5. Wire to Frontend**

In the Next.js Pricing component, each plan's CTA button calls:

```typescript
// POST /api/stripe/create-checkout
// Body: { priceId: string, email: string }
// Response: { url: string }
// Then: router.push(url) — sends user to Stripe checkout
```

**6. Self-Serve Portal**

Enable Stripe Customer Portal so users can upgrade, downgrade, cancel without contacting you:

```
Stripe Dashboard → Settings → Billing → Customer Portal → Enable
```

Wire a "Manage Subscription" button in the user dashboard to:
```
POST /api/stripe/portal → returns portal session URL → redirect
```

---

### Stream 2: Google AdSense (Ad-Supported Free Tier)

**Goal:** Monetize free-tier users who don't convert to paid through ad revenue.

#### Integration in Next.js

**1. Get Publisher ID**

Apply at `adsense.google.com`. Once approved, you receive:
```
Publisher ID: ca-pub-XXXXXXXXXXXXXXXX
```

**2. Add Script to `layout.tsx`**

```tsx
// app/layout.tsx
import Script from 'next/script'

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

**3. Ad Placement Strategy**

For SaaS/dev tools targeting AI builders, highest-performing placements:

| Placement | Format | Expected RPM |
|-----------|--------|-------------|
| Below hero section (public pages) | Responsive display | $10-15 |
| Between blog post sections | In-article | $12-18 |
| Sidebar on dashboard (free tier only) | 300x250 | $8-12 |
| Footer (all public pages) | Leaderboard 728x90 | $5-8 |

**4. Ad Unit Component**

```tsx
// components/AdUnit.tsx
'use client'
import { useEffect } from 'react'

export function AdUnit({ slot, format = 'auto' }: { slot: string, format?: string }) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (e) {}
  }, [])

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  )
}
```

**5. Conditional Display**

Only show ads to free-tier users — never to paid subscribers. Check subscription status server-side before rendering ad components:

```tsx
// In page component
{user.tier === 'free' && <AdUnit slot="1234567890" />}
```

**6. Ad Density Rule**

Maximum 1 ad unit per 3 screens of content. Google enforces this; violating it risks account suspension.

---

### Stream 3: API Metered Billing (Per-Call Charging)

**Goal:** Charge users based on actual usage for API-exposed infrastructure.

#### Stripe Metered Billing Setup

**1. Create Metered Price**

```
Stripe Dashboard → Products → Add Product

Product: OpenClaw API
  Price: $0.001 per unit (metered, per_unit)
  Billing scheme: per_unit
  Usage type: metered
  Aggregate usage: sum
  Interval: monthly
```

**2. Create Subscription with Metered Item**

When user signs up for API access, create a subscription with the metered price attached (no quantity — Stripe tracks via usage records).

**3. Record Usage After Each API Call**

In `tools/payments/record_usage.py`:

```python
# After every API call completes successfully:
stripe.SubscriptionItem.create_usage_record(
    subscription_item_id,  # stored per user in DB
    quantity=1,            # number of API calls
    timestamp=int(time.time()),
    action='increment'
)
```

**4. Apply Call Limits**

Free tier: 1,000 calls/month hard limit (tracked in SQLite, blocked at limit)
Starter: 10,000 calls/month
Pro: Unlimited (flat rate)
API-only: Metered (no cap, bill for all usage)

---

### Stream 4: Template and Framework Sales (One-Time)

**Goal:** Package and sell the GOTCHA framework configuration, starter kits, and workflow templates.

#### Platforms

| Platform | Best For | Fee | Payout |
|----------|----------|-----|--------|
| Gumroad | Simple files, dev tools | 10% | Instant |
| LemonSqueezy | SaaS-style products | 5% + $0.50 | Instant |
| Paddle | International, tax handled | ~5% | Weekly |

#### What to Package and Price

| Product | Price | Contents |
|---------|-------|----------|
| GOTCHA Starter Kit | $97 | Full directory structure, manifest templates, 5 example goals |
| OpenClaw VIP Config | $197 | This repo's architecture, all tools wired up |
| AI Revenue Blueprint | $297 | This goal file + monetization_strategy.md + Stripe setup walkthrough |
| VoxCode SaaS Template | $497 | Full Next.js + Stripe + Supabase starter |

#### Delivery

- Upload ZIP to Gumroad/LemonSqueezy
- Webhook from platform → `tools/notify/send.py` → Slack alert on sale
- Optional: auto-email buyer with getting started guide

---

## The 7-Step AI Money Generation Process

### Step 1: Identify the Infrastructure Need

**Research tool:** `tools/research/market_gap.py`

Questions to answer:
- What do AI builders do repeatedly that wastes time?
- What infrastructure is missing that teams pay for?
- What workflow exists in expensive enterprise tools but not for indie builders?

Signals of a real infrastructure need:
- People are using spreadsheets for something that should be a database
- Developers are rebuilding the same boilerplate across every project
- Existing solutions cost $500+/month (room to undercut)
- The process can be defined deterministically (makes it a tool, not a consulting gig)

Output: A one-sentence problem statement and estimated market size.

---

### Step 2: Build the Tool Layer (GOTCHA `tools/`)

**Do not build a product yet. Build a tool that solves the problem deterministically.**

- Create the script in `tools/[workflow]/tool_name.py`
- One job per script
- Add it to `tools/manifest.md` immediately
- Test it against real data

At this stage, you have a tool — not a product. The tool is infrastructure. The product is the wrapper around it.

---

### Step 3: Wrap in Product (Next.js with Pricing Component)

**Build the minimum viable product surface:**

1. Landing page with clear value proposition (1 pain, 1 solution, 1 CTA)
2. Pricing component with 3 tiers (always 3 — psychological anchor)
3. Dashboard for authenticated users
4. API endpoint that calls your tool layer

Do not over-engineer the UI. The tool is the product. The UI is just access control.

Use `goals/build_app.md` (ATLAS workflow) for this step.

---

### Step 4: Wire Stripe BEFORE Launch

**No product goes live without a payment link.**

Common mistake: "I'll add payments later." Later never comes. Or worse — you get traction and have to retrofit payments into a product that wasn't designed for it.

Checklist before any launch:
```
[ ] Stripe products and prices created
[ ] Price IDs in .env
[ ] create_checkout.py tested end-to-end
[ ] Webhook endpoint deployed and verified in Stripe dashboard
[ ] Success/cancel URLs returning correct states
[ ] User provisioning logic fires on checkout.session.completed
[ ] Test payment completed with Stripe test card (4242 4242 4242 4242)
```

---

### Step 5: Add AdSense to All Public Pages

**Every public page that doesn't have a paywall should have AdSense.**

This monetizes:
- Users who arrive from SEO and never sign up
- Free-tier users who use the product but don't convert
- Blog/docs traffic

Add the AdSense script to `layout.tsx` before any page goes live. The script must be present from day one so Google can start crawling and learning your site's content patterns.

Expected timeline: AdSense approval takes 1-4 weeks. Apply immediately.

---

### Step 6: Automate Operations (Tools Run Themselves)

**Once wired, the system should collect revenue without manual intervention.**

Automation checklist:
```
[ ] Stripe webhooks provision/revoke access automatically
[ ] Failed payment emails sent automatically (Stripe Dunning)
[ ] API usage recorded per call automatically
[ ] Revenue reported to Slack daily via tools/notify/send.py
[ ] Churn detected and logged automatically
[ ] New sale notification fires within 60 seconds of payment
```

At this point, the infrastructure is live. You collect money while building the next thing.

---

### Step 7: Expose as API + Document as Sellable Blueprint

**Double-dip: sell the product AND sell the knowledge of how you built it.**

1. Add API endpoints with API key authentication
2. Write up the architecture as a Gumroad product
3. Publish a blog post (SEO + AdSense)
4. List on Product Hunt, Hacker News, or Twitter

The blueprint is worth more than most people think. Developers will pay $50-300 for a working implementation they can learn from and adapt.

---

## Quick Revenue Wins (Immediate Actions)

These are things you can do today without building anything new.

### 1. Wire Existing Pricing Component to Stripe Checkout

If a Pricing component exists in the codebase:
- Create Stripe products and prices (10 minutes)
- Add `STRIPE_SECRET_KEY` and `STRIPE_PRICE_*` to `.env`
- Deploy `tools/payments/create_checkout.py`
- Wire the CTA buttons to `POST /api/stripe/create-checkout`
- Test with test card

**Time to first revenue: 2-4 hours.**

### 2. Add AdSense Publisher ID to `layout.tsx`

- Apply for AdSense (15 minutes)
- Add `<Script>` tag to `app/layout.tsx`
- Add ad units to public pages

**Time to first ad revenue: 1-4 weeks (approval lag), then passive.**

### 3. Set Up Revenue Tracking in SQLite

Track every revenue event from day one. Use the schema below.

**Time: 30 minutes.** Use `tools/revenue/track.py`.

---

## Tools to Use

### Required Tool Directory: `tools/payments/`

Create these scripts if they do not exist:

| Script | Purpose |
|--------|---------|
| `tools/payments/create_checkout.py` | Generate Stripe Checkout Session URL |
| `tools/payments/handle_webhook.py` | Process Stripe webhook events |
| `tools/payments/create_portal.py` | Generate Stripe Customer Portal session |
| `tools/payments/record_usage.py` | Submit metered API usage records to Stripe |
| `tools/payments/get_subscription.py` | Look up a user's current subscription status |
| `tools/payments/cancel_subscription.py` | Cancel a subscription with optional reason |

### Supporting Tools

| Script | Purpose |
|--------|---------|
| `tools/revenue/track.py` | Write revenue events to SQLite |
| `tools/revenue/report.py` | Query and summarize MRR, churn, ARPU |
| `tools/notify/send.py` | Send alerts to Slack (new sale, churn, milestone) |

### Manifest Requirement

Every tool created must be added to `tools/manifest.md` with a one-sentence description. This is non-negotiable.

---

## Revenue Tracking Schema

Store every revenue event in `data/revenue.db`:

```sql
-- Core revenue events
CREATE TABLE IF NOT EXISTS revenue_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type  TEXT NOT NULL,           -- 'subscription_started', 'subscription_renewed', 'subscription_cancelled', 'refund', 'api_usage', 'template_sale'
    amount_cents INTEGER NOT NULL,       -- always store in cents to avoid float issues
    currency    TEXT DEFAULT 'usd',
    user_id     TEXT,                    -- internal user ID
    stripe_id   TEXT,                    -- Stripe event ID for dedup
    product     TEXT,                    -- 'starter', 'pro', 'team', 'api', 'template'
    source      TEXT,                    -- 'stripe', 'gumroad', 'lemonsqueezy'
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata    TEXT                     -- JSON blob for anything else
);

-- Subscribers snapshot for MRR calculation
CREATE TABLE IF NOT EXISTS subscribers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         TEXT UNIQUE NOT NULL,
    email           TEXT,
    plan            TEXT NOT NULL,       -- 'starter', 'pro', 'team'
    status          TEXT NOT NULL,       -- 'active', 'past_due', 'cancelled', 'trialing'
    mrr_cents       INTEGER NOT NULL,    -- monthly recurring revenue this subscriber contributes
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    started_at      DATETIME,
    cancelled_at    DATETIME,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- API usage for metered billing
CREATE TABLE IF NOT EXISTS api_usage (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         TEXT NOT NULL,
    endpoint        TEXT NOT NULL,       -- which API endpoint was called
    calls           INTEGER DEFAULT 1,
    recorded_stripe INTEGER DEFAULT 0,  -- 1 if submitted to Stripe usage record
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily MRR snapshots for trend tracking
CREATE TABLE IF NOT EXISTS mrr_snapshots (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT NOT NULL UNIQUE,   -- YYYY-MM-DD
    mrr_cents   INTEGER NOT NULL,
    subscribers INTEGER NOT NULL,
    new_mrr     INTEGER DEFAULT 0,      -- MRR added this day
    churned_mrr INTEGER DEFAULT 0,      -- MRR lost this day
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## KPIs to Monitor

Track these weekly. Use `tools/revenue/report.py` to generate the report.

| KPI | Formula | Target |
|-----|---------|--------|
| MRR | Sum of all active subscriber `mrr_cents` / 100 | Growing month over month |
| MRR Growth Rate | (This month MRR - Last month MRR) / Last month MRR | 10-20% MoM |
| Conversion Rate | Paid subscribers / Total signups | 2-5% for free-to-paid SaaS |
| ARPU | MRR / Active subscribers | Higher = better tier mix |
| Churn Rate | Cancelled MRR / Start-of-month MRR | Under 5% monthly |
| LTV | ARPU / Churn Rate | Should be 3x+ CAC |
| API Revenue | Sum of api_usage where recorded_stripe = 1 | Separate line from SaaS MRR |
| AdSense RPM | From AdSense dashboard | $8-15 for AI/dev audience |

Run the report daily via cron or manually:

```bash
python tools/revenue/report.py --period 30days --format slack
```

---

## Edge Cases

### Failed Payments

**What happens:** Stripe retries automatically (Smart Retries). After 3-4 failed attempts, subscription moves to `past_due`.

**What you do:**
- On `invoice.payment_failed`: send in-app notification + email
- Give 7-day grace period (full access maintained)
- On `customer.subscription.deleted` (after grace period): revoke access, mark user as `cancelled` in DB

**Do not** immediately revoke access on first failed payment. This is a churn accelerant.

### Refunds

**Policy:** Default to 7-day no-questions-asked refund for monthly plans.

**Process:**
1. User requests refund (email or in-app form)
2. Issue refund via `stripe.Refund.create(charge_id=...)`
3. Log `refund` event in `revenue_events` with negative `amount_cents`
4. Revoke access immediately on refund
5. Record in `subscribers` table as `cancelled`

**Stripe will subtract refunds from your payout automatically.** No manual accounting needed.

### Fraud and Chargebacks

**Signals:** Multiple accounts from same IP, high-velocity API usage after first payment, card testing patterns.

**Mitigations:**
- Enable Stripe Radar (free, on by default)
- Add rate limiting on API endpoints (100 req/min per API key)
- Block disposable email domains on signup
- Require email verification before provisioning API access

**If chargeback occurs:**
- Stripe sends `charge.dispute.created` webhook
- Respond with evidence (usage logs, IP records, email timestamps)
- Log in `revenue_events` as `chargeback` with the disputed amount

---

## Related Files

- **Context:** `context/monetization_strategy.md` (pricing psychology, AdSense patterns, Stripe architecture)
- **Tools:** `tools/payments/` directory, `tools/revenue/`, `tools/notify/`
- **Goals:** `goals/build_app.md` (for building the product wrapper)
- **Manifest:** `goals/manifest.md` (this goal is listed there)

---

## Changelog

| Date | Change |
|------|--------|
| 2026-03-04 | Initial goal created |
