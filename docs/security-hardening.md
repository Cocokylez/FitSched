# FitSched Security Hardening Notes

This app now has baseline API hardening for the current feature set: rate limits, same-origin mutation checks, safer input validation, security headers, server-side ownership checks, and safer AI plan handling.

## Manual Production Configuration

- Rotate any secret that was ever placed in a local `.env.example`, screenshot, log, chat, or committed file.
- Set `AUTH_SECRET`, `DATABASE_URL`, Google OAuth secrets, `GOOGLE_API_KEY`, VAPID keys, and `FIELD_ENCRYPTION_KEY` only in the deployment provider's server-side environment settings.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is intentionally public. Keep `VAPID_PRIVATE_KEY`, OAuth client secrets, API keys, and database credentials server-only.
- `FIELD_ENCRYPTION_KEY` is required before real users connect Google Calendar. Existing plaintext calendar tokens can still be read, but new tokens are encrypted when this key is set.
- The in-memory rate limiter in `src/lib/security.ts` is a safe development baseline. For production abuse prevention across serverless regions, replace the map with Redis, Upstash, Vercel KV, or another shared store.
- Restrict production OAuth callback URLs to the deployed domain only.
- Use least-privilege database credentials and enable automated backups in the database provider.

## Current Security Coverage

- Login and signup requests are rate limited at the NextAuth route.
- Authenticated API routes are rate limited per user, with stricter limits for expensive or write-heavy endpoints.
- Unauthenticated exercise reads use a stricter IP-based limit.
- Mutation endpoints check same-origin requests before reading request bodies.
- API JSON bodies have size limits and return safe errors for malformed JSON.
- Workout completion and token earning remain server-authoritative and tied to the authenticated user.
- User-owned resources are queried with `userId` checks before reads, updates, and deletes.
- AI workout plans use only server-fetched exercises and treat model output as untrusted data before writing to the database.
- Browser security headers are configured in `next.config.ts`, including CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and production HSTS.
- Passwords are hashed with bcrypt before storage.

## Not Present Yet

- No payment, billing, webhook, admin, or file-upload endpoints were found in the current app. Add signature checks, replay protection, MIME/type/size validation, and admin authorization before introducing those surfaces.
- No centralized alerting exists yet. Consider adding Sentry, Vercel log drains, or another monitor for failed logins, rate-limit spikes, permission denials, and unexpected API errors.

## Rate Limit Defaults

The default presets live in `src/lib/security.ts`:

- `auth`: login/signup callback protection.
- `unauthenticated`: stricter anonymous access.
- `read`: normal authenticated reads.
- `write`: normal authenticated writes.
- `strictWrite`: sensitive writes like workout completion, token earning, calendar sync, push send.
- `expensive`: AI/LLM plan generation.

Tune these values after seeing real traffic, and move them to a shared store before depending on them for production-scale protection.
