# models.py
import sqlite3
from pathlib import Path

DB_PATH = Path("aspt.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.executescript("""
        CREATE TABLE IF NOT EXISTS sessions (
            id          TEXT PRIMARY KEY,          -- e.g. "A4F2X1"
            course_type TEXT NOT NULL,
            instructor  TEXT NOT NULL,
            location    TEXT NOT NULL,
            class_date  TEXT NOT NULL,             -- ISO: 2026-03-15
            notes       TEXT,
            created_at  TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS students (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name  TEXT NOT NULL,
            last_name   TEXT NOT NULL,
            email       TEXT,
            phone       TEXT,
            dob         TEXT NOT NULL,             -- Required for AHA roster
            created_at  TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS enrollments (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id      TEXT NOT NULL REFERENCES sessions(id),
            student_id      INTEGER NOT NULL REFERENCES students(id),
            checkin_time    TEXT DEFAULT (datetime('now')),
            waiver_agreed   INTEGER NOT NULL DEFAULT 0,   -- 0/1 bool
            signature_b64   TEXT,                         -- base64 PNG from signature_pad
            cert_issued     INTEGER DEFAULT 0,
            notes           TEXT
        );
    """)

    conn.commit()
    conn.close()
    print(f"✓ DB initialized at {DB_PATH}")

if __name__ == "__main__":
    init_db()
