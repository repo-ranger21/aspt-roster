# generate_roster.py
# Generates a print-ready AHA-style class roster PDF from the SQLite database.
# Run standalone:  python generate_roster.py --date 2026-03-15 --course "BLS for Healthcare Providers"
# Or import:       from generate_roster import generate_roster_pdf

import sqlite3
import argparse
import base64
import io
from pathlib import Path
from datetime import datetime

import fitz  # PyMuPDF

DB_PATH   = Path("aspt.db")
OUT_DIR   = Path("rosters")
TEMPLATE  = Path("blank_aha_roster.pdf")

# ── Helpers ───────────────────────────────────────────────────────────────

def fetch_students(class_date: str, course_type: str) -> list[dict]:
    """Pull all students for a given class from the database."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT first_name, last_name, email_address,
                   phone_number, signature_data, timestamp
            FROM   student_intake
            WHERE  class_date  = ?
              AND  course_type = ?
            ORDER  BY timestamp ASC
            """,
            (class_date, course_type),
        ).fetchall()
    return [dict(r) for r in rows]


def format_phone(raw: str) -> str:
    """Normalize phone to (XXX) XXX-XXXX if 10 digits, else return as-is."""
    digits = "".join(filter(str.isdigit, raw))
    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    return raw


def format_timestamp(iso: str) -> str:
    """Convert ISO 8601 UTC to readable local format for the roster."""
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return dt.strftime("%I:%M %p").lstrip("0")   # e.g. "9:04 AM"
    except Exception:
        return iso

# ── PDF Builder ───────────────────────────────────────────────────────────

def generate_roster_pdf(
    class_date:    str,
    course_type:   str,
    instructor:    str,
    location:      str,
    output_path:   Path | None = None,
) -> Path:
    """
    Build and save the roster PDF. Returns the path to the saved file.

    Args:
        class_date:   "2026-03-15"
        course_type:  "BLS for Healthcare Providers"
        instructor:   "Chris M."
        location:     "ASPT Training Center, Providence RI"
        output_path:  Override default output filename (optional)
    """
    # ── Output path ──
    OUT_DIR.mkdir(exist_ok=True)
    if output_path is None:
        safe_course = course_type.replace(" ", "_").replace("/", "-")
        output_path = OUT_DIR / f"ASPT_Roster_{class_date}_{safe_course}.pdf"

    students = fetch_students(class_date, course_type)

    # ── Open blank template ──
    doc = fitz.open(TEMPLATE)
    page = doc[0]

    # Text styling: Helvetica 8pt, navy color
    font = "helv"
    fontsize = 8
    color = (0.051, 0.122, 0.235)  # Navy: #0D1F3C

    # ── Session fields ──
    # Format date for display
    try:
        display_date = datetime.strptime(class_date, "%Y-%m-%d").strftime("%B %d, %Y")
    except ValueError:
        display_date = class_date

    page.insert_text((44, 159), course_type, fontname=font, fontsize=fontsize, color=color)
    page.insert_text((179, 159), instructor, fontname=font, fontsize=fontsize, color=color)
    page.insert_text((314, 159), display_date, fontname=font, fontsize=fontsize, color=color)
    page.insert_text((449, 159), location, fontname=font, fontsize=fontsize, color=color)

    # ── Student rows ──
    # Row 1 starts at y=577, each subsequent row decrements by 20
    ROW_START_Y = 215
    ROW_HEIGHT = 20

    for idx, s in enumerate(students[:20]):  # Max 20 students per page
        y = ROW_START_Y + (idx * ROW_HEIGHT)

        # Text fields
        page.insert_text((62, y), s.get("last_name", ""), fontname=font, fontsize=fontsize, color=color)
        page.insert_text((162, y), s.get("first_name", ""), fontname=font, fontsize=fontsize, color=color)
        page.insert_text((252, y), format_phone(s.get("phone_number", "")), fontname=font, fontsize=fontsize, color=color)
        page.insert_text((334, y), s.get("email_address", ""), fontname=font, fontsize=fontsize, color=color)
        page.insert_text((472, y), format_timestamp(s.get("timestamp", "")), fontname=font, fontsize=fontsize, color=color)

        # Signature image
        sig_data = s.get("signature_data", "")
        if sig_data:
            try:
                if "," in sig_data:
                    sig_data = sig_data.split(",", 1)[1]
                img_bytes = base64.b64decode(sig_data)
                sig_rect = fitz.Rect(522, y - 16, 576, y + 2)
                page.insert_image(
                    sig_rect,
                    stream=fitz.open("png", img_bytes)[0].get_pixmap().tobytes(),
                    keep_proportion=False,
                )
            except Exception as e:
                print(f"  ⚠ Signature render failed row {idx+1}: {e}")

    # ── Sign-off fields (leave blank for instructor to fill manually) ──
    # Coordinates provided but not pre-filled:
    # instructor_sig: x=42, y=149
    # print_name: x=222, y=149
    # date: x=402, y=149

    # ── Save ──
    doc.save(str(output_path))
    doc.close()

    print(f"✓ Roster saved → {output_path}")
    return output_path


# ── CLI Entry Point ───────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate ASPT class roster PDF")
    parser.add_argument("--date",       required=True, help="Class date: YYYY-MM-DD")
    parser.add_argument("--course",     required=True, help='e.g. "BLS for Healthcare Providers"')
    parser.add_argument("--instructor", default="",    help="Instructor name")
    parser.add_argument("--location",   default="",    help="Training location")
    args = parser.parse_args()

    generate_roster_pdf(
        class_date=args.date,
        course_type=args.course,
        instructor=args.instructor,
        location=args.location,
    )
