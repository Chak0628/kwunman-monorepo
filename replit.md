# 冠文鋼結構管理系統 (KwunMan OS)

香港冠文鋼結構工程公司的全域 ERP 管理系統，以「最後實收金額」為核心財務大數，提供工程監控、現金流管理及雙視角稅務分析。

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/kwunman-os run dev` — run the frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + Recharts
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- DB schema: `lib/db/src/schema/` (projects.ts, clients.ts, expenses.ts)
- API spec: `lib/api-spec/openapi.yaml`
- API routes: `artifacts/api-server/src/routes/`
- Frontend pages: `artifacts/kwunman-os/src/pages/`
- Tax quarter helpers: `artifacts/api-server/src/lib/quarter.ts`

## Architecture decisions

- **realReceived-first accounting**: All financial calculations use `finalReceived` as the single source of truth, not `quoteAmount`
- **Chain-clear logic**: If `status === '不成功'`, `finalReceived` is forced to 0 and all related statuses are cleared server-side
- **Dual tax quarter system**: Each project stores both `taxQuarterKwunman` (natural year Q1-Q4) and `taxQuarterGov` (HK fiscal year Apr-Mar)
- **PostgreSQL over Firebase**: Chosen for stability, transactional integrity, and Replit-native support
- **Contract-first API**: OpenAPI spec → Orval codegen → typed React Query hooks; no hand-written fetch calls

## Auth System

- Signed cookie sessions via `cookie-parser` (SESSION_SECRET env var required)
- Cookie name: `kwunman_auth` (httpOnly, signed, 30-day expiry)
- 3 roles: 管理者 (full access + delete), 參與者 (same but no delete), 員工 (own schedule + payslips only)
- Demo accounts:
  - `admin` / `admin123` → 管理者
  - `partner1` / `partner123` → 參與者
  - `worker1` / `worker123` → 員工
- Auth middleware: `requireAuth`, `requireRole(...)` in `artifacts/api-server/src/lib/auth.ts`
- Frontend: `AuthContext` in `artifacts/kwunman-os/src/contexts/AuthContext.tsx`

## Product

11 pages in Traditional Chinese:
Admin/Partner sidebar (10 items):
1. 管理總覽 (/) — KPI cards + 5-tab panel (活躍/報銷/完工/報價/待收)
2. 工程項目 (/projects) — Full project list with dual tax-quarter toggle and filters
3. 智能報價 (/new-quote) — Auto-incremented quote ID, creates new project
4. 客戶資料庫 (/clients) — Client contact management
5. 成本利潤分析 (/profit) — Quarterly profit charts (totalReceived vs totalQuoted)
6. 支出報銷 (/expenses) — Expense claims with approval workflow
7. 薪資管理 (/payroll) — Employee payslips with printable PDF download
8. 單據生成 (/documents) — Stub page (coming soon)
9. 系統設定 (/settings) — Account info + change password
10. 員工帳戶管理 (/users) — Admin only: create/edit/delete user accounts

Employee sidebar (3 items):
1. 更表 (/schedule) — Monthly calendar view of own work schedule
2. 糧單 (/payslips) — View and download own payslips as PDF
3. 設定 (/settings) — Change password

## User preferences

- UI entirely in Traditional Chinese (繁體中文)
- No emojis in UI
- Amounts formatted as HKD (HK$1,234,567)

## Gotchas

- Run codegen after every OpenAPI spec change: `pnpm --filter @workspace/api-spec run codegen`
- The `projects.next-id` and `projects.quarterly-stats` routes must come BEFORE `projects/:projectId` in Express router
- Seeded 97 real historical projects from Excel file `attached_assets/冠文-工作表_2.4.2026_(1)_1779590078498.xlsx`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
