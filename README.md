# Town Central HOA Platform

Resident and board portal for Town Central HOA.

- Frontend: React + Vite (Vercel)
- Backend: Express on Cloud Run
- Database: Neon Postgres
- Files: Cloudflare R2
- Email: Zoho SMTP

## Local setup

1. Copy env templates and fill in real values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

2. Required backend keys: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, Cloudflare R2 keys, and Zoho `EMAIL_USER` / `EMAIL_PASS`.

3. Required frontend key: `VITE_API_URL=http://localhost:8080`

4. Install and run:

```bash
cd backend && npm install && npm start
cd frontend && npm install && npm run dev
```

Open http://localhost:5173. Production frontend is https://towncentralhoa.org.

Cloud Run also needs `JWT_SECRET` and `FRONTEND_URL=https://towncentralhoa.org`.

## Auth

Login issues a JWT. The browser stores it and sends `Authorization: Bearer` on API calls. Board-only routes require `role` of `board_member` or `super_admin`. Refresh keeps you signed in.

## Notes

Dues can be paid by bank bill-pay or check. Online card/ACH checkout is not used.
