# Project Management Softvence Monorepo

A modern monorepo built for high-performance project management using **Turborepo**, **Bun**, **Next.js**, **Vite**, **Express**, **Prisma**, **MongoDB**, **Redis**, **RabbitMQ**, and **shadcn/ui**.

---

## 📁 Repository Structure Overview

```text
.
├── ApiCollection/              # API Specs & Collections (OpenAPI / Bruno / Postman)
│   ├── opencollection.yml
│   └── Test.yml
├── apps/                       # Application Workspaces
│   ├── api/                    # Express.js REST API Backend
│   │   ├── src/
│   │   │   ├── core/           # Core framework (BaseController, IgnitorApp, Context)
│   │   │   ├── lib/            # Shared clients (Prisma, etc.)
│   │   │   ├── middleware/     # Auth, Security, Validation, Logging, Request ID
│   │   │   ├── Modules/        # Feature Modules (Auth, AuditLog, etc.)
│   │   │   ├── providers/      # Infra providers (Redis, RabbitMQ, Prisma)
│   │   │   ├── types/          # Express extensions & service types
│   │   │   └── utils/          # Helpers (pagination, string converters, module sorter)
│   │   └── Dockerfile
│   ├── dashboard/              # Next.js 15 Admin Dashboard Application
│   │   ├── app/                # App Router (dashboard routes: users, projects, teams, etc.)
│   │   ├── components/         # Shared Dashboard components & layout (app-sidebar, etc.)
│   │   ├── hooks/              # Custom React hooks
│   │   └── lib/                # Dashboard utility functions
│   ├── web/                    # Vite + React Frontend Application
│   │   └── src/
│   │       ├── components/     # App components & theme providers
│   │       └── lib/            # API client and utils
│   └── worker/                 # Background Worker Service (RabbitMQ Consumer)
│       └── src/
│           ├── consumers/      # Event Consumers (audit, email, notifications)
│           └── lib/            # Shared clients
├── packages/                   # Shared Monorepo Packages
│   ├── cache/                  # Redis Caching Layer & CacheManager
│   │   └── src/                # Cache client and types
│   ├── db/                     # Database ORM & Schemas (Prisma PostgreSQL + Mongoose Mongo)
│   │   ├── prisma/             # Modular Prisma Schemas (user, project, issue, team, message)
│   │   └── src/
│   │       ├── generated/      # Prisma Client Output
│   │       └── mongo/          # MongoDB Connection & Mongoose Models (AuditLog)
│   ├── eslint-config/          # Shared ESLint Configurations (base, next, react-internal)
│   ├── logger/                 # Shared Winston Logger Package
│   ├── message-broker/         # RabbitMQ Message Broker (Publishers, Consumers, Queues)
│   │   └── src/                # Connection manager, queues constants, & message types
│   ├── shared/                 # Shared Types, Zod Schemas & Validation Rules
│   │   └── src/schemas/        # Auth, User, API schemas
│   ├── typescript-config/      # Shared TypeScript Configurations (base, nextjs, react-library)
│   └── ui/                     # Shared UI Component Library (shadcn/ui + Tailwind)
│       └── src/
│           ├── components/     # Reusable UI Components (Button, Dialog, Sidebar, Table, etc.)
│           ├── hooks/          # UI hooks (use-mobile, etc.)
│           └── styles/         # Global CSS stylesheet
├── docker-compose.yml          # Local Infrastructure (PostgreSQL, MongoDB, Redis, RabbitMQ)
├── turbo.json                  # Turborepo Task Pipeline Config
├── package.json                # Root Monorepo Dependencies & Scripts
├── bun.lock                    # Lockfile (Bun Package Manager)
└── README.md                   # Project Documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Bun**: `>=1.0.0`
- **Docker & Docker Compose**: (for local databases & services)

### Installation & Local Setup

1. **Clone the repository and install dependencies:**
   ```bash
   bun install
   ```

2. **Start Infrastructure Services (Postgres, Mongo, Redis, RabbitMQ):**
   ```bash
   docker compose up -d
   ```

3. **Run Database Migrations & Generate Clients:**
   ```bash
   bun run db:generate
   ```

4. **Start Development Environment (All apps & workers):**
   ```bash
   bun run dev
   ```

---

## 🧱 Packages & Workspace Apps

| Workspace | Type | Description |
| --- | --- | --- |
| `apps/api` | Application | Express.js Modular REST API backend |
| `apps/dashboard` | Application | Next.js 15 App Router Management Dashboard |
| `apps/web` | Application | Vite + React Frontend SPA |
| `apps/worker` | Application | Async event worker consuming RabbitMQ messages |
| `packages/db` | Shared Package | Prisma (PostgreSQL) + Mongoose (MongoDB) database layer |
| `packages/cache` | Shared Package | Redis caching client and state manager |
| `packages/message-broker` | Shared Package | RabbitMQ publisher and queue architecture |
| `packages/ui` | Shared Package | Design System & shadcn/ui components |
| `packages/shared` | Shared Package | Shared Zod schemas, constants, and TypeScript types |
| `packages/logger` | Shared Package | Centralized Winston logger setup |
| `packages/eslint-config` | Shared Package | Monorepo ESLint presets |
| `packages/typescript-config` | Shared Package | Monorepo `tsconfig.json` bases |

