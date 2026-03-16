# ASPT QR Roster & Compliance Generator

**American Safety Programs & Training Inc.**  
AHA Authorized Training Center — Rhode Island

A lightweight digital sign-in system for CPR/BLS/First Aid classes. Students scan a QR code, fill out their info, and sign the liability waiver on their phone. The instructor gets a live roster and a one-click, print-ready PDF that meets AHA and Rhode Island state compliance requirements.

---

## What It Does

| Step | Who | What Happens |
|---|---|---|
| 1 | Instructor | Opens the dashboard, fills in course details, starts the session |
| 2 | Instructor | Displays or prints the QR code |
| 3 | Student | Scans the QR code, completes the form, draws their signature |
| 4 | Instructor | Watches the live roster populate in real time |
| 5 | Instructor | Clicks "Generate PDF Roster" — compliance document downloads instantly |

---

## Project Structure

```
aspt-roster/
├── main.py              ← FastAPI server — all API routes + SQLite logic
├── models.py            ← Database schema initialization
├── generate_roster.py   ← ReportLab PDF builder — reads from DB, outputs roster
├── generate_qr.py       ← Branded QR code PNG generator (300 DPI, print-ready)
├── intake.html          ← Student-facing mobile form (opened via QR code)
├── dashboard.html       ← Instructor portal — live roster + PDF export
├── aspt-roster.jsx      ← React prototype (reference/demo only)
├── requirements.txt     ← Python dependencies
├── aspt.db              ← SQLite database (auto-created on first run, git-ignored)
├── rosters/             ← Generated PDF rosters land here (git-ignored)
└── qr_codes/            ← Generated QR PNG files land here (git-ignored)
```

---

## Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/aspt-roster.git
cd aspt-roster
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Start the API server

```bash
uvicorn main:app --reload
```

The API is now live at `http://127.0.0.1:8000`  
Interactive API docs (Swagger UI): `http://127.0.0.1:8000/docs`

### 4. Serve the HTML files

Open a second terminal:

```bash
python -m http.server 8080
```

### 5. Open the instructor dashboard

```
http://localhost:8080/dashboard.html
```

---

## Running a Class Session

### Option A — Dashboard (recommended)

1. Open `http://localhost:8080/dashboard.html`
2. Fill in course type, instructor name, date, and location
3. Click **Generate QR Code & Start Session**
4. Switch to the **QR Code** tab — display on screen or print for the door
5. Students scan → complete the form on their phones
6. Monitor check-ins live on the **Roster** tab
7. Click **Generate PDF Roster** to download the compliance document

### Option B — Generate QR code manually (print-ready PNG)

```bash
python generate_qr.py \
  --course "BLS for Healthcare Providers" \
  --date 2026-03-15 \
  --instructor "Chris M."

# Output → qr_codes/ASPT_QR_2026-03-15_BLS_for_Healthcare_Providers.png
```

### Option C — Generate PDF roster from the command line

```bash
python generate_roster.py \
  --date 2026-03-15 \
  --course "BLS for Healthcare Providers" \
  --instructor "Chris M." \
  --location "ASPT Training Center, Providence RI"

# Output → rosters/ASPT_Roster_2026-03-15_BLS_for_Healthcare_Providers.pdf
```

---

## API Reference

All endpoints are documented interactively at `http://127.0.0.1:8000/docs` when the server is running.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/submit-waiver` | Student submits the intake form |
| `GET` | `/roster` | Get all students (filter by `class_date` and/or `course_type`) |
| `POST` | `/generate-roster` | Build and download the PDF roster |
| `GET` | `/health` | Ping to confirm the server is running |

### Example: Filter roster by date and course

```
GET /roster?class_date=2026-03-15&course_type=BLS+for+Healthcare+Providers
```

### Example: Submit a waiver (POST body)

```json
{
  "class_date":     "2026-03-15",
  "course_type":    "BLS for Healthcare Providers",
  "first_name":     "Jane",
  "last_name":      "Smith",
  "email_address":  "jane.smith@email.com",
  "phone_number":   "(401) 555-0100",
  "signature_data": "data:image/png;base64,...",
  "waiver_agreed":  true
}
```

---

## Database

SQLite — zero setup required. The database file (`aspt.db`) is created automatically on first run.

**Schema — `student_intake` table:**

| Column | Type | Source | Purpose |
|---|---|---|---|
| `id` | INTEGER | Auto | Primary key |
| `class_date` | TEXT | Hidden field | Course date for roster |
| `course_type` | TEXT | Hidden field | Course name for roster header |
| `first_name` | TEXT | Student | AHA eCard spelling |
| `last_name` | TEXT | Student | AHA eCard spelling |
| `email_address` | TEXT | Student | Where cert link is sent |
| `phone_number` | TEXT | Student | Required by state auditors |
| `signature_data` | TEXT | Student | Base64 PNG of finger signature |
| `timestamp` | TEXT | Server | Legal audit trail (UTC, server-stamped) |

> ⚠️ `aspt.db` is excluded from version control via `.gitignore`. It contains real student PII — never commit it.

---

## Deployment (When Ready to Go Live)

### Backend → Render (free tier)

1. Push your repo to GitHub
2. Go to [render.com](https://render.com) → New Web Service → connect your repo
3. Set the start command: `uvicorn main:app --host 0.0.0.0 --port 10000`
4. Deploy — Render auto-builds from your `requirements.txt`
5. Copy your Render URL (e.g. `https://aspt-roster.onrender.com`)

### Frontend → Cloudflare Pages (free tier)

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com) → connect your GitHub repo
2. Set build output to `/` (no build step needed — pure HTML)
3. Deploy — Cloudflare gives you a URL (e.g. `https://aspt-roster.pages.dev`)

### Update API_BASE in both HTML files

Once deployed, open `intake.html` and `dashboard.html` and change line:

```js
// Before (local)
const API_BASE = 'http://127.0.0.1:8000';

// After (production)
const API_BASE = 'https://aspt-roster.onrender.com';
```

Commit and push — the frontend will now talk to your live backend.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| API Framework | FastAPI | Fast, modern, auto-generates docs |
| Database | SQLite | Zero setup, built into Python, sufficient for class-scale traffic |
| PDF Engine | ReportLab | Full programmatic control over layout — no PDF template dependency |
| QR Generation | qrcode + Pillow | Branded, print-ready PNGs at 300 DPI |
| Frontend | HTML + Tailwind CDN | No build step, mobile-optimized, works on any phone |
| Signature Capture | signature_pad.js | Finger-drawn signatures converted to base64 PNG |
| Backend Hosting | Render (free tier) | Handles FastAPI + SQLite with zero config |
| Frontend Hosting | Cloudflare Pages (free) | Global CDN, instant deploys from GitHub |

---

## Development Workflow

```bash
# Daily work happens on the dev branch
git checkout dev

# Make changes, then commit
git add .
git commit -m "describe what you changed"
git push

# When tested and ready for production
git checkout main
git merge dev
git push
```

---

## License

Private — American Safety Programs & Training Inc.  
All rights reserved.
