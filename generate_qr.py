# generate_qr.py
# Generates a printable QR code PNG for a class session.
# The QR encodes the intake form URL with course + date pre-filled.
#
# Usage:
#   python generate_qr.py --course "BLS for Healthcare Providers" --date 2026-03-15
#   python generate_qr.py --course "Heartsaver CPR AED"           # uses today's date
#
# Output: qr_codes/ASPT_QR_2026-03-15_BLS.png  (print and tape to the door)

import argparse
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
from qrcode.image.styles.colormasks import SolidFillColorMask
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
from datetime import date
from urllib.parse import urlencode, quote_plus

# ── Config ────────────────────────────────────────────────────────────────

# Change to your deployed frontend URL when live
FRONTEND_URL = "http://localhost:8080/intake.html"

NAVY   = (13,  31,  60)
RED    = (200, 16,  46)
ORANGE = (244, 121, 32)
WHITE  = (255, 255, 255)
LIGHT  = (244, 246, 250)

OUT_DIR = Path("qr_codes")

# ── QR Generator ─────────────────────────────────────────────────────────

def generate_qr(course_type: str, class_date: str, instructor: str = "") -> Path:
    """
    Builds a branded printable QR code card and saves it as a PNG.

    The QR encodes:
        http://localhost:8080/intake.html?course=BLS+for+Healthcare+Providers&date=2026-03-15

    Returns the path to the saved PNG.
    """
    OUT_DIR.mkdir(exist_ok=True)

    # ── Build the URL ─────────────────────────────────────────────────
    params = urlencode({"course": course_type, "date": class_date})
    url    = f"{FRONTEND_URL}?{params}"

    # ── Generate QR with rounded modules + navy on white ─────────────
    qr = qrcode.QRCode(
        version=None,                      # auto-size
        error_correction=qrcode.constants.ERROR_CORRECT_H,  # 30% damage tolerance
        box_size=12,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)

    qr_img = qr.make_image(
        image_factory=StyledPilImage,
        module_drawer=RoundedModuleDrawer(),
        color_mask=SolidFillColorMask(
            back_color=WHITE,
            front_color=NAVY,
        ),
    ).convert("RGBA")

    qr_size = qr_img.size[0]   # it's square

    # ── Build the card canvas ─────────────────────────────────────────
    PAD    = 40    # outer padding
    INNER  = 20    # padding around QR box
    HEADER = 90    # navy header height
    FOOTER = 110   # info block below QR

    card_w = qr_size + (PAD + INNER) * 2
    card_h = HEADER + INNER + qr_size + INNER + FOOTER

    card = Image.new("RGBA", (card_w, card_h), WHITE)
    draw = ImageDraw.Draw(card)

    # ── Navy header bar ───────────────────────────────────────────────
    draw.rectangle([(0, 0), (card_w, HEADER)], fill=NAVY)
    # Red accent stripe
    draw.rectangle([(0, HEADER - 5), (card_w, HEADER)], fill=RED)

    # ── Header text ───────────────────────────────────────────────────
    # PIL default font — avoids requiring font files to be present
    # For production, swap these for:
    #   font_lg = ImageFont.truetype("BarlowCondensed-Bold.ttf", 26)
    try:
        font_lg = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 20)
        font_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)
        font_xs = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
    except OSError:
        font_lg = ImageFont.load_default()
        font_sm = font_lg
        font_xs = font_lg

    # Org name — centered
    org_text = "AMERICAN SAFETY PROGRAMS & TRAINING"
    bbox = draw.textbbox((0, 0), org_text, font=font_lg)
    tw   = bbox[2] - bbox[0]
    draw.text(((card_w - tw) // 2, 18), org_text, fill=WHITE, font=font_lg)

    atc_text = "AHA AUTHORIZED TRAINING CENTER"
    bbox2 = draw.textbbox((0, 0), atc_text, font=font_xs)
    tw2   = bbox2[2] - bbox2[0]
    draw.text(((card_w - tw2) // 2, 46), atc_text, fill=ORANGE, font=font_xs)

    # ── Light background behind QR ────────────────────────────────────
    qr_x = PAD + INNER
    qr_y = HEADER + INNER
    draw.rectangle(
        [(PAD, HEADER + INNER // 2), (card_w - PAD, qr_y + qr_size + INNER // 2)],
        fill=LIGHT, outline=(*NAVY, 30), width=1,
    )

    # ── Paste QR ──────────────────────────────────────────────────────
    card.paste(qr_img, (qr_x, qr_y), qr_img)

    # ── Info block (footer) ───────────────────────────────────────────
    info_y = qr_y + qr_size + INNER + 8

    # "STUDENT CHECK-IN" headline
    scan_text = "▼  STUDENT CHECK-IN  ▼"
    bbox3 = draw.textbbox((0, 0), scan_text, font=font_sm)
    tw3   = bbox3[2] - bbox3[0]
    draw.text(((card_w - tw3) // 2, info_y), scan_text, fill=RED, font=font_sm)

    # Course
    course_label = f"Course: {course_type}"
    bbox4 = draw.textbbox((0, 0), course_label, font=font_sm)
    tw4   = bbox4[2] - bbox4[0]
    draw.text(((card_w - tw4) // 2, info_y + 26), course_label, fill=NAVY, font=font_sm)

    # Date
    try:
        from datetime import datetime
        display_date = datetime.strptime(class_date, "%Y-%m-%d").strftime("%B %d, %Y")
    except ValueError:
        display_date = class_date

    date_label = f"Date: {display_date}"
    bbox5 = draw.textbbox((0, 0), date_label, font=font_sm)
    tw5   = bbox5[2] - bbox5[0]
    draw.text(((card_w - tw5) // 2, info_y + 48), date_label, fill=NAVY, font=font_sm)

    # Instructor (optional)
    if instructor:
        inst_label = f"Instructor: {instructor}"
        bbox6 = draw.textbbox((0, 0), inst_label, font=font_xs)
        tw6   = bbox6[2] - bbox6[0]
        draw.text(((card_w - tw6) // 2, info_y + 70), inst_label, fill=(100, 110, 130), font=font_xs)

    # ── Bottom border accent ──────────────────────────────────────────
    draw.rectangle([(0, card_h - 6), (card_w, card_h)], fill=NAVY)

    # ── Save ──────────────────────────────────────────────────────────
    safe_course = course_type.replace(" ", "_").replace("/", "-")[:30]
    out_path    = OUT_DIR / f"ASPT_QR_{class_date}_{safe_course}.png"
    card.convert("RGB").save(str(out_path), dpi=(300, 300))

    print(f"✓ QR code saved → {out_path}")
    print(f"  Encodes: {url}")
    return out_path


# ── CLI ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate ASPT class QR code")
    parser.add_argument("--course",     required=True, help='e.g. "BLS for Healthcare Providers"')
    parser.add_argument("--date",       default=str(date.today()), help="YYYY-MM-DD (default: today)")
    parser.add_argument("--instructor", default="",   help="Instructor name (optional, printed on card)")
    args = parser.parse_args()

    generate_qr(
        course_type=args.course,
        class_date=args.date,
        instructor=args.instructor,
    )
