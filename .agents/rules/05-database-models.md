# Database Models & Migration Discipline

> **SCOPE**: `packages/db`, Prisma schemas, Mongoose models, and migrations.

---

## 1. Dynamic Lookups vs Enums

### Dynamic Lookup Schema Blueprint
All dynamic lookup tables must adhere to this standard Prisma schema:
```prisma
model ProjectStatus {
  id             String   @id @default(uuid()) @db.Uuid
  code           String   @unique
  name           String
  requiresAction Boolean  @default(false) @map("requires_action")
  isTerminal     Boolean  @default(false) @map("is_terminal")
  sortOrder      Int      @default(0) @map("sort_order")
  color          String?
  isActive       Boolean  @default(true) @map("is_active")
  createdAt      DateTime @default(now()) @map("created_at")

  @@map("project_statuses")
}
```

### Invariant Rules:
1. **Never branch code on lookup string `code` or `name`.** Always branch on boolean/numeric flags (`isTerminal`, `requiresAction`, `qualifiesForTeamScope`, `level`).
2. **Fixed engine enums only**: `SystemRole`, `ScopeResolutionStrategy`, `MessageStatus`, `AttachmentEntity`, `ThreadDirection`.
3. **No hard deletes**: Use `deletedAt`, `leftAt`, `unassignedAt`, or `revokedAt`.
4. **Append-only log tables**: `platform_thread_messages` is strictly append-only.

---

## 2. Seed Data & Migrations

- Every new lookup table must include default seed data in the seed runner scripts.
- Schema changes in `packages/db/prisma/schema/*.prisma` must generate clean migration files.
