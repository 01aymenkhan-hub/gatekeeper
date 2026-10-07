# Gatekeeper — Visitor Management & Access Control System

A dual-runtime security, visitor management, and access control platform with real-time Pakistani CNIC & Driving License Sindh (DLS) OCR recognition, live camera capture, secure QR code pass generation, fast checkout, and role-based gate operator management.

---

## Features

- **Automated Identity OCR:**
  - Pakistani CNIC (Smart Card & Old NADRA format) field extraction.
  - Driving License Sindh (DLS) field extraction.
  - Image normalization, perspective warping, and CLAHE contrast enhancement.
- **Smart Visitor Management:**
  - Fast 3-step check-in wizard (Host info -> Document verification/OCR -> Visitor details & live portrait).
  - Multiple person categories: `VISITOR`, `VENDOR`, `INTERVIEW`, `SPECIAL_GUEST`, `CONTRACTOR`, `DELIVERY`.
  - Duplicate detection and active-visit prevention.
  - Blacklist alerting and VIP pass indicators.
- **QR Code Fast Pass & Checkout:**
  - Secure, privacy-preserving QR code visitor pass (`GKP-XXXX` format without exposed PII).
  - Instant camera-based QR scanner for swift exit logging.
  - Normalized multi-attribute smart search (Name, CNIC, Phone, Card #, Host).
- **Security & Access Control:**
  - Role-Based Access Control (RBAC): `ADMIN` and `OPERATOR`.
  - Multi-gate terminal routing with per-operator gate assignments.
  - Comprehensive immutable audit logging (`AuditLog`).
  - Real-time dashboard KPI occupancy tracking.
- **Responsive & Dual Theme:**
  - Tailored responsive layouts for Desktop, Tablet (iPad / 1024px), and Mobile.
  - Full Light and Dark mode support.

---

## Architecture & Tech Stack

- **Frontend & BFF:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **Database & ORM:** PostgreSQL, Prisma ORM
- **Authentication:** Custom JWT with HTTP-only cookies, bcryptjs password hashing
- **OCR Service:** Python FastAPI, PaddleOCR, PaddlePaddle, OpenCV
- **Scanning & Pass Generation:** `html5-qrcode`, `qrcode`, HTML5 Canvas WebRTC

---

## Getting Started

### 1. Prerequisites
- Node.js 20+
- Python 3.10 or 3.11
- PostgreSQL database

### 2. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```
Update `.env` with your PostgreSQL database URL, a secure JWT secret, and FastAPI URL.

### 3. Install Dependencies & Generate Prisma Client
```bash
# Node dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Push database schema
npx prisma db push
```

### 4. Setup Python OCR Backend
```bash
cd backend
python -m venv venv

# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
```

### 5. Run Development Servers

**Start Python OCR Service:**
```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

**Start Next.js Web App:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The first registered user automatically becomes the system `ADMIN`.

---

## License
MIT
