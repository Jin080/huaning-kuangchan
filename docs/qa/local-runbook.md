# Local Runbook

## T47 Recommended Local Entry

- Backend: `http://127.0.0.1:3101`
- Frontend: `http://127.0.0.1:5173`
- Frontend API base: same-origin `/api`
- Vite proxy target: `http://127.0.0.1:3101`, preserving `/api/**`

Start backend:

```powershell
Set-Location E:/kuangchan/backend
npm run start
```

Start frontend:

```powershell
Set-Location E:/kuangchan/frontend
npm run dev
```

Acceptance URLs:

- Enterprise login: `http://127.0.0.1:5173/login`
- Admin login: `http://127.0.0.1:5173/admin/login`
- Enterprise center: `http://127.0.0.1:5173/account`
- Admin dashboard: `http://127.0.0.1:5173/admin/dashboard`

Production-like auth path:

- Use `Authorization: Bearer <accessToken>` from `POST /api/auth/login`.
- Do not set `DEV_AUTH_HEADERS_ENABLED` or `VITE_DEV_AUTH_HEADERS_ENABLED`.

Legacy development header mode:

```powershell
$env:DEV_AUTH_HEADERS_ENABLED='true'
$env:VITE_DEV_AUTH_HEADERS_ENABLED='true'
```

Use this mode only for local historical integration scripts. Bearer JWT remains the formal acceptance path.
