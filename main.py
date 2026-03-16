# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import sqlite3, uuid
from models import init_db, DB_PATH

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
