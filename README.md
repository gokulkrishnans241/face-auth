# Face Recognition-Based Smart Attendance Management System

A production-ready, cloud-deployable Smart Attendance Management System designed for college faculty, administrators, and students. The application automates classroom attendance using browser-based facial recognition, manages 7 distinct classrooms, schedules 6 to 7 daily periods, prevents concurrent write collisions, enforces tamper-proof audit trails for administrative corrections, and exports comprehensive 4-sheet formatted Excel (.xlsx) workbooks.

---

## 🌟 Key Capabilities & System Features

### 1. Multi-Role Portals & RBAC
- **Administrator**: Universal oversight of all 7 classrooms, timetable generator (6 or 7 periods per day), faculty and student roster management, biometric profile resets, manual attendance corrections with mandatory audit reasons, Excel report center, and tamper-proof audit logs.
- **Faculty**: Access restricted to assigned classrooms, live interactive camera HUD for facial recognition check-in, real-time Present/Absent/Unmarked counts, and authorized Excel downloads.
- **Student**: View individual attendance history, exam eligibility percentage check (>=75%), self face-enrollment with consent compliance, and date-wise attendance statements.

### 2. 7 Classrooms & 6–7 Daily Sessions
- Preconfigured 7 Classrooms (CR-101 to CR-107) spanning Computer Science, AI & DS, Information Technology, and ECE labs.
- Support for configurable 6 or 7 daily timetable periods (09:00 AM to 05:00 PM, Asia/Kolkata timezone).
- Automated absence calculation upon session closure or deadline expiration.

### 3. Biometric Facial Recognition & Privacy
- Live camera viewfinder with WebRTC video stream, tracking landmarks, and audio feedback chime.
- Anti-spoofing and liveness indicators.
- Biometric Privacy: 128-dimensional mathematical descriptor embeddings are stored with user consent timestamps, isolated with `select: false` so raw face photos and biometric vectors are never exposed via public APIs.

### 4. Concurrency Safety & Multi-Faculty Use
- Compound unique indexes on `{ studentId, sessionId, classroomId, date }` guarantee that multiple faculty taking attendance simultaneously never overwrite data or create duplicate records.

### 5. Multi-Tab Formatted Excel Reports (.xlsx)
Generates institution-grade 4-sheet workbooks using ExcelJS:
1. **Daily Summary**: Date, Classroom, Total Students, Total Sessions, Present/Absent totals, Attendance %.
2. **Session Summary**: Period Number, Subject Name, Start/End Hours, Eligible Students, Present, Absent, Period %.
3. **Detailed Attendance**: Row-by-row student logs with Check-in timestamp, Status badge, Verification method, and Correction reasons.
4. **Student Summary**: Overall individual attendance records across sessions.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Axios, Canvas-Confetti, Date-fns.
- **Backend**: Node.js, Express.js, MongoDB Atlas with Mongoose ODM, JWT, Helmet, CORS, Rate-limiting, ExcelJS.
- **Biometric Processing**: WebRTC Camera Stream, Canvas 2D Landmark Overlay, Euclidean Vector Distance Matching.
- **Deployment**: Docker, Vercel / Netlify (Frontend), Render / Railway (Backend), MongoDB Atlas (Cloud Database).

---

## 🚀 Quick Start & Local Development

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Seed Database with 7 Classrooms, Faculty, and Students
```bash
npm run seed
```

### 4. Start Development Server
```bash
npm run dev
```
- Client runs at: `http://localhost:3000`
- Server API runs at: `http://localhost:5000`
- API Health Check: `http://localhost:5000/api/health`

---

## 🔑 Default Login Credentials

| Role | Email / User ID | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@college.edu` (`ADM001`) | `AdminPassword@123` | All 7 Classrooms, Audits, Corrections |
| **Faculty (CSE)** | `prof.sharma@college.edu` (`FAC101`) | `Faculty@123` | Classrooms CR-101, CR-102, CR-107 |
| **Faculty (AI&DS)** | `dr.ananya@college.edu` (`FAC102`) | `Faculty@123` | Classrooms CR-101, CR-104, CR-107 |
| **Faculty (IT)** | `prof.vikram@college.edu` (`FAC103`) | `Faculty@123` | Classrooms CR-103, CR-105 |
| **Student** | `aarav.patel@student.college.edu` (`STU2024001`) | `Student@123` | Student Dashboard & Face Enrollment |

---

## 📦 Production Deployment Summary

Refer to [DEPLOYMENT.md](file:///c:/Users/GOKUL/Desktop/New%20folder%20%283%29/DEPLOYMENT.md) for complete instructions on:
1. Setting up MongoDB Atlas cluster.
2. Deploying backend to Render (`render.yaml`).
3. Deploying frontend to Vercel (`vercel.json`).
4. Camera permissions policy configuration on HTTPS.
5. Multi-faculty concurrency and backup verification.
