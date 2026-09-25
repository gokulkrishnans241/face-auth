# Production Deployment & Real-World Operations Guide
## Face Recognition-Based Smart Attendance Management System

This guide provides end-to-end instructions for deploying the **Smart Face Attendance Management System** to production cloud environments (MongoDB Atlas + Render/Railway backend + Vercel/Netlify frontend).

---

## 1. Architecture & Hosting Strategy

| Component | Target Platform | Protocol | Role |
| :--- | :--- | :--- | :--- |
| **Frontend** | Vercel / Netlify | HTTPS | React 18 + Vite SPA with Camera WebRTC HUD |
| **Backend API** | Render / Railway / Docker | HTTPS | Express.js REST API with ExcelJS and JWT Auth |
| **Database** | MongoDB Atlas | TLS/SSL | Persistent Cloud Database with Unique Indexes |

---

## 2. Step 1: Set Up Persistent Database (MongoDB Atlas)

1. **Create an Account**: Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and register/log in.
2. **Create a Cluster**: Select **M0 Free Shared Tier** (or Dedicated M10+ for high capacity), choose the AWS/GCP region closest to your college (e.g. `ap-south-1 Mumbai`).
3. **Configure Database User**:
   - Go to **Database Access** -> **Add New Database User**.
   - Select **Password Authentication**.
   - Username: `college_admin`
   - Password: `YourSecureDatabasePassword123` (Save this securely).
   - Role: `Read and write to any database`.
4. **Configure Network Access**:
   - Go to **Network Access** -> **Add IP Address**.
   - Choose **Allow Access from Anywhere** (`0.0.0.0/0`) so cloud servers (Render/Vercel) can securely connect with TLS.
5. **Get Connection String**:
   - Click **Connect** -> **Drivers (Node.js)**.
   - Copy connection URI format:
     ```
     mongodb+srv://college_admin:<password>@cluster0.abcde.mongodb.net/smart_attendance_prod?retryWrites=true&w=majority
     ```

---

## 3. Step 2: Deploy Backend API (Render / Railway)

### Option A: Render (Recommended)
1. Sign in to [Render.com](https://render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Configure the service settings:
   - **Name**: `smart-attendance-api`
   - **Root Directory**: Leave blank (or `server`)
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
5. **Set Environment Variables** in Render Dashboard:
   | Variable | Value | Description |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Enables optimized security & error handling |
   | `PORT` | `5000` | Server listen port |
   | `MONGODB_URI` | `mongodb+srv://...` | Your MongoDB Atlas connection URI |
   | `JWT_SECRET` | `64_char_secure_random_string` | Secret for signing JWT session tokens |
   | `TIMEZONE` | `Asia/Kolkata` | Standard college timezone |
   | `CLIENT_URL` | `https://your-frontend.vercel.app` | Allowed CORS origin |
   | `FACE_MATCH_THRESHOLD`| `0.55` | Euclidean distance match threshold |
6. Click **Create Web Service**.
7. Once deployed, note your public backend URL: `https://smart-attendance-api.onrender.com`.
8. Verify health status: Open `https://smart-attendance-api.onrender.com/api/health` in your browser.

---

## 4. Step 3: Seed Initial Administrator & 7 Classrooms

Run the automated seeding script against your cloud database:

```bash
# In your local terminal or via cloud shell:
export MONGODB_URI="mongodb+srv://college_admin:YourPassword@cluster0.mongodb.net/smart_attendance_prod?retryWrites=true&w=majority"
npm run seed
```

### Initial Seed Accounts Created:
* **Administrator**:
  - Email: `admin@college.edu`
  - User ID: `ADM001`
  - Password: `AdminPassword@123`
* **Faculty Members**:
  - `prof.sharma@college.edu` / `FAC101` / `Faculty@123` (Assigned: CR-101, CR-102, CR-107)
  - `dr.ananya@college.edu` / `FAC102` / `Faculty@123` (Assigned: CR-101, CR-104, CR-107)
  - `prof.vikram@college.edu` / `FAC103` / `Faculty@123` (Assigned: CR-103, CR-105)
  - `dr.priya@college.edu` / `FAC104` / `Faculty@123` (Assigned: CR-105, CR-106)
* **Preconfigured 7 Classrooms**:
  1. `CR-101`: Room 101 - Smart Hall Alpha (Capacity: 60)
  2. `CR-102`: Room 102 - Smart Hall Beta (Capacity: 60)
  3. `CR-103`: Room 103 - IoT & Computing Lab (Capacity: 45)
  4. `CR-104`: Room 104 - Artificial Intelligence Lab (Capacity: 45)
  5. `CR-105`: Room 105 - Systems & Networks Lab (Capacity: 45)
  6. `CR-106`: Room 106 - Seminar Hall East (Capacity: 120)
  7. `CR-107`: Room 107 - Executive Lecture Theater (Capacity: 80)

---

## 5. Step 4: Deploy Frontend to Vercel / Netlify

### Option A: Vercel (Recommended)
1. Sign in to [Vercel.com](https://vercel.com).
2. Click **Add New...** -> **Project** -> Select your GitHub repository.
3. Configure Project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Environment Variables**:
   - Key: `VITE_API_URL`
   - Value: `https://smart-attendance-api.onrender.com/api` (or your deployed backend URL).
5. Click **Deploy**.
6. Your production HTTPS URL will be live at `https://<your-project>.vercel.app`.

---

## 6. HTTPS & Camera Permission Verification

WebRTC browser camera capture (`navigator.mediaDevices.getUserMedia`) **strictly requires HTTPS** in all modern browsers.

1. Both Vercel and Render automatically provision free, auto-renewing Let's Encrypt TLS/SSL certificates.
2. The included `vercel.json` and `netlify.toml` automatically serve the HTTP header:
   ```http
   Permissions-Policy: camera=(self)
   ```
3. When faculty or students open the live camera HUD on their laptops or smartphones:
   - The browser prompts: *"Allow smart-attendance.vercel.app to use your camera?"*
   - Click **Allow**.
   - If blocked accidentally, click the padlock / camera icon in the browser address bar -> Permissions -> Camera: **Allow**.

---

## 7. Multi-Faculty Concurrency & Data Collision Protection

The system is architected for simultaneous usage by all faculty members across all 7 classrooms without race conditions:
1. **Compound Database Constraints**:
   - `attendanceRecords` has an enforced unique compound index:
     `{ studentId: 1, sessionId: 1, classroomId: 1, date: 1 }`
   - `attendanceSessions` has an enforced unique index:
     `{ classroomId: 1, date: 1, sessionNumber: 1 }`
2. **Atomic Operations**: All attendance marks use atomic MongoDB upserts (`findOneAndUpdate`) with verification locks, preventing duplicate entries when multiple devices scan the same period simultaneously.

---

## 8. Backup & Data Protection Strategy

1. **Automated Cloud Backups**:
   - MongoDB Atlas provides automated daily snapshots with point-in-time recovery.
   - Go to Atlas -> **Backup** -> Configure retention policy (7 to 30 days).
2. **Biometric Privacy Safeguards**:
   - Biometric face embeddings (128-dimensional floating point vectors) are stored separately in `faceProfiles` with `select: false` so they are never exposed in public REST payloads.
   - Students and administrators can revoke biometric consent and purge biometric records with 1-click.
