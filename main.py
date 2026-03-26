# main.py
import os
import re
import bleach
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.security import APIKeyHeader
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import field_validator
from fastapi.responses import FileResponse, Response
from pathlib import Path
from generate_qr import generate_qr
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import sqlite3, uuid
from datetime import datetime
from models import init_db, DB_PATH
from generate_roster import generate_roster_pdf



app = FastAPI(title="ASPT Roster API")

# ── Rate limiting ──────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/day"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Serve QR PNG ─────────────────────────────────────────────────────────
@app.get("/qr-png")
def get_qr_png(course_type: str, class_date: str, instructor: str = ""):
    """
    Returns the branded QR PNG for a class session, generating it if needed.
    URL params: course_type, class_date, instructor (optional)
    """
    out_path = generate_qr(course_type, class_date, instructor)
    if not Path(out_path).exists():
        return Response(status_code=404)
    return FileResponse(
        str(out_path),
        media_type="image/png",
        filename=Path(out_path).name
    )

API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

async def require_api_key(key: str = Depends(api_key_header)):
    expected = os.environ.get("INSTRUCTOR_API_KEY", "")
    if not expected or key != expected:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")

# ── Request size limit (2MB max) ───────────────────────────────────
@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    max_size = 2 * 1024 * 1024  # 2MB
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > max_size:
        raise HTTPException(status_code=413, detail="Request too large")
    return await call_next(request)

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


VALID_COURSES = {
    "BLS for Healthcare Providers",
    "Heartsaver CPR AED",
    "Heartsaver First Aid CPR AED",
    "ACLS", "PALS",
    "EMT-Basic Refresher",
    "First Aid Only",
    "Bloodborne Pathogens",
    "Custom / Other",
}

class WaiverSubmission(BaseModel):
    class_date:     str
    course_type:    str
    first_name:     str
    last_name:      str
    email_address:  str
    phone_number:   str
    signature_data: str
    waiver_agreed:  bool = True

    @field_validator("class_date")
    @classmethod
    def validate_date(cls, v):
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
            raise ValueError("class_date must be YYYY-MM-DD")
        return v

    @field_validator("course_type")
    @classmethod
    def validate_course(cls, v):
        if v not in VALID_COURSES:
            raise ValueError(f"Invalid course_type: {v}")
        return v

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_name(cls, v):
        v = bleach.clean(v.strip(), tags=[], strip=True)
        if not v or len(v) > 50:
            raise ValueError("Name must be 1-50 characters")
        if not re.match(r"^[A-Za-z\s'\-\.]+$", v):
            raise ValueError("Name contains invalid characters")
        return v

    @field_validator("email_address")
    @classmethod
    def validate_email(cls, v):
        v = bleach.clean(v.strip(), tags=[], strip=True)
        if len(v) > 100:
            raise ValueError("Email too long")
        return v

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v):
        v = bleach.clean(v.strip(), tags=[], strip=True)
        if len(v) > 20:
            raise ValueError("Phone too long")
        return v

    @field_validator("signature_data")
    @classmethod
    def validate_signature(cls, v):
        if not v.startswith("data:image"):
            raise ValueError("signature_data must be a base64 image")
        if len(v) > 500_000:
            raise ValueError("Signature image too large (max 500KB)")
        return v


class RosterRequest(BaseModel):
    class_date: str
    course_type: str
    instructor: str
    location: str


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/submit-waiver")
@limiter.limit("10/minute")
def submit_waiver(request: Request, body: WaiverSubmission):
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
def generate_roster(body: RosterRequest, _: str = Depends(require_api_key)):
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
