# Launch Checklist — Undaunted Treasure Trove

The brand identity has already been wired into the codebase. This file
lists everything that's still required (or worth double-checking) before
going live.

---

## 1. Brand identity (already applied)

These values are baked in as fallbacks across `lib/site-defaults.ts`,
`context/CMSContext.tsx`, `package.json`, `public/manifest.json`,
`README.md`, `LICENSE`, the homepage hero, the About page, and `.env.example`:

- **Brand name:** Undaunted Treasure Trove
- **Wordmark (script font):** Undaunted TT
- **Tagline:** Curated jewelry from Adenta, Ghana
- **Location:** Adenta, Greater Accra, Ghana
- **Phone (display):** 0550244386
- **Phone (E.164):** +233550244386
- **WhatsApp:** https://wa.me/233550244386
- **Instagram:** https://www.instagram.com/undaunted_tt/  (`@undaunted_tt`)
- **TikTok:** https://www.tiktok.com/@undaunted_tt  (`@undaunted_tt`)
- **Snapchat:** https://www.snapchat.com/add/ab_nah  (`ab_nah`)
- **Currency:** GHS (`GH₵`)
- **SMS sender ID:** UNDAUNTEDTT
- **SKU prefix:** UTT
- **Default domain (placeholder):** `https://undauntedtreasuretrove.com`

> If you secure a different domain, run a global find-and-replace for
> `undauntedtreasuretrove.com` and update the `NEXT_PUBLIC_APP_URL`
> env var on your deployment platform.

## 2. Confirm or replace

- [ ] **Domain** — confirm `undauntedtreasuretrove.com` is the actual
      site URL, or replace it (`README.md`, `LICENSE`,
      `public/robots.txt`, `app/sitemap.ts`, `app/robots.ts`,
      `app/layout.tsx`, `components/SEOHead.tsx`,
      `app/(store)/product/[slug]/ProductDetailClient.tsx`,
      `SMS_INTEGRATION_STATUS.md`, `package.json`).
- [ ] **Contact email** — `info@undauntedtreasuretrove.com` is a
      placeholder; confirm or set a real address (also update
      `ADMIN_EMAIL` and `EMAIL_FROM` in `.env.local`).
- [ ] **GitHub repo URL in `package.json`** — replace `YOUR_USERNAME`
      with the actual GitHub owner.
- [ ] **Year in `LICENSE`** — set to current year if needed.

## 3. Environment variables

Copy `.env.example` to `.env.local`. Most values are already pre-filled
with the brand defaults — you mainly need to fill in the secrets:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — server-side service role key (never expose)
- [ ] `SUPABASE_PROJECT_REF` — Supabase project ref
- [ ] `RESEND_API_KEY` — Resend (transactional email)
- [ ] `MOOLRE_API_KEY`, `MOOLRE_API_USER`, `MOOLRE_API_PUBKEY`
- [ ] `MOOLRE_ACCOUNT_NUMBER`, `MOOLRE_MERCHANT_EMAIL`
- [ ] `MOOLRE_CALLBACK_SECRET` (mandatory in production — verifies callbacks are genuine)
- [ ] `MOOLRE_SMS_API_KEY` (or rely on `MOOLRE_API_KEY`)
- [ ] `CRON_SECRET` — auth for `/api/cron/*` endpoints
- [ ] `NEXT_PUBLIC_GA_MEASUREMENT_ID` (optional)
- [ ] `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` (optional)
- [ ] `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` / `RECAPTCHA_SECRET_KEY` (optional)

> Make sure `NEXT_PUBLIC_SMS_SENDER_ID=UNDAUNTEDTT` is **registered with Moolre**.
> Unregistered sender IDs are silently rejected by the SMS gateway.

## 4. Brand assets (see `public/ASSETS_GUIDE.md`)

All original images were deleted. Drop replacements at these paths:

- [ ] `/public/favicon.ico` (32×32 multi-resolution)
- [ ] `/public/apple-touch-icon.png` (180×180)
- [ ] `/public/icon-192.png` (192×192, referenced by `manifest.json`)
- [ ] `/public/icon-512.png` (512×512)
- [ ] `/public/logo.png` (used in About page, JSON-LD, email templates)
- [ ] `/public/about.jpeg` (About-page right-hand portrait — used in `WhoWeAreSection`)
- [ ] `/public/og-image.png` (1200×630 social share preview)
- [ ] `/public/hero-slide-1.png`, `/public/hero-slide-2.png`,
      `/public/hero-slide-3.png` (homepage slider, 1920×1080 minimum, jewelry photography)
