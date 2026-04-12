DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoleScopeType') THEN
    CREATE TYPE "RoleScopeType" AS ENUM ('GLOBAL', 'COMPANY', 'VENDOR');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "permissions" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "permissions_code_key"
  ON "permissions"("code");
CREATE INDEX IF NOT EXISTS "permissions_is_active_idx"
  ON "permissions"("is_active");

CREATE TABLE IF NOT EXISTS "role_permissions" (
  "id" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "permission_id" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_permission_id_fkey'
  ) THEN
    ALTER TABLE "role_permissions"
      ADD CONSTRAINT "role_permissions_permission_id_fkey"
      FOREIGN KEY ("permission_id") REFERENCES "permissions"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "role_permissions_role_permission_id_key"
  ON "role_permissions"("role", "permission_id");
CREATE INDEX IF NOT EXISTS "role_permissions_role_is_active_idx"
  ON "role_permissions"("role", "is_active");

CREATE TABLE IF NOT EXISTS "user_role_assignments" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "scope_type" "RoleScopeType" NOT NULL DEFAULT 'GLOBAL',
  "company_id" TEXT,
  "vendor_id" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "starts_at" TIMESTAMP(3),
  "ends_at" TIMESTAMP(3),
  "granted_by_user_id" TEXT,
  "grant_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_role_assignments_user_id_fkey'
  ) THEN
    ALTER TABLE "user_role_assignments"
      ADD CONSTRAINT "user_role_assignments_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_role_assignments_company_id_fkey'
  ) THEN
    ALTER TABLE "user_role_assignments"
      ADD CONSTRAINT "user_role_assignments_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_role_assignments_vendor_id_fkey'
  ) THEN
    ALTER TABLE "user_role_assignments"
      ADD CONSTRAINT "user_role_assignments_vendor_id_fkey"
      FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_role_assignments_granted_by_user_id_fkey'
  ) THEN
    ALTER TABLE "user_role_assignments"
      ADD CONSTRAINT "user_role_assignments_granted_by_user_id_fkey"
      FOREIGN KEY ("granted_by_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "user_role_assignments"
  DROP CONSTRAINT IF EXISTS "user_role_assignments_scope_valid_chk";
ALTER TABLE "user_role_assignments"
  ADD CONSTRAINT "user_role_assignments_scope_valid_chk"
  CHECK (
    ("scope_type" = 'GLOBAL'::"RoleScopeType" AND "company_id" IS NULL AND "vendor_id" IS NULL)
    OR ("scope_type" = 'COMPANY'::"RoleScopeType" AND "company_id" IS NOT NULL AND "vendor_id" IS NULL)
    OR ("scope_type" = 'VENDOR'::"RoleScopeType" AND "vendor_id" IS NOT NULL AND "company_id" IS NULL)
  );

CREATE INDEX IF NOT EXISTS "user_role_assignments_user_id_is_active_idx"
  ON "user_role_assignments"("user_id", "is_active");
CREATE INDEX IF NOT EXISTS "user_role_assignments_role_is_active_idx"
  ON "user_role_assignments"("role", "is_active");
CREATE INDEX IF NOT EXISTS "user_role_assignments_scope_type_company_id_is_active_idx"
  ON "user_role_assignments"("scope_type", "company_id", "is_active");
CREATE INDEX IF NOT EXISTS "user_role_assignments_scope_type_vendor_id_is_active_idx"
  ON "user_role_assignments"("scope_type", "vendor_id", "is_active");
CREATE INDEX IF NOT EXISTS "user_role_assignments_granted_by_user_id_idx"
  ON "user_role_assignments"("granted_by_user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "user_role_assignments_unique_active_global_idx"
  ON "user_role_assignments"("user_id", "role")
  WHERE "is_active" = TRUE AND "scope_type" = 'GLOBAL'::"RoleScopeType" AND "company_id" IS NULL AND "vendor_id" IS NULL;

CREATE TABLE IF NOT EXISTS "auth_change_log" (
  "id" TEXT NOT NULL,
  "actor_user_id" TEXT,
  "target_user_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "old_value_json" JSONB,
  "new_value_json" JSONB,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_change_log_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auth_change_log_actor_user_id_fkey'
  ) THEN
    ALTER TABLE "auth_change_log"
      ADD CONSTRAINT "auth_change_log_actor_user_id_fkey"
      FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auth_change_log_target_user_id_fkey'
  ) THEN
    ALTER TABLE "auth_change_log"
      ADD CONSTRAINT "auth_change_log_target_user_id_fkey"
      FOREIGN KEY ("target_user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "auth_change_log_target_user_id_created_at_idx"
  ON "auth_change_log"("target_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "auth_change_log_actor_user_id_created_at_idx"
  ON "auth_change_log"("actor_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "auth_change_log_action_created_at_idx"
  ON "auth_change_log"("action", "created_at");

INSERT INTO "permissions" ("id", "code", "name", "description", "is_active")
VALUES
  ('perm-admin-full-access', 'admin.full_access', 'Admin Full Access', 'Full administrative access', TRUE),
  ('perm-users-role-manage', 'users.role.manage', 'Manage User Roles', 'Create and update system role assignments', TRUE),
  ('perm-vendors-approval-manage', 'vendors.approval.manage', 'Manage Vendor Approval', 'Approve or reject vendor onboarding', TRUE),
  ('perm-offers-approval-manage', 'offers.approval.manage', 'Manage Offer Approval', 'Approve or reject offers', TRUE),
  ('perm-companies-requests-manage', 'companies.requests.manage', 'Manage Company Requests', 'Review and action company access requests', TRUE),
  ('perm-finance-billing-manage', 'finance.billing.manage', 'Manage Billing', 'Configure vendor billing and plans', TRUE),
  ('perm-finance-invoices-manage', 'finance.invoices.manage', 'Manage Invoices', 'Review and manage invoice lifecycle', TRUE),
  ('perm-sales-pipeline-manage', 'sales.pipeline.manage', 'Manage Sales Pipeline', 'Access and manage sales pipeline views', TRUE),
  ('perm-vendor-portal-access', 'vendor.portal.access', 'Vendor Portal Access', 'Access vendor portal capabilities', TRUE),
  ('perm-employee-portal-access', 'employee.portal.access', 'Employee Portal Access', 'Access employee deals experience', TRUE)
ON CONFLICT ("code") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "is_active" = EXCLUDED."is_active",
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("id", "role", "permission_id", "is_active")
SELECT 'roleperm-admin-' || substr(md5(p."code"), 1, 16), 'ADMIN'::"UserRole", p."id", TRUE
FROM "permissions" p
ON CONFLICT ("role", "permission_id") DO UPDATE
SET "is_active" = TRUE, "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("id", "role", "permission_id", "is_active")
SELECT 'roleperm-finance-' || substr(md5(p."code"), 1, 16), 'FINANCE'::"UserRole", p."id", TRUE
FROM "permissions" p
WHERE p."code" IN ('finance.billing.manage', 'finance.invoices.manage')
ON CONFLICT ("role", "permission_id") DO UPDATE
SET "is_active" = TRUE, "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("id", "role", "permission_id", "is_active")
SELECT 'roleperm-sales-' || substr(md5(p."code"), 1, 16), 'SALES'::"UserRole", p."id", TRUE
FROM "permissions" p
WHERE p."code" IN ('sales.pipeline.manage', 'companies.requests.manage')
ON CONFLICT ("role", "permission_id") DO UPDATE
SET "is_active" = TRUE, "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("id", "role", "permission_id", "is_active")
SELECT 'roleperm-vendor-' || substr(md5(p."code"), 1, 16), 'VENDOR'::"UserRole", p."id", TRUE
FROM "permissions" p
WHERE p."code" IN ('vendor.portal.access')
ON CONFLICT ("role", "permission_id") DO UPDATE
SET "is_active" = TRUE, "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("id", "role", "permission_id", "is_active")
SELECT 'roleperm-user-' || substr(md5(p."code"), 1, 16), 'USER'::"UserRole", p."id", TRUE
FROM "permissions" p
WHERE p."code" IN ('employee.portal.access')
ON CONFLICT ("role", "permission_id") DO UPDATE
SET "is_active" = TRUE, "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "user_role_assignments" (
  "id", "user_id", "role", "scope_type", "is_active", "starts_at", "grant_reason", "created_at", "updated_at"
)
SELECT
  'ura-global-' || substr(md5(u."id" || ':' || u."role"::text), 1, 20),
  u."id",
  u."role",
  'GLOBAL'::"RoleScopeType",
  TRUE,
  COALESCE(u."created_at", CURRENT_TIMESTAMP),
  'backfill-from-users-role',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "users" u
WHERE NOT EXISTS (
  SELECT 1
  FROM "user_role_assignments" ura
  WHERE ura."user_id" = u."id"
    AND ura."role" = u."role"
    AND ura."scope_type" = 'GLOBAL'::"RoleScopeType"
    AND ura."company_id" IS NULL
    AND ura."vendor_id" IS NULL
    AND ura."is_active" = TRUE
);

UPDATE "user_role_assignments" ura
SET
  "is_active" = FALSE,
  "ends_at" = COALESCE(ura."ends_at", CURRENT_TIMESTAMP),
  "updated_at" = CURRENT_TIMESTAMP
FROM "users" u
WHERE ura."user_id" = u."id"
  AND ura."scope_type" = 'GLOBAL'::"RoleScopeType"
  AND ura."company_id" IS NULL
  AND ura."vendor_id" IS NULL
  AND ura."is_active" = TRUE
  AND ura."role" <> u."role";
