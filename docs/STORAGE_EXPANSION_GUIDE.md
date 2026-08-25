# RustFS Storage Pool Expansion & Scaling Guide

This guide details how to expand storage capacity, rebalance data, and decommission pools in the Softvence monorepo using **RustFS**.

---

## 🏛️ Storage Pool Architecture

RustFS scales capacity by appending **Server Pools** to the cluster topology via the `RUSTFS_VOLUMES` environment variable.

- **Initial Deployment (Default)**:
  `RUSTFS_VOLUMES="/data/pool1"`
- **Pre-Configured Docker Volumes**:
  - `manage_project_storage_pool1` mounted at `/data/pool1`
  - `manage_project_storage_pool2` mounted at `/data/pool2`
  - `manage_project_storage_pool3` mounted at `/data/pool3`
  - `manage_project_storage_pool4` mounted at `/data/pool4`

---

## 🚀 How to Add Storage Later (Pool Expansion)

### Step 1: Append the New Pool to `RUSTFS_VOLUMES`
Open your `.env` file and append the next pool path (space-separated, preserving existing order):

```ini
# Before expansion (Single Pool):
RUSTFS_VOLUMES="/data/pool1"

# After expansion (Adding Pool 2):
RUSTFS_VOLUMES="/data/pool1 /data/pool2"

# Adding Pool 3:
RUSTFS_VOLUMES="/data/pool1 /data/pool2 /data/pool3"
```

> [!IMPORTANT]
> **Append the pool; do not replace the topology.**
> Always keep existing pool expressions unchanged and in their original order.

---

### Step 2: Restart the RustFS Container
Restart the RustFS service to apply the expanded topology:

```bash
docker compose up -d rustfs
```

---

### Step 3: Verify the New Storage Pool
Check that the new pool is online and active:

```bash
bun run storage:pools
```

Or view detailed status for Pool `1`:
```bash
bun run storage:admin pool:status 1
```

---

### Step 4: Rebalance Data Across Pools
After adding the new pool, new writes will automatically utilize the expanded capacity. To redistribute existing objects across all active pools so their utilization ratios balance out, trigger a **Rebalance**:

#### Option A: Via Command Line
```bash
# Start data rebalance
bun run storage:rebalance:start

# Monitor rebalance status (moved bytes, remaining buckets, ETA)
bun run storage:rebalance
```

#### Option B: Via RustFS Web Console
1. Open the RustFS Console at **[http://localhost:9001](http://localhost:9001)**.
2. Sign in with your admin credentials (`rustfsadmin` / `rustfsadmin`).
3. Navigate to **Rebalance**.
4. Click **Start Rebalance** and confirm.
5. Watch live per-pool progress and moved byte counters.

---

## 🛑 How to Decommission / Retire an Old Storage Pool

When replacing or retiring old hardware, use the **Pool Decommission** workflow to safely drain all objects from a pool to remaining active pools.

### Step 1: Start Decommissioning
Drain the target pool by its zero-based ID (e.g. Pool `0`):

```bash
bun run storage:admin decommission:start 0
```

### Step 2: Monitor Decommission Progress
```bash
bun run storage:admin decommission:status 0
```

### Step 3: Remove Drained Pool from `.env` and Restart
Once the status reports `Completed` (zero failed objects and bytes):
1. Remove the retired `/data/poolX` expression from `RUSTFS_VOLUMES` in `.env`.
2. Restart the container:
   ```bash
   docker compose up -d rustfs
   ```

---

## 🛠️ CLI Command Reference

| Action | Bun / NPM Script | Raw CLI Command |
| :--- | :--- | :--- |
| **List Pools** | `bun run storage:pools` | `rc admin pool list rustfs` |
| **Pool Status** | `bun run storage:admin pool:status <id>` | `rc admin pool status rustfs <id> --by-id` |
| **Start Rebalance** | `bun run storage:rebalance:start` | `rc admin rebalance start rustfs` |
| **Check Rebalance** | `bun run storage:rebalance` | `rc admin rebalance status rustfs` |
| **Stop Rebalance** | `bun run storage:admin rebalance:stop` | `rc admin rebalance stop rustfs` |
| **Start Decommission**| `bun run storage:admin decommission:start <id>` | `rc admin decommission start rustfs <id> --by-id` |
| **Check Decommission**| `bun run storage:admin decommission:status <id>` | `rc admin decommission status rustfs <id> --by-id` |
| **Cancel Decommission**| `bun run storage:admin decommission:cancel <id>` | `rc admin decommission cancel rustfs <id> --by-id` |
| **List S3 Buckets** | `bun run storage:admin buckets` | `rc ls rustfs` |
