# main.py
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import sqlite3, uuid
from datetime import datetime
from models import init_db, DB_PATH
from generate_roster import generate_roster_pdf

app = FastAPI(title="ASPT Roster API")

# Allow your HTML frontend (even from file://) to hit this
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()  # runs on startup, safe to call repeatedly

# ── Schemas ──────────────────────────────────────────────────────────────
class NewSession(BaseModel):
    course_type: str
    instructor:  str
    location:    str
    class_date:  str
    notes:       Optional[str] = None

class CheckIn(BaseModel):
    session_id:    str
    first_name:    str
    last_name:     str
    email:         Optional[str] = None
    phone:         Optional[str] = None
    dob:           str
    waiver_agreed: bool
    signature_b64: Optional[str] = None

# ── Routes ────────────────────────────────────────────────────────────────
@app.post("/sessions")
def create_session(body: NewSession):
    session_id = uuid.uuid4().hex[:6].upper()
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT INTO sessions VALUES (?,?,?,?,?,?,datetime('now'))",
        (session_id, body.course_type, body.instructor, body.location, body.class_date, body.notes)
    )
    conn.commit(); conn.close()
    return {"session_id": session_id}

@app.post("/checkin")
def check_in(body: CheckIn):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Upsert student (match on name+dob to avoid duplicates)
    cur.execute(
        "SELECT id FROM students WHERE first_name=? AND last_name=? AND dob=?",
        (body.first_name, body.last_name, body.dob)
    )
    row = cur.fetchone()
    if row:
        student_id = row[0]
    else:
        cur.execute(
            "INSERT INTO students (first_name,last_name,email,phone,dob) VALUES (?,?,?,?,?)",
            (body.first_name, body.last_name, body.email, body.phone, body.dob)
        )
        student_id = cur.lastrowid

    cur.execute(
        "INSERT INTO enrollments (session_id,student_id,waiver_agreed,signature_b64) VALUES (?,?,?,?)",
        (body.session_id, student_id, int(body.waiver_agreed), body.signature_b64)
    )
    conn.commit(); conn.close()
    return {"status": "ok", "student_id": student_id}

@app.get("/sessions/{session_id}/roster")
def get_roster(session_id: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("""
        SELECT s.first_name, s.last_name, s.dob, s.email, s.phone,
               e.checkin_time, e.waiver_agreed, e.signature_b64
        FROM   enrollments e
        JOIN   students s ON s.id = e.student_id
        WHERE  e.session_id = ?
        ORDER  BY e.checkin_time
    """, (session_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ───────────────────────────────────────────────────────────────────────────
# Additional routes for E2E testing and roster generation
# ───────────────────────────────────────────────────────────────────────────

class WaiverSubmission(BaseModel):
    class_date: str
    course_type: str
    first_name: str
    last_name: str
    email_address: str
    phone_number: str
    signature_data: str  # base64 PNG
    waiver_agreed: bool = True


class RosterRequest(BaseModel):
    class_date: str
    course_type: str
    instructor: str
    location: str


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/submit-waiver")
def submit_waiver(body: WaiverSubmission):
    """Insert a student waiver into student_intake table."""
    conn = sqlite3.connect(DB_PATH)
    # Duplicate check
    row = conn.execute(
        "SELECT id FROM student_intake WHERE first_name = ? AND last_name = ? AND class_date = ? AND course_type = ?",
        (body.first_name, body.last_name, body.class_date, body.course_type)
    ).fetchone()
    if row:
        conn.close()
        return {"status": "already_registered", "message": "Student already checked in for this class"}
    # Insert if not duplicate
    conn.execute("""
        INSERT INTO student_intake
        (class_date, course_type, first_name, last_name,
         email_address, phone_number, signature_data, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        body.class_date,
        body.course_type,
        body.first_name,
        body.last_name,
        body.email_address,
        body.phone_number,
        body.signature_data,
        datetime.now().isoformat()
    ))
    conn.commit()
    conn.close()
    return {"status": "ok", "message": "Waiver submitted"}


@app.get("/roster")
def get_intake_roster(class_date: str, course_type: str):
    """Return all students for a given class_date and course_type."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("""
        SELECT first_name, last_name, email_address, phone_number,
               signature_data, timestamp
        FROM   student_intake
        WHERE  class_date = ? AND course_type = ?
        ORDER  BY timestamp
    """, (class_date, course_type)).fetchall()
    conn.close()
    students = [dict(r) for r in rows]
    return {"count": len(students), "students": students}


@app.post("/generate-roster")
def generate_roster(body: RosterRequest):
    """Generate PDF roster and return as file download."""
    pdf_path = generate_roster_pdf(
        class_date=body.class_date,
        course_type=body.course_type,
        instructor=body.instructor,
        location=body.location
    )
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"roster_{body.class_date}_{body.course_type}.pdf"
    )
