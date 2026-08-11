# Trinitas NextGen — Careers & Assessment Platform

Marketing site, candidate assessment, admin control center, and HR hiring pipeline.

**Live:** https://assessment.netlify.app/  
**Repo:** https://github.com/balahari13/Assessment

## Stack

- Static site on Netlify (`deploy/` publish directory)
- Serverless functions in `netlify/functions/`
- Netlify Blobs for candidates, results, resumes, pipeline, audit

## Build & deploy

```bash
npm install
npm run build   # build.mjs + smoke-test.mjs
```

Netlify: `npm install && npm run build` → publish `deploy/`.

Push to `main` triggers production deploy.

## Recommended environment variables (Netlify)

Set these in **Site settings → Environment variables** (production):

| Variable | Purpose |
|----------|---------|
| `ADMIN_ID` | Admin username (default fallback exists — override in prod) |
| `ADMIN_PASSWORD` | Admin password |
| `SITE_ADMIN_EMAIL` | Secondary admin email login |
| `SITE_ADMIN_PASSWORD` | Secondary admin password |
| `ADMIN_TOKEN_SECRET` | HMAC secret for admin session tokens |
| `ALLOWED_ORIGINS` | Comma-separated extra CORS origins |
| `SITE_URL` | Canonical site URL |
| `HR_INVITE_CODE` | Optional bootstrap invite for first HR user |
| `DEFAULT_MEET_LINK` | Google Meet room for interviews |
| `HIRING_WHATSAPP` | WhatsApp number (digits, country code) |

Rotate any passwords that were ever committed to git.

## Key URLs

| Path | Audience |
|------|----------|
| `/` | Marketing |
| `/careers.html` | Candidate signup / assessment entry |
| `/assessment.html` | Timed assessment (session required) |
| `/admin.html` | Admin control center |
| `/hr.html` | HR portal (invite-only registration) |
| `/healthcare.html` | Arise WFH onboarding help |
| `/privacy.html` | Privacy notice |

## Security model (current)

- Admin credentials from env when set
- HR registration requires **admin invite code**
- Candidate/HR passwords hashed with **scrypt** (legacy SHA-256 upgraded on login)
- Assessment objective sections **re-scored on the server**
- Resume downloads/deletes and sensitive actions **audit-logged**
- Admin dashboard UI hidden until login
- CORS origin allowlist (not open `*`)

## Roles

- **Admin** — full access: results, answer key, pipeline, resumes, candidates, HR invites, audit
- **HR** — pipeline + Google Meet interviews (no answer key)
- **Candidate** — account, resume, assessment attempts

## Hiring pipeline stages

Applied → HR screening → Assessment → Interview (Meet) → Decision → Hired / Closed

## Ops notes

- Monthly: export CSV from admin; review audit log
- Pause OTP: generate from admin Paused assessments
- Password reset: admin enables self-serve or sets temp password
- Reference IDs look like `TRI-2026-A3F91C`

## Local smoke

```bash
npm run smoke
```

Requires a prior `npm run build` so `deploy/` exists.
