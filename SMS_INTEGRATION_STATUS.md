# SMS & Payment Integration Reference

Notes for operators integrating the default Moolre payment + SMS provider.
Replace these instructions if you swap to a different provider.

## Required Environment Variables

### Supabase
| Variable | Purpose | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin operations | Yes |

### Moolre SMS
| Variable | Purpose | Required |
|----------|---------|----------|
| `MOOLRE_API_KEY` | VAS Key for SMS sending | Yes |
| `MOOLRE_API_USER` | API user ID | Yes |
| `MOOLRE_API_PUBKEY` | Public key for payment | Yes |

### Email (Optional but Recommended)
| Variable | Purpose | Required |
|----------|---------|----------|
| `RESEND_API_KEY` | Resend API key for emails | Optional |
| `EMAIL_FROM` | Sender address for emails | Optional |
| `ADMIN_EMAIL` | Admin notification email | Optional |

### Moolre Payment
| Variable | Purpose | Required |
|----------|---------|----------|
| `MOOLRE_ACCOUNT_NUMBER` | Payment account number | Yes |
| `MOOLRE_MERCHANT_EMAIL` | Merchant email | Yes |

### App Configuration
| Variable | Purpose | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_APP_URL` | Production URL (`https://undauntedtreasuretrove.com`) | Yes |

## Setup

1. Add `SUPABASE_SERVICE_ROLE_KEY` to your deployment platform.
2. Configure the Moolre callback URL to:
   `https://undauntedtreasuretrove.com/api/payment/moolre/callback`
   (this URL is derived automatically from `NEXT_PUBLIC_APP_URL`).
3. Verify SMS via the Admin → SMS Debugger page.

## How Notifications Work

### Order Placement Flow (Moolre Payment)
1. User completes checkout → Order created with `pending` status
2. User redirected to Moolre for payment
3. After payment, Moolre calls `/api/payment/moolre/callback`
4. Callback updates order status to `paid` and triggers notifications
5. Email and SMS sent to customer

### Manual Notification Resend
If automatic notification fails:
1. Admin → Orders → select an order
2. Click **Resend Notifications**
3. This will re-send email and SMS to the customer

## Troubleshooting

- **SMS not received** — check deployment logs for `[Callback]` entries,
  verify `SUPABASE_SERVICE_ROLE_KEY` is set, ensure the order has a phone
  number, fall back to admin **Resend Notifications**.
- **Callback not working** — confirm Moolre is hitting the correct callback
  URL, look for `[Callback] Received` in logs, verify `externalref` matches
  `ORD-...` order number format.
- **SMS API issues** — test via Admin → SMS Debugger, verify Moolre
  credentials, check phone-number formatting (auto-formatted to E.164).

## Files Involved

- `lib/notifications.ts` — email + SMS senders
- `app/api/payment/moolre/callback/route.ts` — payment callback handler
- `app/api/notifications/route.ts` — admin notification endpoint
- `app/admin/layout.tsx` — role-based admin access control
- `app/admin/orders/[id]/OrderDetailClient.tsx` — resend notifications UI
- `app/admin/orders/page.tsx` — bulk order updates with auth
