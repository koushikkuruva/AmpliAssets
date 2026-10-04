# Indian Equity & IPO Portfolio Analyzer

A high-performance, full-stack wealth and portfolio management application engineered specifically for Indian retail investors, HNIs, and family offices. Consolidates multiple demat accounts (Zerodha, Groww, AngelOne, Upstox, etc.), tracks real-time NSE/BSE market prices, audits mutual fund benchmark alpha, detects portfolio overlaps, and accounts for traditional Indian wealth instruments (Chits, FDs, and cash reserves).

---

## 🚀 Key Features

### 1. Multi-Profile Family Demat Management
- **Consolidated & Segregated Views:** Track investments across multiple family members or brokers individually or aggregated into a single combined portfolio view.
- **Isolated User Persistence:** Secure authentication with JWT tokens and bcrypt password hashing, ensuring each investor's financial records are strictly isolated.
- **Interactive Sandbox Mode:** Instant one-click sample evaluation with pre-populated demo demats, live market prices, IPO allotments, and mutual funds, with a one-click **Reset Sandbox** action in the navigation bar.

### 2. Live NSE/BSE Real-Time Market Price Sync
- **Automated CMP & Previous Close Fetching:** Direct integration with live market feeds for Indian equities (`.NS` and `.BO` exchange tickers).
- **Intraday & Overall P&L:** Computes real-time **Today's P&L** (based on previous trading day close) alongside **Total Unrealized P&L** and XIRR/ROI percentages.
- **Resilient Fallback Engine:** Live price service with ticker normalization, batch processing, and built-in rate-limiting protection.

### 3. Corporate Actions Adjuster
- **Splits, Bonuses & Demergers:** Accurately update holding quantities and adjust cost basis when corporate actions take place.
- **Audit Trails:** Attach explanatory notes and ledger remarks to holdings (e.g. *Hotels Demerger Entitlement Ratio 1:10*, *Stock Split 10:1*).

### 4. Primary Market IPO Tracker
- **End-to-End Mandate Lifecycle:** Track IPO applications from `APPLIED` to `ALLOTTED` or `NOT_ALLOTTED`.
- **UPI / ASBA Blocked Capital:** Monitor capital earmarked for ongoing primary market bids.
- **Listing Day Performance:** Automatically compute listing gains (in ₹ and %) upon allotment and debut price entry.

### 5. Portfolio Power-Up & Benchmark Alpha Audit
- **Benchmark Comparison:** Compare mutual fund annualized returns (CAGR) directly against category benchmarks (e.g., Nifty 500 TRI, Nifty 100 TRI, Nifty Smallcap 250 TRI).
- **Alpha Diagnostics:** Identify outperforming champions vs underperforming laggards dragging down overall portfolio returns.
- **Health Score & Concentration Alerts:** Automated portfolio grading (0–100 score) evaluating single-stock risk concentration and expense ratio leakages.

### 6. Mutual Fund Overlap Engine
- **Cross-Holding Detection:** Uncover hidden stock concentration between direct equity investments and underlying mutual fund portfolios (e.g., holding both direct HDFC Bank shares and large cap funds heavy in HDFC Bank).
- **Combined Exposure Weightings:** Know your true exposure across common bluechips and midcaps.

### 7. Cash, Chitti & Traditional Schemes Vault
- **Holistic Indian Net Worth:** Factor in unlisted assets including registered chit funds (Chitti pots), Fixed Deposits (FDs), Recurring Deposits (RDs), and emergency liquid ASBA buffers.
- **Consolidated Net Worth:** Unified balance sheet integrating Equities, Mutual Funds, IPO capital, and Cash Schemes.

---

## 🛠️ Architecture & Tech Stack

```
Equity IPO Analyser/
├── client/                     # React 18 Frontend (Vite)
│   ├── src/
│   │   ├── api/client.js       # Unified API client & interceptors
│   │   ├── components/         # Modular UI components & modals
│   │   ├── context/            # Auth & session context
│   │   ├── index.css           # Premium vanilla design system
│   │   └── App.jsx             # Main dashboard controller & routing
│   └── vite.config.js          # Vite config & dev server proxy
├── server/                     # Node.js Express Backend
│   ├── src/
│   │   ├── db.js               # Cloud-Ready Database wrapper (@libsql/client)
│   │   ├── index.js            # Express server & static asset serving
│   │   ├── middleware/         # JWT verification & multi-profile scoping
│   │   ├── routes/             # RESTful API endpoints
│   │   ├── services/           # Live Yahoo Finance market price service
│   │   └── seed.js             # Initial sandbox seed data generator
│   └── data/                   # Local SQLite storage (fallback)
├── vercel.json                 # Vercel Services multi-service configuration
└── package.json                # Root build & dependency scripts
```

