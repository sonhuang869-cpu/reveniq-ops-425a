# RevenIQ — Revenue Recognition & ASC 606 Compliance Platform

A production-quality B2B SaaS Revenue Recognition platform implementing FASB ASC 606 workflow management, contract performance obligation tracking, and revenue recognition scheduling.

## Features

### Contract Management
- Sortable, filterable contract table with TCV, status, recognized-to-date, deferred balance
- Contract creation with auto SSP allocation calculations
- Contract detail pages: header, PO panel, allocation table, recognition schedule timeline
- 12 seed contracts across 6 enterprise customers ($45K–$2.4M TCV)

### Performance Obligations Engine
- Per-contract PO list with SSP, type, and delivery period
- Automatic transaction price allocation using SSP ratios
- Over-time vs. point-in-time recognition toggle per PO
- Contract modifications with cumulative catch-up and prospective treatment

### Recognition Schedule
- 24-month waterfall chart (recognized vs deferred per PO)
- Portfolio-wide monthly recognition rollup
- Current period (Oct 2024) recognition with journal entry preview (Dr Deferred Revenue / Cr Revenue)
- Deferred revenue roll-forward: opening balance, additions, recognized YTD, ending balance

### Compliance Dashboard
- Portfolio KPIs: Total ARR, Recognized YTD, Deferred Balance, Active Contracts, Needs Attention
- ASC 606 five-step checklist per contract with green/amber/red status
- Contracts requiring attention panel
- Full audit trail with timestamped log of allocation changes and recognition events

### Revenue Analytics
- Monthly recognized revenue trend + cumulative YTD
- ARR by customer
- TCV by customer
- Revenue allocation by PO type (donut chart)
- Contract portfolio status breakdown table

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS (custom dark enterprise theme)
- React Router v6
- Recharts (all charts use real seed data)
- Lucide React icons
- Sonner (toasts)

## Setup

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build
npm run preview    # preview production build
```

## Routes

| Route | Page |
|-------|------|
| `/dashboard` | Compliance Dashboard (default) |
| `/contracts` | Contract list with sort/filter |
| `/contracts/new` | New contract form |
| `/contracts/:id` | Contract detail (Overview / Allocations / Schedule / Journal) |
| `/recognition` | Recognition Schedule |
| `/analytics` | Revenue Analytics |

## Data & Persistence

- 12 seed contracts with internally consistent allocations, recognized amounts, and deferred balances
- All KPI numbers are computed from the same seed data (no hardcoded widgets)
- Contract creates/edits persist to localStorage; page refresh retains all changes
- "Reset Demo" button on the dashboard restores original seed data

## Deployment

Configured for Vercel SPA deployment with `vercel.json` rewrite rule (all routes → `index.html`).

```bash
vercel --prod
```

## Assumptions

- Reporting date: October 31, 2024; fiscal year starts January 1, 2024
- All monetary values in USD
- Recognition calculations use straight-line amortization for over-time POs
- Point-in-time POs recognize 100% at the delivery milestone date
