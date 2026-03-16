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

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, HRFlowable, Image
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# ── Branding ──────────────────────────────────────────────────────────────

NAVY   = colors.HexColor("#0D1F3C")
RED    = colors.HexColor("#C8102E")
ORANGE = colors.HexColor("#F47920")
LIGHT  = colors.HexColor("#F4F6FA")
WHITE  = colors.white
BLACK  = colors.black

DB_PATH   = Path("aspt.db")
OUT_DIR   = Path("rosters")

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


def b64_to_image(b64_string: str, width: float, height: float) -> Image | None:
    """Convert a base64 signature string to a ReportLab Image object."""
    try:
        # Strip the data URI prefix (data:image/png;base64,...)
        if "," in b64_string:
            b64_string = b64_string.split(",", 1)[1]
        img_bytes = base64.b64decode(b64_string)
        return Image(io.BytesIO(img_bytes), width=width, height=height)
    except Exception:
        return None  # Render a blank cell if signature is corrupt


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
        return dt.strftime("%-I:%M %p")   # e.g. "9:04 AM"
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

    # ── Styles ───────────────────────────────────────────────────────────
    styles = getSampleStyleSheet()

    header_org = ParagraphStyle(
        "HeaderOrg",
        fontName="Helvetica-Bold",
        fontSize=15,
        textColor=WHITE,
        leading=18,
    )
    header_sub = ParagraphStyle(
        "HeaderSub",
        fontName="Helvetica",
        fontSize=9,
        textColor=colors.HexColor("#AABBCC"),
        leading=12,
    )
    meta_label = ParagraphStyle(
        "MetaLabel",
        fontName="Helvetica-Bold",
        fontSize=7,
        textColor=colors.HexColor("#889999"),
        leading=10,
        spaceAfter=1,
    )
    meta_value = ParagraphStyle(
        "MetaValue",
        fontName="Helvetica-Bold",
        fontSize=10,
        textColor=NAVY,
        leading=13,
    )
    col_header = ParagraphStyle(
        "ColHeader",
        fontName="Helvetica-Bold",
        fontSize=8,
        textColor=WHITE,
    )
    cell_normal = ParagraphStyle(
        "CellNormal",
        fontName="Helvetica",
        fontSize=8,
        textColor=BLACK,
        leading=11,
    )
    cell_name = ParagraphStyle(
        "CellName",
        fontName="Helvetica-Bold",
        fontSize=9,
        textColor=NAVY,
        leading=12,
    )
    footer_style = ParagraphStyle(
        "Footer",
        fontName="Helvetica",
        fontSize=7,
        textColor=colors.HexColor("#AAAAAA"),
        alignment=TA_CENTER,
    )

    # ── Document ─────────────────────────────────────────────────────────
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=letter,
        leftMargin=0.5 * inch,
        rightMargin=0.5 * inch,
        topMargin=0.4 * inch,
        bottomMargin=0.5 * inch,
    )

    story = []
    PAGE_W = letter[0] - inch   # usable width

    # ── Header Block ─────────────────────────────────────────────────────
    # Navy background bar with org name + ATC badge
    header_data = [[
        Paragraph("AMERICAN SAFETY PROGRAMS & TRAINING INC.", header_org),
        Paragraph("AHA AUTHORIZED TRAINING CENTER", ParagraphStyle(
            "ATCBadge",
            fontName="Helvetica-Bold",
            fontSize=8,
            textColor=ORANGE,
            alignment=TA_RIGHT,
            leading=11,
        )),
    ]]
    header_table = Table(header_data, colWidths=[PAGE_W * 0.72, PAGE_W * 0.28])
    header_table.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), NAVY),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING",  (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING",   (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 10),
    ]))
    story.append(header_table)

    # Red accent rule
    story.append(HRFlowable(width="100%", thickness=4, color=RED, spaceAfter=0))

    # ── Session Metadata Row ──────────────────────────────────────────────
    # Formats class_date for display
    try:
        display_date = datetime.strptime(class_date, "%Y-%m-%d").strftime("%B %d, %Y")
    except ValueError:
        display_date = class_date

    generated_on = datetime.now().strftime("%B %d, %Y at %I:%M %p")

    def meta_cell(label: str, value: str):
        return [Paragraph(label.upper(), meta_label), Paragraph(value, meta_value)]

    meta_data = [[
        meta_cell("Course",     course_type),
        meta_cell("Instructor", instructor),
        meta_cell("Date",       display_date),
        meta_cell("Location",   location),
        meta_cell("Students",   str(len(students))),
    ]]
    meta_table = Table(meta_data, colWidths=[PAGE_W / 5] * 5)
    meta_table.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), LIGHT),
        ("VALIGN",       (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",  (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING",   (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 8),
        ("LINEAFTER",    (0, 0), (-2, 0), 0.5, colors.HexColor("#D1D9E6")),
    ]))
    story.append(meta_table)
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#D1D9E6"), spaceAfter=12))

    # ── Roster Title ─────────────────────────────────────────────────────
    story.append(Paragraph(
        "CLASS ATTENDANCE ROSTER &amp; LIABILITY WAIVER RECORD",
        ParagraphStyle("RosterTitle", fontName="Helvetica-Bold", fontSize=12,
                       textColor=NAVY, alignment=TA_CENTER, spaceAfter=10),
    ))

    # ── Student Table ─────────────────────────────────────────────────────
    # Column widths (must sum to PAGE_W)
    COL_W = {
        "#":         0.25 * inch,
        "Last":      1.10 * inch,
        "First":     1.00 * inch,
        "Phone":     0.95 * inch,
        "Email":     1.65 * inch,
        "Time":      0.65 * inch,
        "Signature": 1.65 * inch,
    }
    col_widths = list(COL_W.values())

    def col_hdr(text):
        return Paragraph(text, col_header)

    table_data = [[
        col_hdr("#"),
        col_hdr("LAST NAME"),
        col_hdr("FIRST NAME"),
        col_hdr("PHONE"),
        col_hdr("EMAIL"),
        col_hdr("CHECK-IN"),
        col_hdr("SIGNATURE"),
    ]]

    for idx, s in enumerate(students, start=1):
        sig_image = b64_to_image(s.get("signature_data", ""), width=1.50 * inch, height=0.38 * inch)
        sig_cell  = sig_image if sig_image else Paragraph("", cell_normal)

        row = [
            Paragraph(str(idx), cell_normal),
            Paragraph(s["last_name"],    cell_name),
            Paragraph(s["first_name"],   cell_name),
            Paragraph(format_phone(s.get("phone_number", "")), cell_normal),
            Paragraph(s.get("email_address", ""), cell_normal),
            Paragraph(format_timestamp(s.get("timestamp", "")), cell_normal),
            sig_cell,
        ]
        table_data.append(row)

    # Add blank rows so printed form still has space for late walk-ins
    BLANK_ROWS = max(0, 20 - len(students))
    for _ in range(BLANK_ROWS):
        table_data.append(["", "", "", "", "", "", ""])

    roster_table = Table(table_data, colWidths=col_widths, repeatRows=1)

    row_count = len(table_data)
    roster_table.setStyle(TableStyle([
        # Header row
        ("BACKGROUND",    (0, 0), (-1, 0),  NAVY),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  WHITE),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0),  8),
        ("TOPPADDING",    (0, 0), (-1, 0),  7),
        ("BOTTOMPADDING", (0, 0), (-1, 0),  7),

        # Data rows — alternating shading
        *[("BACKGROUND", (0, r), (-1, r), LIGHT)
          for r in range(2, row_count, 2)],

        # Grid
        ("GRID",          (0, 0), (-1, -1), 0.4, colors.HexColor("#D1D9E6")),
        ("LINEBELOW",     (0, 0), (-1, 0),  1.5, RED),

        # Cell padding
        ("TOPPADDING",    (0, 1), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 5),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 5),

        # Vertical alignment
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))

    story.append(roster_table)
    story.append(Spacer(1, 0.3 * inch))

    # ── Instructor Sign-Off Block ─────────────────────────────────────────
    signoff_data = [[
        [Paragraph("INSTRUCTOR SIGNATURE", meta_label),
         HRFlowable(width="100%", thickness=1, color=NAVY, spaceAfter=4),
         Spacer(1, 0.05 * inch)],
        [Paragraph("PRINT NAME", meta_label),
         HRFlowable(width="100%", thickness=1, color=NAVY, spaceAfter=4),
         Spacer(1, 0.05 * inch)],
        [Paragraph("DATE", meta_label),
         HRFlowable(width="100%", thickness=1, color=NAVY, spaceAfter=4),
         Spacer(1, 0.05 * inch)],
    ]]
    signoff_table = Table(signoff_data, colWidths=[PAGE_W / 3] * 3)
    signoff_table.setStyle(TableStyle([
        ("VALIGN",       (0, 0), (-1, -1), "BOTTOM"),
        ("LEFTPADDING",  (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 18),
        ("TOPPADDING",   (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
    ]))
    story.append(signoff_table)
    story.append(Spacer(1, 0.2 * inch))

    # ── Footer ────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5,
                            color=colors.HexColor("#D1D9E6"), spaceAfter=5))
    story.append(Paragraph(
        f"Generated {generated_on} · American Safety Programs &amp; Training Inc. · "
        f"AHA Authorized Training Center · schoolofamericansafety.org · "
        f"This document constitutes an official training record.",
        footer_style,
    ))

    # ── Build ─────────────────────────────────────────────────────────────
    doc.build(story)
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