- **Frontend:** React 18, Vite, Lucide React Icons, TanStack React Query v5, Vanilla CSS Design System.
- **Database Layer:** `@libsql/client` (Turso Cloud SQLite in production, local file-based SQLite fallback in development).
- **Backend:** Node.js, Express, async database wrapper with table auto-initialization and sandbox auto-seeding.
- **Authentication:** Stateless JSON Web Tokens (JWT) stored in secure local storage, salted bcrypt password encryption.
- **Financial Pricing:** Real-time Indian exchange ticker parsing with Yahoo Finance v8 chart integration.

---

## ⚙️ Quick Start (Local Development)

### Prerequisites
- Node.js (v18.0.0 or later)
- npm (v9.0.0 or later)

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd "Equity Ipo Analyser"

# Install Backend Dependencies
cd server
npm install

# Install Frontend Dependencies
cd ../client
npm install
```

### 2. Configure Environment

Copy `.env.example` to `server/.env`:
```bash
cp server/.env.example server/.env
```

Default configuration works out of the box with local SQLite (`portfolio.db`):
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_secure_random_key_here
```

### 3. Run Development Servers

Open two terminal sessions:

**Terminal 1 (Backend API):**
```bash
cd server
npm run dev
# Server running at http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
# Vite client running at http://localhost:5173
```

Navigate to `http://localhost:5173` in your browser. Click **"Explore Interactive Sandbox (Sample Portfolio) →"** to test with pre-seeded data.

---

## ☁️ Cloud & Production Deployment

### Option A: Vercel (Recommended — Multi-Service Deployment)
This repository includes native Vercel Services configuration (`vercel.json`) with independent `client` (Vite) and `server` (Express) services.

1. Create a free database on [Turso](https://turso.tech/):
   ```bash
   turso db create equity-portfolio
   turso db show equity-portfolio --url
   turso db tokens create equity-portfolio
   ```
2. In your Vercel Project Settings, add the following Environment Variables:
   - `TURSO_DATABASE_URL`: `libsql://your-db-name.turso.io`
   - `TURSO_AUTH_TOKEN`: `your-turso-auth-token`
   - `JWT_SECRET`: `a-strong-random-jwt-secret`
   - `NODE_ENV`: `production`
3. Deploy to Vercel:
   ```bash
   vercel
   ```
The tables will auto-initialize and populate the sandbox environment on first boot.

### Option B: Node.js Host (Docker, Render, VPS)
1. Build the client bundle:
   ```bash
   npm run build
   ```
2. Start the unified production server:
   ```bash
   NODE_ENV=production npm start
   ```

---

## 📡 REST API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account & auto-initialize default Demat portfolio |
| `POST` | `/api/auth/login` | Authenticate investor credentials |
| `POST` | `/api/auth/sandbox-reset` | Reset demo account back to pristine sample data |
| `GET` | `/api/auth/me` | Fetch active authenticated profile and demats |
| `POST` | `/api/auth/portfolios` | Add a new family profile or broker demat |
| `GET` | `/api/portfolio/summary` | Consolidated net worth, asset allocation & KPI metrics |
| `GET` | `/api/portfolio/power-up`| Benchmark alpha audit, health score & stock diagnostics |
| `GET` | `/api/equities` | List equity holdings with CMP and corporate action history |
| `POST` | `/api/equities/sync-prices`| Fetch live NSE/BSE quotes and update previous close |
| `PATCH`| `/api/equities/:id/corporate-action` | Record split, bonus, or demerger adjustment |
| `GET` | `/api/ipos` | List IPO applications with blocked capital & status |
| `GET` | `/api/mf` | List mutual fund holdings with benchmark indices |
| `GET` | `/api/overlap` | Analyze direct equity vs mutual fund overlap |
| `GET` | `/api/cash` | Retrieve Chitti pots, FDs, and traditional cash schemes |

---

## 🔒 Security & Privacy

- All sub-profile queries are rigorously scoped by verified `user_id` from the JWT payload.
- Cross-portfolio queries strictly validate ownership before resolving data.
- Passwords are encrypted using standard 10-round salted bcrypt hashes.
- Database utilizes `@libsql/client` with parameterized queries protecting against SQL injection, and cascading deletes maintaining clean relational integrity.
