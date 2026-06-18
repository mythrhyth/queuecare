# QueueCare Healthcare Queue System

QueueCare is a dynamic, real-time queue management platform for clinics and hospitals designed to replace physical paper tokens with a live digital tracking experience. It keeps patients informed of their wait times and grants medical staff complete control over rooms, doctors, and patient queue priorities.

Built for **ease of deployment, and high-performance real-time updates**, QueueCare is 100% free-tier compatible and ready for instant cloud deployment.

---

## 🚀 Key Features

### 🏢 Receptionist & Staff Portal (Secured)
* **Real-time Analytics Dashboard**: Visualizes KPI counters (Patients Waiting, In Consultation, Completed, Active Doctors, Avg Wait Time) and renders hourly wait times, doctor loads, weekly volume, and room occupancy using Recharts.
* **Patient Registration & Triage**: Staff can register patients, assign them to specific doctors, write notes, and select priority levels (`Normal`, `Senior Citizen`, `Emergency`). Est. wait time and token are auto-generated.
* **Drag-and-Drop Room Transfer**: Effortlessly transfer patients between rooms or doctors with instant queue updates.
* **Queue Reordering**: Move patients up or down in the room queue to override standard FCFS/priority sorting.
* **Dynamic Configurations**: Update average consultation time, select token generation methods (`sequential`, `random`, `alphabetic`), toggle notifications (SMS, browser alerts), and manage bulk rooms and doctors.

### 👥 Patient Portal (Public)
* **Token Tracking**: Patients can search their token code (e.g. `T-001`) to view their live status:
  - Exact number of patients ahead of them.
  - Estimated waiting time in minutes (computed via the Wait-Time Engine).
  - Live status indicator (`Waiting`, `In Queue`, `In Consultation`, `Completed`).
* **♿ Accessibility Mode**: Fully localized in English and Hindi.
  - **High Contrast Dark Mode**: Utilizes high-visibility dark themes with extra large text sizes.
  - **Voice Announcements**: Uses the browser's speech synthesis engine to announce when it is the patient's turn. *("ध्यान दें। टोकन नंबर T-001। कृपया कक्ष संख्या 1 में जाएँ।")*

---

## 🛠 Tech Stack

* **Frontend**: React, TypeScript, Vite, TailwindCSS, TanStack React Query, Lucide Icons, Recharts, Socket.io-client.
* **Backend**: Node.js, Express.js, TypeScript, Prisma ORM, SQLite (local development) / PostgreSQL (production), JSON Web Tokens (JWT), Bcrypt.js, Socket.io.

---

## ⚙️ Environment Variables

Copy the `.env.example` templates to `.env` files for configuration.

### Local Development Environment (Root folder `.env`)
```env
VITE_API_URL=http://localhost:5000/api
```

### Local Development Environment (Backend folder `backend/.env`)
```env
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET=super-secret-key-queuecare
FRONTEND_URL=http://localhost:5173
```

---

## 💻 Local Installation & Setup

### Prerequisites
* **Node.js** (v18 or above recommended)
* **npm** or **pnpm** package manager

### 1. Backend Setup
Navigate to the `backend` directory, configure the database, and boot up the server:
```bash
# 1. Navigate to backend folder
cd backend

# 2. Install dependencies
npm install

# 3. Create the SQLite database and generate the Prisma Client
npx prisma db push

# 4. Seed the database with the professional demo dataset
npm run db:seed

# 5. Run the backend development server
npm run dev
```
The backend server runs on [http://localhost:5000](http://localhost:5000).

### 2. Frontend Setup
Open a new terminal window in the root directory:
```bash
# 1. Install frontend dependencies
npm install

# 2. Run the Vite development server
npm run dev
```
The frontend application runs on [http://localhost:5173](http://localhost:5173).

---

## 🔑 Default Login Credentials

Use the following credentials to access the receptionist and admin dashboards:

| User Role | Email | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Receptionist** | `receptionist@clinic.com` | `password123` | Registrations, Transfers, Toggles |
| **Administrator** | `admin@clinic.com` | `admin123` | Doctor & Room Configuration, Settings |

---

## 📦 Cloud Deployment & PostgreSQL Migration

To deploy the application to cloud platforms (Vercel, Netlify, Render) and connect to a production-ready database (like Neon PostgreSQL), check out the complete guide in [deployment.md](file:///c:/PROJECTS/QueueCare%20Healthcare%20Queue%20System/deployment.md).

It contains instructions on:
1. **Prisma Provider Migration**: Changing the database schema from SQLite to PostgreSQL compatibility.
2. **Neon.tech Integration**: Hosting a free PostgreSQL instance.
3. **Web Service Hosting**: Setting up Node.js server instances on Render with full Socket.IO compatibility.
4. **Static Hosting**: Deploying the frontend build folder to Vercel/Netlify.

---

## 🧪 Running Tests

Verify all APIs, queue workflows, skip functions, and auto-promotion constraints using the Jest test suite:
```bash
# Navigate to the backend directory
cd backend

# Run the Jest tests
npm test
```
