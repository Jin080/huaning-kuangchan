# Huaning Mineral Auction Backend

NestJS backend foundation for the Huaning mineral auction platform.

## Stack

- NestJS
- TypeScript
- Prisma
- PostgreSQL

SQLite is not used. Configure PostgreSQL with `DATABASE_URL` as shown in `.env.example`.

## Scripts

```powershell
npm install
npm run lint
npm run typecheck
npm test
npm run start:dev
```

Health check:

```text
GET /api/health
```

## Module Boundary

This foundation only contains common response/error helpers, health check, auth/role guard placeholders, file policy placeholders, and operation logging placeholders. Business modules such as lots, enterprises, deposits, bids, results, contracts, refunds, blacklist, and contents are intentionally not implemented here.
