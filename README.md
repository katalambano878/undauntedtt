# Undaunted Treasure Trove

> Curated jewelry from Adenta, Ghana.

A Next.js 15 e-commerce storefront with admin dashboard, Supabase backend,
Moolre payment + SMS integration, and Resend email notifications.

## Getting Started

```bash
npm install
cp .env.example .env.local   # then fill in any values you want to override
npm run dev                  # http://localhost:3001
```

## Branding (env)

The brand defaults are wired in already; the most common things you might
override per-environment are:

- `NEXT_PUBLIC_APP_URL` — canonical site URL (e.g. `https://undauntedtreasuretrove.com`)
- `NEXT_PUBLIC_WORDMARK` — `Undaunted TT` (rendered in script font)
- `NEXT_PUBLIC_SITE_NAME` — `Undaunted Treasure Trove`
- `NEXT_PUBLIC_SITE_TAGLINE` — `Curated jewelry from Adenta, Ghana`
- `NEXT_PUBLIC_CONTACT_EMAIL` / `NEXT_PUBLIC_CONTACT_PHONE` /
  `NEXT_PUBLIC_CONTACT_WHATSAPP` / `NEXT_PUBLIC_CONTACT_ADDRESS`

See `.env.example` for the full list (Supabase, Resend, Moolre, analytics, etc.).

## Customize before launch

See [`CUSTOMIZE.md`](./CUSTOMIZE.md) for the full launch checklist
(assets to add, env vars to set, legal pages to write, etc.).

## Stack

- Next.js 15 (App Router) + React 19
- Supabase (Postgres + Auth + Storage)
- Tailwind CSS
- Resend (transactional email)
- Moolre (Mobile Money payments + SMS — Ghana)

See `package.json` for the full list of scripts and dependencies.

## Deployment

Vercel is the recommended platform — see [`DEPLOY_VERCEL_NEW.md`](./DEPLOY_VERCEL_NEW.md)
for first-time setup and [`VERCEL_404_FIX.md`](./VERCEL_404_FIX.md) for
the most common deployment gotcha.

## License

Proprietary — all rights reserved by Undaunted Treasure Trove.
See [`LICENSE`](./LICENSE).
