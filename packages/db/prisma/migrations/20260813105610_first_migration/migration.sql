-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('SuperAdmin', 'Admin', 'Staff');

-- CreateEnum
CREATE TYPE "ScopeResolutionStrategy" AS ENUM ('Global', 'OwnDepartment', 'OwnTeam', 'OwnProject', 'OwnProfile', 'ExplicitDepartments', 'ExplicitTeams', 'ExplicitProjects');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('Draft', 'Pending', 'Approved', 'Hold', 'Rejected', 'Delivered');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('NRI', 'WIP', 'Solve', 'Wrong');

-- CreateEnum
CREATE TYPE "GroupMemberSource" AS ENUM ('AutoManagement', 'AutoAssignment', 'Manual');

-- CreateEnum
CREATE TYPE "AttachmentEntity" AS ENUM ('project', 'message', 'issue', 'support_ticket', 'chat_message', 'platform_thread_message', 'bd_order');

-- CreateEnum
CREATE TYPE "ThreadDirection" AS ENUM ('Outbound', 'Inbound');

-- CreateTable
CREATE TABLE "bd_orders" (
    "id" UUID NOT NULL,
    "order_type_id" UUID NOT NULL,
    "platform_id" UUID,
    "team_id" UUID NOT NULL,
    "status_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "target_url" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "bd_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bd_order_assignments" (
    "id" UUID NOT NULL,
    "bd_order_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "bd_order_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_groups" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_group_members" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source" "GroupMemberSource" NOT NULL,
    "added_by" UUID,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),

    CONSTRAINT "project_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "content" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "edited_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_message_reads" (
    "id" UUID NOT NULL,
    "chat_message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_reads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "platform_id" UUID NOT NULL,
    "contact_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "platform_id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_sellers" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "shift" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMP(3),

    CONSTRAINT "profile_sellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issues" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "component_id" UUID,
    "author_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'NRI',
    "priority_id" UUID NOT NULL,
    "issue_type_id" UUID NOT NULL,
    "resolved_by" UUID,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_comments" (
    "id" UUID NOT NULL,
    "issue_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "ticket_ref" TEXT NOT NULL,
    "author_id" UUID NOT NULL,
    "status_id" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "issue_id" UUID,
    "author_id" UUID NOT NULL,
    "message_type_id" UUID NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'Draft',
    "current_content" TEXT NOT NULL,
    "point_value" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_revisions" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "edited_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_approvals" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "approver_id" UUID NOT NULL,
    "decision" "MessageStatus" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_thread_messages" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "direction" "ThreadDirection" NOT NULL,
    "source_message_id" UUID,
    "content" TEXT NOT NULL,
    "logged_by" UUID NOT NULL,
    "platform_timestamp" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_thread_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "entity_type" "AttachmentEntity" NOT NULL,
    "entity_id" UUID NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "notification_type_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "entity_type" TEXT,
    "entity_id" UUID,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delegations" (
    "id" UUID NOT NULL,
    "delegator_id" UUID NOT NULL,
    "delegatee_id" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delegations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "entity_table" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "actor_id" UUID NOT NULL,
    "on_behalf_of_id" UUID,
    "old_payload" JSONB,
    "new_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department_managers" (
    "id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMP(3),

    CONSTRAINT "department_managers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shift" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_service_lines" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "service_line_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_service_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_lines" (
    "id" UUID NOT NULL,
    "parent_service_line_id" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "service_line_id" UUID,
    "status_id" UUID NOT NULL,
    "order_id" TEXT NOT NULL,
    "project_name" TEXT NOT NULL,
    "value" DECIMAL NOT NULL,
    "order_sheet_url" TEXT,
    "start_date" TIMESTAMP(3),
    "delivery_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_components" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "project_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_team_assignments" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "project_team_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "component_team_assignments" (
    "id" UUID NOT NULL,
    "component_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "component_team_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_assignments" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "project_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "component_assignments" (
    "id" UUID NOT NULL,
    "component_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "component_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platforms" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_statuses" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "requires_action" BOOLEAN NOT NULL DEFAULT false,
    "is_terminal" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "priorities" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "color" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "priorities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_roles" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qualifies_for_team_scope" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignment_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_types" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "default_title_template" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_types" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_types" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket_statuses" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_terminal" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_ticket_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bd_order_types" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bd_order_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_scope_types" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "resolution_strategy" "ScopeResolutionStrategy" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_scope_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_groups" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_group_items" (
    "id" UUID NOT NULL,
    "permission_group_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "permission_group_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "employee_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "system_role" "SystemRole" NOT NULL DEFAULT 'Staff',
    "designation_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "device_info" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designations" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department_id" UUID NOT NULL,
    "hierarchy_level" INTEGER NOT NULL,
    "is_leadership" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "designations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designation_permissions" (
    "id" UUID NOT NULL,
    "designation_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "scope_type_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "granted_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "designation_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designation_permission_scope_targets" (
    "id" UUID NOT NULL,
    "designation_permission_id" UUID NOT NULL,
    "department_id" UUID,
    "team_id" UUID,
    "project_id" UUID,

    CONSTRAINT "designation_permission_scope_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permission_overrides" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "team_id" UUID,
    "project_id" UUID,
    "department_id" UUID,
    "granted_by" UUID NOT NULL,
    "reason" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_permission_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_absences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "covered_by" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_absences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bd_orders_order_type_id_idx" ON "bd_orders"("order_type_id");

-- CreateIndex
CREATE INDEX "bd_orders_team_id_idx" ON "bd_orders"("team_id");

-- CreateIndex
CREATE INDEX "bd_orders_status_id_idx" ON "bd_orders"("status_id");

-- CreateIndex
CREATE INDEX "bd_order_assignments_bd_order_id_user_id_idx" ON "bd_order_assignments"("bd_order_id", "user_id");

-- CreateIndex
CREATE INDEX "bd_order_assignments_role_id_idx" ON "bd_order_assignments"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_groups_project_id_key" ON "project_groups"("project_id");

-- CreateIndex
CREATE INDEX "project_group_members_group_id_user_id_idx" ON "project_group_members"("group_id", "user_id");

-- CreateIndex
CREATE INDEX "project_group_members_user_id_left_at_idx" ON "project_group_members"("user_id", "left_at");

-- CreateIndex
CREATE INDEX "chat_messages_group_id_created_at_idx" ON "chat_messages"("group_id", "created_at");

-- CreateIndex
CREATE INDEX "chat_messages_sender_id_idx" ON "chat_messages"("sender_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_message_reads_chat_message_id_user_id_key" ON "chat_message_reads"("chat_message_id", "user_id");

-- CreateIndex
CREATE INDEX "clients_name_idx" ON "clients"("name");

-- CreateIndex
CREATE INDEX "clients_platform_id_idx" ON "clients"("platform_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_platform_id_username_key" ON "profiles"("platform_id", "username");

-- CreateIndex
CREATE INDEX "profile_sellers_profile_id_user_id_idx" ON "profile_sellers"("profile_id", "user_id");

-- CreateIndex
CREATE INDEX "profile_sellers_profile_id_unassigned_at_idx" ON "profile_sellers"("profile_id", "unassigned_at");

-- CreateIndex
CREATE INDEX "issues_project_id_idx" ON "issues"("project_id");

-- CreateIndex
CREATE INDEX "issues_component_id_idx" ON "issues"("component_id");

-- CreateIndex
CREATE INDEX "issues_status_idx" ON "issues"("status");

-- CreateIndex
CREATE INDEX "issues_project_id_priority_id_status_idx" ON "issues"("project_id", "priority_id", "status");

-- CreateIndex
CREATE INDEX "issue_comments_issue_id_idx" ON "issue_comments"("issue_id");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticket_ref_key" ON "support_tickets"("ticket_ref");

-- CreateIndex
CREATE INDEX "support_tickets_project_id_idx" ON "support_tickets"("project_id");

-- CreateIndex
CREATE INDEX "support_tickets_status_id_idx" ON "support_tickets"("status_id");

-- CreateIndex
CREATE INDEX "messages_project_id_idx" ON "messages"("project_id");

-- CreateIndex
CREATE INDEX "messages_project_id_status_idx" ON "messages"("project_id", "status");

-- CreateIndex
CREATE INDEX "messages_author_id_idx" ON "messages"("author_id");

-- CreateIndex
CREATE INDEX "messages_issue_id_idx" ON "messages"("issue_id");

-- CreateIndex
CREATE INDEX "message_revisions_message_id_idx" ON "message_revisions"("message_id");

-- CreateIndex
CREATE INDEX "message_approvals_message_id_idx" ON "message_approvals"("message_id");

-- CreateIndex
CREATE INDEX "platform_thread_messages_project_id_platform_timestamp_idx" ON "platform_thread_messages"("project_id", "platform_timestamp");

-- CreateIndex
CREATE INDEX "platform_thread_messages_profile_id_idx" ON "platform_thread_messages"("profile_id");

-- CreateIndex
CREATE INDEX "platform_thread_messages_source_message_id_idx" ON "platform_thread_messages"("source_message_id");

-- CreateIndex
CREATE INDEX "platform_thread_messages_logged_by_idx" ON "platform_thread_messages"("logged_by");

-- CreateIndex
CREATE INDEX "attachments_entity_type_entity_id_idx" ON "attachments"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "notifications_recipient_id_is_read_idx" ON "notifications"("recipient_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "notifications_notification_type_id_idx" ON "notifications"("notification_type_id");

-- CreateIndex
CREATE INDEX "delegations_delegator_id_valid_from_valid_until_idx" ON "delegations"("delegator_id", "valid_from", "valid_until");

-- CreateIndex
CREATE INDEX "delegations_delegatee_id_valid_from_valid_until_idx" ON "delegations"("delegatee_id", "valid_from", "valid_until");

-- CreateIndex
CREATE INDEX "audit_logs_entity_table_entity_id_idx" ON "audit_logs"("entity_table", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE INDEX "department_managers_department_id_unassigned_at_idx" ON "department_managers"("department_id", "unassigned_at");

-- CreateIndex
CREATE INDEX "department_managers_user_id_unassigned_at_idx" ON "department_managers"("user_id", "unassigned_at");

-- CreateIndex
CREATE UNIQUE INDEX "teams_slug_key" ON "teams"("slug");

-- CreateIndex
CREATE INDEX "team_members_team_id_user_id_idx" ON "team_members"("team_id", "user_id");

-- CreateIndex
CREATE INDEX "team_members_user_id_left_at_idx" ON "team_members"("user_id", "left_at");

-- CreateIndex
CREATE INDEX "team_members_role_id_idx" ON "team_members"("role_id");

-- CreateIndex
CREATE INDEX "team_service_lines_service_line_id_idx" ON "team_service_lines"("service_line_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_service_lines_team_id_service_line_id_key" ON "team_service_lines"("team_id", "service_line_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_lines_slug_key" ON "service_lines"("slug");

-- CreateIndex
CREATE INDEX "service_lines_parent_service_line_id_idx" ON "service_lines"("parent_service_line_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_order_id_key" ON "projects"("order_id");

-- CreateIndex
CREATE INDEX "projects_profile_id_idx" ON "projects"("profile_id");

-- CreateIndex
CREATE INDEX "projects_client_id_idx" ON "projects"("client_id");

-- CreateIndex
CREATE INDEX "projects_service_line_id_idx" ON "projects"("service_line_id");

-- CreateIndex
CREATE INDEX "projects_status_id_idx" ON "projects"("status_id");

-- CreateIndex
CREATE INDEX "projects_status_id_deleted_at_idx" ON "projects"("status_id", "deleted_at");

-- CreateIndex
CREATE INDEX "project_components_project_id_idx" ON "project_components"("project_id");

-- CreateIndex
CREATE INDEX "project_components_status_id_idx" ON "project_components"("status_id");

-- CreateIndex
CREATE INDEX "project_team_assignments_project_id_unassigned_at_idx" ON "project_team_assignments"("project_id", "unassigned_at");

-- CreateIndex
CREATE INDEX "project_team_assignments_team_id_idx" ON "project_team_assignments"("team_id");

-- CreateIndex
CREATE INDEX "component_team_assignments_component_id_unassigned_at_idx" ON "component_team_assignments"("component_id", "unassigned_at");

-- CreateIndex
CREATE INDEX "component_team_assignments_team_id_idx" ON "component_team_assignments"("team_id");

-- CreateIndex
CREATE INDEX "project_assignments_project_id_user_id_idx" ON "project_assignments"("project_id", "user_id");

-- CreateIndex
CREATE INDEX "project_assignments_user_id_unassigned_at_idx" ON "project_assignments"("user_id", "unassigned_at");

-- CreateIndex
CREATE INDEX "project_assignments_role_id_idx" ON "project_assignments"("role_id");

-- CreateIndex
CREATE INDEX "component_assignments_component_id_user_id_idx" ON "component_assignments"("component_id", "user_id");

-- CreateIndex
CREATE INDEX "component_assignments_role_id_idx" ON "component_assignments"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "platforms_code_key" ON "platforms"("code");

-- CreateIndex
CREATE UNIQUE INDEX "project_statuses_code_key" ON "project_statuses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "priorities_code_key" ON "priorities"("code");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_roles_code_key" ON "assignment_roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "notification_types_code_key" ON "notification_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "message_types_code_key" ON "message_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "issue_types_code_key" ON "issue_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "support_ticket_statuses_code_key" ON "support_ticket_statuses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "bd_order_types_code_key" ON "bd_order_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permission_scope_types_code_key" ON "permission_scope_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permission_groups_code_key" ON "permission_groups"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permission_group_items_permission_group_id_permission_id_key" ON "permission_group_items"("permission_group_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_designation_id_idx" ON "users"("designation_id");

-- CreateIndex
CREATE INDEX "users_is_active_deleted_at_idx" ON "users"("is_active", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "designations_code_key" ON "designations"("code");

-- CreateIndex
CREATE INDEX "designations_department_id_idx" ON "designations"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "designation_permissions_scope_type_id_idx" ON "designation_permissions"("scope_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "designation_permissions_designation_id_permission_id_key" ON "designation_permissions"("designation_id", "permission_id");

-- CreateIndex
CREATE INDEX "designation_permission_scope_targets_designation_permission_idx" ON "designation_permission_scope_targets"("designation_permission_id");

-- CreateIndex
CREATE INDEX "designation_permission_scope_targets_department_id_idx" ON "designation_permission_scope_targets"("department_id");

-- CreateIndex
CREATE INDEX "designation_permission_scope_targets_team_id_idx" ON "designation_permission_scope_targets"("team_id");

-- CreateIndex
CREATE INDEX "designation_permission_scope_targets_project_id_idx" ON "designation_permission_scope_targets"("project_id");

-- CreateIndex
CREATE INDEX "user_permission_overrides_user_id_expires_at_idx" ON "user_permission_overrides"("user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_permission_overrides_user_id_permission_id_team_id_pro_key" ON "user_permission_overrides"("user_id", "permission_id", "team_id", "project_id", "department_id");

-- CreateIndex
CREATE INDEX "user_absences_user_id_start_at_end_at_idx" ON "user_absences"("user_id", "start_at", "end_at");

-- CreateIndex
CREATE INDEX "user_absences_covered_by_idx" ON "user_absences"("covered_by");

-- AddForeignKey
ALTER TABLE "bd_orders" ADD CONSTRAINT "bd_orders_order_type_id_fkey" FOREIGN KEY ("order_type_id") REFERENCES "bd_order_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bd_orders" ADD CONSTRAINT "bd_orders_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "platforms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bd_orders" ADD CONSTRAINT "bd_orders_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bd_orders" ADD CONSTRAINT "bd_orders_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "project_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bd_orders" ADD CONSTRAINT "bd_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bd_order_assignments" ADD CONSTRAINT "bd_order_assignments_bd_order_id_fkey" FOREIGN KEY ("bd_order_id") REFERENCES "bd_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bd_order_assignments" ADD CONSTRAINT "bd_order_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bd_order_assignments" ADD CONSTRAINT "bd_order_assignments_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "assignment_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_groups" ADD CONSTRAINT "project_groups_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_group_members" ADD CONSTRAINT "project_group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_group_members" ADD CONSTRAINT "project_group_members_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_group_members" ADD CONSTRAINT "project_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "project_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "project_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message_reads" ADD CONSTRAINT "chat_message_reads_chat_message_id_fkey" FOREIGN KEY ("chat_message_id") REFERENCES "chat_messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message_reads" ADD CONSTRAINT "chat_message_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "platforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "platforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_sellers" ADD CONSTRAINT "profile_sellers_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_sellers" ADD CONSTRAINT "profile_sellers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "project_components"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_priority_id_fkey" FOREIGN KEY ("priority_id") REFERENCES "priorities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_issue_type_id_fkey" FOREIGN KEY ("issue_type_id") REFERENCES "issue_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "support_ticket_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_message_type_id_fkey" FOREIGN KEY ("message_type_id") REFERENCES "message_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_revisions" ADD CONSTRAINT "message_revisions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_revisions" ADD CONSTRAINT "message_revisions_edited_by_fkey" FOREIGN KEY ("edited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_approvals" ADD CONSTRAINT "message_approvals_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_approvals" ADD CONSTRAINT "message_approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_thread_messages" ADD CONSTRAINT "platform_thread_messages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_thread_messages" ADD CONSTRAINT "platform_thread_messages_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_thread_messages" ADD CONSTRAINT "platform_thread_messages_source_message_id_fkey" FOREIGN KEY ("source_message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_thread_messages" ADD CONSTRAINT "platform_thread_messages_logged_by_fkey" FOREIGN KEY ("logged_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_notification_type_id_fkey" FOREIGN KEY ("notification_type_id") REFERENCES "notification_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_delegator_id_fkey" FOREIGN KEY ("delegator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_delegatee_id_fkey" FOREIGN KEY ("delegatee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_on_behalf_of_id_fkey" FOREIGN KEY ("on_behalf_of_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_managers" ADD CONSTRAINT "department_managers_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_managers" ADD CONSTRAINT "department_managers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "assignment_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_service_lines" ADD CONSTRAINT "team_service_lines_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_service_lines" ADD CONSTRAINT "team_service_lines_service_line_id_fkey" FOREIGN KEY ("service_line_id") REFERENCES "service_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_lines" ADD CONSTRAINT "service_lines_parent_service_line_id_fkey" FOREIGN KEY ("parent_service_line_id") REFERENCES "service_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_service_line_id_fkey" FOREIGN KEY ("service_line_id") REFERENCES "service_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "project_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_components" ADD CONSTRAINT "project_components_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_components" ADD CONSTRAINT "project_components_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "project_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_team_assignments" ADD CONSTRAINT "project_team_assignments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_team_assignments" ADD CONSTRAINT "project_team_assignments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_team_assignments" ADD CONSTRAINT "component_team_assignments_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "project_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_team_assignments" ADD CONSTRAINT "component_team_assignments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "assignment_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_assignments" ADD CONSTRAINT "component_assignments_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "project_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_assignments" ADD CONSTRAINT "component_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_assignments" ADD CONSTRAINT "component_assignments_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "assignment_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_group_items" ADD CONSTRAINT "permission_group_items_permission_group_id_fkey" FOREIGN KEY ("permission_group_id") REFERENCES "permission_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_group_items" ADD CONSTRAINT "permission_group_items_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designations" ADD CONSTRAINT "designations_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designation_permissions" ADD CONSTRAINT "designation_permissions_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designation_permissions" ADD CONSTRAINT "designation_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designation_permissions" ADD CONSTRAINT "designation_permissions_scope_type_id_fkey" FOREIGN KEY ("scope_type_id") REFERENCES "permission_scope_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designation_permissions" ADD CONSTRAINT "designation_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designation_permission_scope_targets" ADD CONSTRAINT "designation_permission_scope_targets_designation_permissio_fkey" FOREIGN KEY ("designation_permission_id") REFERENCES "designation_permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designation_permission_scope_targets" ADD CONSTRAINT "designation_permission_scope_targets_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designation_permission_scope_targets" ADD CONSTRAINT "designation_permission_scope_targets_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designation_permission_scope_targets" ADD CONSTRAINT "designation_permission_scope_targets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_absences" ADD CONSTRAINT "user_absences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_absences" ADD CONSTRAINT "user_absences_covered_by_fkey" FOREIGN KEY ("covered_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_absences" ADD CONSTRAINT "user_absences_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