- [ ] `/public/page-hero-1.png` … `/public/page-hero-5.png`
      (page heroes used by About, Shop, Wishlist, Shipping, Contact,
      Categories, Cart, Blog, FAQs, Help, Privacy, Terms — 1920×600 minimum)
- [ ] *(Optional)* a real `/public/logo.svg` if you want a vector
      logo in place of the Pacifico-script wordmark.

The `Logo` is currently rendered as a text wordmark (`Undaunted TT`) in
`Pacifico` font in `Header.tsx`, `Footer.tsx`, `PWASplash.tsx`, and
`PWAPrompt.tsx`. If you want a graphical logo, swap the `<span>` for an
`<Image src="/logo.svg" />` in those four components.

## 5. Database

- [x] Supabase project provisioned (`viwmktnlpwjyszkjfqrx`).
- [x] URL + keys wired into `.env.local`.
- [x] All migrations applied (31 tables, RLS enabled on every table,
      FK indexes covered, RLS policies use the `(SELECT auth.uid())`
      cached pattern). See `supabase/migrations/` for the full list.
- [x] Storage buckets created (`products`, `media`, `avatars`,
      `blog`, `reviews`) with hardened access policies — public buckets
      serve URLs but cannot be listed by anonymous users.
- [ ] **Create your first admin user** (the only manual step left):
      `npm run create-admin`
      (set `CREATE_ADMIN_EMAIL` and `CREATE_ADMIN_PASSWORD` first, or
      pass them inline). Once created, sign into `/admin/login`.
- [ ] Populate the `categories` and `products` tables with your real
      jewelry catalogue — the homepage and shop pages auto-render
      from Supabase, replacing the hardcoded mock data inside
      `components/AdvancedSearch.tsx`, `components/CartSuggestions.tsx`,
      `components/SmartRecommendations.tsx`, and `components/MobileSearchOverlay.tsx`.

## 6. Legal & policy pages

The pages below currently contain generic placeholder copy. Update them
with text that reflects your actual policies before launch.

- [ ] `app/(store)/privacy/page.tsx` — privacy policy
- [ ] `app/(store)/terms/page.tsx` — terms of service
- [ ] `app/(store)/shipping/page.tsx` — shipping zones, fees, timelines
- [ ] `app/(store)/returns/page.tsx` — returns / exchange policy
- [ ] `app/(store)/about/page.tsx` — extended brand story (CTA already
      reads "Ready to find your next treasure?")

## 7. SEO

- [ ] Verify Google Search Console
      (`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`).
- [ ] Add an Open Graph image at `/public/og-image.png`.
- [ ] Confirm `app/sitemap.ts` resolves once products + categories are
      seeded.
- [ ] If you change the domain, update every `https://undauntedtreasuretrove.com`
      reference (see "Confirm or replace" above).

## 8. Deployment

- [ ] See `DEPLOY_VERCEL_NEW.md` for Vercel CLI setup.
- [ ] See `VERCEL_404_FIX.md` if your first deploy 404s on the homepage.
- [ ] Configure your custom domain in Vercel and update
      `NEXT_PUBLIC_APP_URL` to match.
- [ ] Set every env var from section 3 in your deployment platform.
- [ ] Configure Moolre callback URL on the Moolre dashboard:
      `https://undauntedtreasuretrove.com/api/payment/moolre/callback`
- [ ] Run a security audit using `SECURITY_AUDIT_PROMPT.md` before launch.

## 9. Optional cleanup

- [ ] Delete this file (`CUSTOMIZE.md`) once everything above is done.
- [ ] Delete `public/ASSETS_GUIDE.md` once you've added every required asset.
- [ ] Delete `SECURITY_AUDIT_PROMPT.md` if you don't plan to re-run the audit.

---

## What was done in the sanitization pass

For reference, the prior pass removed every trace of the original
codebase owner (a different brand) — wordmark, social handles, deployment
domain, real Supabase project ID, real Moolre API user ID, build logs
that leaked the original developer's filesystem path, all branded image
assets, every `readdy.ai/api/search-image` mock-data URL, the original
`LICENSE` file, two original sales-proposal markdown documents, and the
Supabase CLI cache. The codebase has now been re-imprinted with the
**Undaunted Treasure Trove** identity in this pass.
