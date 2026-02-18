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

## License

MIT

---

<p align="center">
  Built with <a href="https://developer.aleo.org/leo/">Leo</a> on <a href="https://aleo.org">Aleo</a>
</p>
