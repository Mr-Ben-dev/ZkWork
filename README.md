<p align="center">
  <img src="https://img.shields.io/badge/Aleo-Testnet-00ffcc?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgc3Ryb2tlPSIjMDBmZmNjIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=&labelColor=111" alt="Aleo Testnet" />
  <img src="https://img.shields.io/badge/Leo-Smart_Contract-1a1a2e?style=for-the-badge" alt="Leo" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Express-4.18-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Shield_Wallet-Integrated-00ffcc?style=for-the-badge" alt="Shield Wallet" />
</p>

<h1 align="center">ZKWork</h1>
<h3 align="center">Privacy-Preserving Freelance Marketplace on Aleo</h3>

<p align="center">
  Post jobs. Hire talent. Escrow payments. Build reputation.<br/>
  <strong>All without revealing your identity.</strong>
</p>

---

## Overview

**ZKWork** is a fully on-chain freelance marketplace built on the [Aleo](https://aleo.org) blockchain. Every action — from posting a job to releasing payment — executes as a zero-knowledge transition, ensuring that user identities, payment amounts, and work history remain private.

The platform supports two payment methods:
- **ALEO** — Native credits with on-chain escrow locking
- **USDCx** — Stablecoin via `test_usdcx_stablecoin.aleo` with fully private transfers

Workers build **private reputation** by claiming on-chain `CompletionReceipt` records. They can then generate **zero-knowledge threshold proofs** — proving they've completed at least _N_ jobs to any verifier without revealing their exact count or identity.

### Deployed Contract

| Property | Value |
|----------|-------|
| Program ID | `zkwork_private_v1.aleo` |
| Network | Aleo Testnet |
| Dependencies | `credits.aleo`, `test_usdcx_stablecoin.aleo` |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          FRONTEND                                │
│               React 18 · Vite 5 · TailwindCSS 3                 │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │  Job Board │  │  Post Job  │  │  Agreements  │  │Reputation│ │
│  │            │  │ (ALEO/USDCx│  │   Detail     │  │  Claim   │ │
│  │  Browse &  │  │  on-chain) │  │  Escrow Ops  │  │  Merge   │ │
│  │  Apply     │  │            │  │  Deliverable │  │  Prove   │ │
│  └────────────┘  └────────────┘  └─────────────┘  └──────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │  useZKWorkWallet Hook                                        ││
│  │  • executeTransition  • findRecord  • findCreditsRecord      ││
│  │  • findTokenRecord    • authenticate • pollTransaction       ││
│  └──────────────────────────────────────────────────────────────┘│
│                          │                                       │
│                    Shield Wallet                                  │
│              (Sign · Execute · Decrypt)                           │
└────────────────────────┬─────────────────────────────────────────┘
                         │ JWT Auth + REST API
┌────────────────────────┴─────────────────────────────────────────┐
│                          BACKEND                                  │
│            Express.js · TypeScript · LowDB · Zod                  │
│                                                                   │
│  ┌──────┐ ┌──────┐ ┌──────────┐ ┌────────┐ ┌──────────────────┐ │
│  │ Auth │ │ Jobs │ │Agreements│ │ Escrow │ │   Reputation     │ │
│  │Nonce │ │ CRUD │ │Lifecycle │ │Deposit │ │ Claim · Prove    │ │
│  │ JWT  │ │Apply │ │Deliverbl │ │Release │ │ Verify On-Chain  │ │
│  └──────┘ └──────┘ └──────────┘ └────────┘ └──────────────────┘ │
│                          │                                        │
│              ┌───────────┴───────────┐                            │
│              │   Services            │                            │
│              │  • db.ts (LowDB)      │                            │
│              │  • bhp256.ts          │                            │
│              │  • provableApi.ts     │                            │
│              └───────────────────────┘                            │
└──────────────────────────┬───────────────────────────────────────┘
                           │ Aleo RPC
┌──────────────────────────┴───────────────────────────────────────┐
│                    ALEO BLOCKCHAIN                                │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  zkwork_private_v1.aleo                                      │ │
│  │                                                               │ │
│  │  Records: WorkerProfile · JobOffer · Agreement               │ │
│  │           EscrowReceipt · DeliveryNotice · CompletionReceipt │ │
│  │           ReputationRecord · ThresholdProof                  │ │
│  │                                                               │ │
│  │  Mappings: job_exists · agreement_active · escrow_active     │ │
│  │            delivery_submitted · escrow_timestamps            │ │
│  │            reputation_exists                                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌───────────────────┐  ┌─────────────────────────────────────┐ │
│  │   credits.aleo    │  │  test_usdcx_stablecoin.aleo         │ │
│  │  (Native ALEO)    │  │  (USDCx Stablecoin Transfers)       │ │
│  └───────────────────┘  └─────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## End-to-End Workflows

### ALEO Payment Flow

```
 Client                          Blockchain                        Worker
   │                                 │                                │
   │  1. post_job(salary, 0u8)       │                                │
   │────────────────────────────────>│  JobOffer record               │
   │                                 │  job_exists = true             │
   │                                 │                                │
   │                                 │  2. Apply (off-chain API)      │
   │                                 │<───────────────────────────────│
   │                                 │                                │
   │  3. create_agreement(job, worker)                                │
   │────────────────────────────────>│  Agreement ×2 (client+worker)  │
   │                                 │  agreement_active = true       │
   │                                 │                                │
   │  4. deposit_escrow_aleo(credits)│                                │
   │────────────────────────────────>│  EscrowReceipt                 │
   │                                 │  Credits locked (private→public)
   │                                 │                                │
   │                                 │  5. submit_deliverable(hash)   │
   │                                 │<───────────────────────────────│
   │                                 │  DeliveryNotice → client       │
   │                                 │                                │
   │  6. complete_job_aleo           │                                │
   │────────────────────────────────>│  CompletionReceipt ×2          │
   │                                 │  Credits → Worker (public→private)
   │                                 │  All mappings reset            │
   │                                 │                                │
```

### USDCx Stablecoin Flow

```
 Client                          Blockchain                        Worker
   │                                 │                                │
   │  1. post_job(salary, 1u8)       │                                │
   │────────────────────────────────>│  JobOffer (payment_type=1)     │
   │                                 │                                │
   │  2-3. Agreement creation        │  (same as ALEO)               │
   │                                 │                                │
   │  4. commit_escrow_usdcx         │                                │
   │────────────────────────────────>│  EscrowReceipt (signal-only)   │
   │                                 │  No tokens locked yet          │
   │                                 │                                │
   │                                 │  5. submit_deliverable(hash)   │
   │                                 │<───────────────────────────────│
   │                                 │                                │
   │  6. complete_job_usdcx(Token, proofs)                            │
   │────────────────────────────────>│  USDCx transfer_private        │
   │                                 │  CompletionReceipt ×2          │
   │                                 │  Worker receives Token record  │
   │                                 │  ComplianceRecord produced     │
   │                                 │                                │
```

### ZK Reputation Flow

```
 Worker                          Blockchain                       Verifier
   │                                 │                                │
   │  1. claim_reputation(receipt)   │                                │
   │────────────────────────────────>│  ReputationRecord (score=1)    │
   │                                 │  reputation_exists = true      │
   │                                 │                                │
   │  2. merge_reputation(receipt, rep)                               │
   │────────────────────────────────>│  ReputationRecord (score+1)    │
   │                                 │  Old commitment removed        │
   │                                 │                                │
   │  3. prove_threshold(rep, N, verifier)                            │
   │────────────────────────────────>│  ThresholdProof → Verifier     │
   │                                 │  "I completed ≥ N jobs"        │
   │                                 │  Exact count NOT revealed      │
   │                                 │                               ─│
   │                                 │           ThresholdProof record │
   │                                 │ ─────────────────────────────> │
```

---

## Smart Contract — `zkwork_private_v1.aleo`

### Record Types

| Record | Fields | Owner |
|--------|--------|-------|
| **WorkerProfile** | `profile_id`, `skills_hash`, `bio_hash` | Worker |
| **JobOffer** | `job_id`, `description_hash`, `salary`, `payment_type`, `category_hash`, `deadline_blocks` | Client |
| **Agreement** | `agreement_id`, `job_id`, `worker`, `client`, `salary`, `payment_type`, `description_hash` | Client & Worker (separate copies) |
| **EscrowReceipt** | `agreement_id`, `amount`, `worker`, `payment_type`, `escrow_commitment` | Client |
| **DeliveryNotice** | `agreement_id`, `deliverable_hash`, `worker` | Client |
| **CompletionReceipt** | `agreement_id`, `deliverable_hash`, `salary` | Client & Worker |
| **ReputationRecord** | `score`, `completed_jobs`, `rep_commitment` | Worker |
| **ThresholdProof** | `worker_commitment`, `threshold`, `verified` | Verifier |

### Transitions

| Transition | Purpose | Payment |
|-----------|---------|---------|
| `register_worker` | Create anonymous worker profile | — |
| `post_job` | Post job with salary and deadline | — |
| `cancel_job` | Remove job listing | — |
| `create_agreement` | Bind client + worker, produce Agreement records for both | — |
| `deposit_escrow_aleo` | Lock ALEO credits on-chain | ALEO |
| `commit_escrow_usdcx` | Signal escrow commitment (no lock) | USDCx |
| `submit_deliverable` | Worker submits deliverable hash | — |
| `complete_job_aleo` | Release ALEO to worker + CompletionReceipts | ALEO |
| `complete_job_usdcx` | Transfer USDCx to worker + CompletionReceipts | USDCx |
| `refund_escrow_aleo` | Refund ALEO after 1000-block timeout | ALEO |
| `cancel_escrow_usdcx` | Cancel USDCx commitment | USDCx |
| `claim_reputation` | First reputation claim (score = 1) | — |
| `merge_reputation` | Merge new claim into existing (score + 1) | — |
| `prove_threshold` | ZK proof: score ≥ threshold → ThresholdProof to verifier | — |

### On-Chain Mappings

| Mapping | Type | Purpose |
|---------|------|---------|
| `job_exists` | `field → bool` | Track active job listings |
| `agreement_active` | `field → bool` | Track active agreements |
| `escrow_active` | `field → bool` | Track locked escrows |
| `delivery_submitted` | `field → bool` | Track submitted deliverables |
| `escrow_timestamps` | `field → u64` | Block height for refund timeout |
| `reputation_exists` | `field → bool` | Track reputation commitments |

---

## Project Structure

```
zkwork/
├── contracts/
│   ├── src/
│   │   └── main.leo                 # Smart contract (703 lines)
│   ├── program.json                 # Program config + dependencies
│   ├── build/                       # Compiled artifacts
│   └── .env                         # Deploy key
│
├── backend/
│   ├── src/
│   │   ├── index.ts                 # Express server entry point
│   │   ├── types.ts                 # TypeScript interfaces
│   │   ├── middleware/
│   │   │   └── auth.ts              # JWT authentication middleware
│   │   ├── lib/
│   │   │   ├── crypto.ts            # SHA-256 hashing utilities
│   │   │   └── validate.ts          # Zod request validation schemas
│   │   ├── routes/
│   │   │   ├── auth.ts              # Wallet authentication (nonce/verify)
│   │   │   ├── workers.ts           # Worker registration & discovery
│   │   │   ├── jobs.ts              # Job CRUD & applications
│   │   │   ├── agreements.ts        # Agreement lifecycle
│   │   │   ├── escrow.ts            # Escrow deposit/release/refund
│   │   │   └── reputation.ts        # Reputation claim & threshold proof
│   │   └── services/
│   │       ├── db.ts                # LowDB JSON persistence
│   │       ├── bhp256.ts            # BHP256 hash computation
│   │       └── provableApi.ts       # Aleo explorer API client
│   ├── data/                        # Database directory
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx                 # React entry point
│   │   ├── App.tsx                  # Route definitions (10 pages)
│   │   ├── wallet/
│   │   │   └── WalletProvider.tsx   # Shield + Leo wallet config
│   │   ├── hooks/
│   │   │   └── useZKWorkWallet.ts   # Core wallet hook (507 lines)
│   │   ├── stores/
│   │   │   ├── userStore.ts         # Auth state (Zustand + persist)
│   │   │   └── pendingTxStore.ts    # TX tracking store
│   │   ├── lib/
│   │   │   ├── api.ts               # REST API client
│   │   │   ├── aleo.ts              # ALEO scaling & parsing
│   │   │   ├── usdcx.ts            # USDCx utils & MerkleProof
│   │   │   ├── commitment.ts        # BLS12-377 field hashing
│   │   │   └── types.ts             # TypeScript interfaces
│   │   ├── pages/
│   │   │   ├── Home.tsx             # Landing page
│   │   │   ├── Dashboard.tsx        # User dashboard
│   │   │   ├── JobBoard.tsx         # Browse jobs
│   │   │   ├── JobDetail.tsx        # Job details + apply
│   │   │   ├── PostJob.tsx          # Create job posting
│   │   │   ├── RegisterWorker.tsx   # Worker registration
│   │   │   ├── Agreements.tsx       # Agreement list
│   │   │   ├── AgreementDetail.tsx  # Full escrow lifecycle (802 lines)
│   │   │   ├── Reputation.tsx       # ZK reputation UI
│   │   │   └── Profile.tsx          # User profile
│   │   └── components/
│   │       ├── icons/               # SVG icons
│   │       ├── layout/              # Layout & navbar
│   │       └── ui/                  # Reusable UI components
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
└── render.yaml                      # Render deployment config
```

---

## API Reference

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/nonce` | — | Request sign-in nonce |
| `POST` | `/api/auth/verify` | — | Verify wallet signature, receive JWT |

### Workers
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/workers/register` | JWT | Register worker profile (on-chain) |
| `GET` | `/api/workers/profile` | JWT | Get own worker profile |
| `GET` | `/api/workers/list` | — | List all registered workers |
| `GET` | `/api/workers/:commitment` | — | Lookup worker by commitment |

### Jobs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/jobs/create` | JWT | Create job posting (on-chain) |
| `GET` | `/api/jobs/available` | — | List open jobs |
| `GET` | `/api/jobs/my` | JWT | List own posted jobs |
| `POST` | `/api/jobs/:id/apply` | JWT | Apply to a job |
| `GET` | `/api/jobs/:id/applications` | JWT | View applicants (job owner) |
| `POST` | `/api/jobs/:id/cancel` | JWT | Cancel job posting |
| `GET` | `/api/jobs/:id` | — | Get job details |

### Agreements
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/agreements/create` | JWT | Create agreement (on-chain) |
| `GET` | `/api/agreements/my` | JWT | List own agreements |
| `POST` | `/api/agreements/:id/deliverable` | JWT | Submit deliverable |
| `GET` | `/api/agreements/:id` | JWT | Get agreement detail |
| `PATCH` | `/api/agreements/:id` | JWT | Update on-chain agreement ID |

### Escrow
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/escrow/deposit` | JWT | Record escrow deposit |
| `POST` | `/api/escrow/complete` | JWT | Record job completion |
| `POST` | `/api/escrow/refund` | JWT | Record refund |
| `PATCH` | `/api/escrow/:id/confirm` | JWT | Confirm escrow status |
| `GET` | `/api/escrow/:id/status` | — | Get escrow + on-chain status |

### Reputation
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/reputation/claim` | JWT | Claim reputation for completed job |
| `POST` | `/api/reputation/prove` | JWT | Log threshold proof transaction |
| `GET` | `/api/reputation/my` | JWT | Get own reputation data |
| `GET` | `/api/reputation/verify/:commitment` | — | Verify on-chain reputation |

---

## Privacy Guarantees

| Property | Implementation |
|----------|---------------|
| **Identity** | Never exposed on-chain. Backend stores SHA-256 hashed addresses. Transitions use `self.signer` privately. |
| **Amounts** | Stored in private records only. Public mappings track boolean existence only. |
| **ALEO Escrow** | Private → Public → Private transfer. Only boolean `escrow_active` visible on-chain. |
| **USDCx Payments** | Fully private `transfer_private`. No public trace of amounts or parties. |
| **Reputation** | Score in private record. `prove_threshold` reveals only `score ≥ N`, not exact value. |
| **Deliverables** | Only hash stored on-chain. Actual content remains off-chain. |
| **Agreements** | Private records. No public link between client and worker addresses. |

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.3 | UI framework |
| TypeScript | 5.5 | Type safety |
| Vite | 5.4 | Build tooling |
| TailwindCSS | 3.4 | Styling |
| Framer Motion | 11 | Animations |
| Zustand | 4.5 | State management |
| React Router | 6.26 | Client-side routing |
| Shield Wallet Adapter | 0.3.0-alpha.3 | Aleo wallet integration |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Express.js | 4.18 | HTTP server |
| TypeScript | 5.3 | Type safety |
| LowDB | 7.0 | JSON file database |
| Zod | 3.22 | Request validation |
| JSON Web Token | 9.0 | Authentication |
| Provable SDK | 0.9.16 | Aleo blockchain queries |

### Blockchain
| Technology | Purpose |
|-----------|---------|
| Leo | Smart contract language |
| Aleo Testnet | Deployment network |
| `credits.aleo` | Native ALEO token operations |
| `test_usdcx_stablecoin.aleo` | USDCx stablecoin transfers |
| BHP256 | On-chain commitment hashing |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Leo](https://developer.aleo.org/leo/) (for contract development)
- [Shield Wallet](https://www.shieldwallet.dev/) browser extension

### Installation

```bash
# Clone the repository
git clone https://github.com/Mr-Ben-dev/ZkWork.git
cd ZkWork/zkwork

# Install backend dependencies
cd backend
npm install
cp .env.example .env   # Configure environment variables

# Install frontend dependencies
cd ../frontend
npm install
```

### Configuration

**Backend `.env`:**
```
PORT=3001
JWT_SECRET=your_secret_here
CORS_ORIGIN=http://localhost:5173
ALEO_PROGRAM_ID=zkwork_private_v1.aleo
PROVABLE_API_BASE=https://api.explorer.provable.com/v1/testnet
```

**Frontend `.env`:**
```
VITE_API_BASE=http://localhost:3001/api
VITE_ALEO_PROGRAM_ID=zkwork_private_v1.aleo
```

### Development

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

The frontend runs on `http://localhost:5173` and the backend on `http://localhost:3001`.

### Build

```bash
# Backend
cd backend
npm run build    # Compiles to dist/

# Frontend
cd frontend
npm run build    # Outputs to dist/
```

---

## Deployment

### Backend (Render)

The included `render.yaml` configures automatic deployment:

```yaml
services:
  - type: web
    name: zkwork-backend
    runtime: node
    rootDir: zkwork/backend
    buildCommand: npm install && npx tsc
    startCommand: node dist/index.js
    healthCheckPath: /health
```

### Frontend

Deploy the `frontend/dist/` output to any static hosting:
- **Vercel**: `vercel --prod`
- **Netlify**: Drag & drop `dist/` folder
- **GitHub Pages**: Use `gh-pages` branch

Set `VITE_API_BASE` to your backend URL before building.

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Two payment types (ALEO / USDCx)** | ALEO for native token escrow with on-chain locking; USDCx for stablecoin payments with atomic transfer at completion |
| **Signal-only USDCx escrow** | `test_usdcx_stablecoin.aleo` doesn't support public escrow, so commitment is recorded on-chain while transfer happens atomically at completion |
| **Dual Agreement records** | Both client and worker receive their own private copy of every Agreement record |
| **BHP256 commitments** | All on-chain identifiers use BHP256 hash-to-field for unlinkable commitments |
| **Separate claim/merge reputation** | First claim creates a new ReputationRecord; subsequent ones merge into existing to maintain a single record |
| **ThresholdProof to verifier** | The proof record is owned by the verifier address, allowing them to verify privately without the worker's involvement |
| **1,000,000 scaling factor** | Both ALEO and USDCx use 6 decimal places (micro-units) for precision |
| **LowDB for backend** | Lightweight JSON persistence suitable for prototype; easily replaceable with PostgreSQL for production |

---

## Roadmap & Vision

### Where We Are

ZKWork is a working product, not a pitch deck. The MVP is deployed on Aleo Testnet with a 14-transition Leo smart contract (`zkwork_private_v1.aleo`), dual-currency payments (ALEO + USDCx), atomic on-chain escrow, a ZK reputation system with threshold proofs, Shield Wallet integration, and a production frontend + backend running live. Every flow — from posting a job to releasing escrowed payment to proving reputation — works end-to-end on-chain.

This section outlines what we are building next (concrete, scoped, in progress) and where ZKWork is headed beyond that (strategic direction, dependent on traction and feedback).

---

### Immediate Scope: Hardening & Expansion

These are the items we are actively working on. Each is scoped to be implementable within the current buildathon cycle, and each directly strengthens the core product.

#### Third Currency: USAD

- Add `USAD` as a payment option alongside ALEO and USDCx
- Extend the Leo contract with a `payment_type = 2u8` code path — same atomic-at-completion model already proven with USDCx via `transfer_private`
- Clients select ALEO, USDCx, or USAD at job creation. Three currencies cover native volatile (ALEO), established stable (USDCx), and Aleo-native stable (USAD)
- Frontend and backend already support multi-currency selection — adding USAD requires a new contract transition pair (`commit_escrow_usad` / `complete_job_usad`) and token record handling in the wallet hook

#### ZK Reputation Engine Improvements

The current reputation system works: workers claim `CompletionReceipt` records, build a `ReputationRecord` (score incremented per claim), and generate `ThresholdProof` records proving `score ≥ N` to any verifier. This is already functional and deployed. The next improvements make it genuinely powerful:

- **Weighted scoring** — Factor job value into reputation. Currently `score` increments by 1 per completion regardless of contract size. The upgrade adds `salary` from the `CompletionReceipt` into the `ReputationRecord` as a cumulative `total_earned` field. A worker who completed 3 jobs worth 50,000 ALEO total carries more credibility than one who completed 3 micro-tasks. The contract change is localized to `claim_reputation` and `merge_reputation` — adding one `u64` field to `ReputationRecord` and one addition operation
- **Multi-threshold proofs** — New transition `prove_multi_threshold(rep, min_jobs, min_earned, verifier)` that proves both `completed_jobs ≥ min_jobs` AND `total_earned ≥ min_earned` in a single proof. The verifier receives a `MultiThresholdProof` record containing both thresholds and a `verified: true` flag. This is a single new transition using two `assert` statements — straightforward to implement
- **In-app verification** — Add a "Verify Proof" page where clients paste a `ThresholdProof` record ciphertext or commitment hash. The UI decodes it (if the client owns the record) and displays the verified threshold. No CLI, no external tools. This is a frontend-only feature using the existing `findRecord` wallet hook
- **Reputation categories** — Extend `ReputationRecord` with a `category_hash: field` so workers build separate tracks per skill domain (e.g., "security audits" vs. "frontend development"). `claim_reputation` takes an optional category from the linked `JobOffer`'s `category_hash`. Workers can hold multiple `ReputationRecord` records, one per category, and prove threshold per category

#### Contract Hardening

- Audit every transition's `assert` conditions for edge cases — especially around double-claim prevention, escrow timeout boundaries, and record consumption ordering
- Add explicit `assert_neq` guards where records could theoretically be reused across transitions
- Document all invariants as comments in `main.leo` for future audit readiness
- Test refund timeout edge cases: what happens at exactly block 1000, block 999, block 1001

#### Infrastructure & UX

- Migrate backend persistence from LowDB to PostgreSQL — add proper indexing on `commitment`, `status`, and `createdAt` fields for performant queries at scale
- Add rate limiting (per-IP and per-JWT) on all API endpoints to prevent abuse
- Improve frontend error messaging for common on-chain failures: "Record not found" → explain wallet sync delay; "Insufficient balance" → show required amount; "Transaction rejected" → suggest retry
- Add a transaction history view in Dashboard showing all past operations with human-readable descriptions and on-chain confirmation status
- Optimize for Shield Wallet sync delays — add retry logic with progress indicators when records aren't immediately available after a transition confirms

---

### Next Phase: Product Depth

These features come after the core is hardened. They represent the next layer of product depth required for real-world usage. Each is technically scoped and builds on existing contract primitives.

#### Dispute Resolution

- New transitions: `open_dispute(agreement)`, `resolve_dispute(agreement, ruling, arbitrator)`
- Arbitrators are reputation-gated — must hold a `ReputationRecord` with `completed_jobs ≥ threshold` to be eligible
- Dispute evidence stored as `deliverable_hash` fields on-chain; actual evidence documents stored off-chain (IPFS or client-hosted)
- Resolution releases escrowed funds to the winning party via the existing `complete_job_*` or `refund_escrow_*` paths
- Arbitrators earn a fixed percentage of the escrowed amount, coded into the contract

#### Milestone-Based Escrow

- Extend `Agreement` records with `milestone_count: u8` and `current_milestone: u8` fields
- Each milestone has its own `deposit_escrow` → `submit_deliverable` → `complete_job` cycle
- Progressive payment release — client approves and pays per milestone, not all-or-nothing
- Unlocks high-value contracts where full upfront escrow is impractical

#### Privacy-Preserving Worker Discovery

- "Blind matching" — clients describe requirements as a `category_hash`; platform returns workers whose `WorkerProfile.skills_hash` overlaps, without revealing worker addresses until mutual opt-in
- Reputation-gated visibility: only workers meeting a client-specified threshold appear in results
- Built on existing `WorkerProfile` records and `ThresholdProof` verification

#### Notifications

- WebSocket-based real-time notifications for agreement state changes (escrow deposited, deliverable submitted, payment released)
- Optional email alerts for critical events
- Replaces the current polling-based status refresh

#### Mobile Application

- React Native app using Shield Wallet's mobile SDK
- Same core flows: browse jobs, manage agreements, approve payments, claim reputation
- Offline-first transaction queue — sign transactions offline, submit when connectivity resumes

---

### Mainnet Strategy

Aleo's architecture does not support in-place contract upgrades. Our mainnet strategy accounts for this:

- **Versioned deployment** — Deploy `zkwork_private_v2.aleo` (with dispute resolution, milestones, weighted reputation) as a new program. Existing testnet records under `v1` are not migrated — mainnet launch is a clean deployment with the production-ready contract
- **Security audit** — Complete a formal audit of all transitions before mainnet deployment. The contract is 703 lines of Leo with well-defined invariants — auditable scope
- **Revenue activation** — Platform fee (2–3%) coded directly into `complete_job_*` transitions. Fee is deducted from the escrowed amount before worker payout. The fee address and percentage are hardcoded constants in the contract — transparent and verifiable by anyone reading the source
- **Free tier** — First N completions per address are fee-free (checked via a `fee_exempt` mapping), reducing friction for new users

---

### Long-Term Vision (Post-Mainnet)

These are strategic directions, not immediate commitments. Each depends on mainnet traction, user feedback, and ecosystem maturity.

#### Governance

- Platform parameters (fee percentage, dispute timeout, arbitrator reputation threshold) governed by stakeholders via on-chain proposals
- Aleo's private voting primitives make governance participation itself privacy-preserving

#### Specialized Verticals

- **Security Audits** — auditors prove credentials (audit count, severity findings) without revealing identity. Same contract primitives, different frontend
- **DAO Contributor Management** — private compensation tracking, task assignment, and reputation-gated roles for DAO contributors
- **Content & Creative Work** — deliverable verification via content hashing with plagiarism-resistant fingerprinting

#### Cross-Chain Payments

- Accept USDC/USDT from Ethereum bridged to Aleo as USDCx/USAD — depends on bridge infrastructure maturity
- Workers withdraw earnings to EVM chains if preferred
- Expands the addressable user base beyond Aleo-native users

#### Developer SDK

- `@zkwork/sdk` — TypeScript SDK abstracting Leo transition building, record finding, and proof generation
- Public API for third-party integrations — other platforms can post jobs onto ZKWork's contract
- Enables "Powered by ZKWork" privacy-preserving job boards on existing platforms

#### Reputation Portability

- Workers export `ThresholdProof` records as verifiable credentials usable across the Aleo ecosystem
- Any dApp can verify a ZKWork reputation proof without ZKWork's backend — the proof is a self-contained Aleo record owned by the verifier

---

### Why ZKWork on Aleo

This is not a product that could exist on Ethereum, Solana, or any transparent-execution chain. ZKWork's core properties — private payments, private reputation, private agreements — require Aleo's architecture:

| Property | How Aleo Enables It |
|----------|-------------------|
| **Private escrow** | ALEO credits move private → public → private. Only a boolean `escrow_active` mapping is visible on-chain. No amounts, no addresses |
| **Private stablecoin payments** | USDCx/USAD use `transfer_private` — zero public trace of sender, receiver, or amount |
| **ZK reputation proofs** | `prove_threshold` uses Leo's native `assert(score >= threshold)` inside a ZK circuit. The verifier learns only that the condition holds, not the actual score |
| **Unlinkable identity** | `self.signer` is used privately in transitions. Records are owned by addresses but the ownership relationship is never revealed on-chain |
| **Record-based architecture** | Every piece of state (job, agreement, escrow, receipt, reputation) is a private record. No public contract storage leaks information |

The freelance marketplace is a natural fit for ZK: workers want verified credentials without exposing their identity; clients want trustworthy escrow without revealing payment amounts; both want dispute resolution without public records. Aleo is the only chain where all of this is possible natively, not through bolted-on privacy layers.

---

### Economic Viability

| Revenue Stream | Model |
|---------------|-------|
| **Platform Fee** | 2–3% on completed escrow releases, coded into the contract. Scales with GMV |
| **Premium Listings** | Priority job placement and featured worker profiles. Low-friction upsell |
| **API Access** | Volume-based pricing for `@zkwork/sdk` and third-party integrations |

**Path to sustainability:**
1. **Current** — Zero revenue. Focus on product quality, buildathon iteration, and user feedback
2. **Post-traction** — Testnet usage metrics demonstrate demand. Apply for Aleo SCALE grant based on technical depth and real usage
3. **Mainnet** — Fee model activates with real economic value flowing through the platform
4. **Growth** — Network effects: more workers → more clients → more workers. Platform fee revenue scales with gross merchandise value

---

### Current State

| Component | Status | Details |
|-----------|--------|---------|
| Leo Smart Contract | **Deployed** | `zkwork_private_v1.aleo` — 14 transitions, 6 mappings, 8 record types |
| ALEO Payment Flow | **Working** | Full escrow lifecycle: deposit → deliverable → complete → payment release |
| USDCx Payment Flow | **Working** | Commit-at-creation, atomic `transfer_private` at completion |
| ZK Reputation | **Working** | `claim_reputation`, `merge_reputation`, `prove_threshold` with private `ThresholdProof` records |
| Frontend | **Live** | 10 pages, Shield Wallet, animated UI, responsive design |
| Backend API | **Live** | 22 endpoints, JWT auth, Zod validation, LowDB persistence |
| Deployment | **Live** | Frontend on Vercel, Backend on Render |

---

## License

MIT

---

<p align="center">
  Built with <a href="https://developer.aleo.org/leo/">Leo</a> on <a href="https://aleo.org">Aleo</a>
</p>
