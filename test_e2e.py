import io
import os
import sys
from pathlib import Path

import base64
import requests
from PIL import Image, ImageDraw

API = "http://127.0.0.1:8000"
CLASS_DATE = "2026-03-15"
COURSE_TYPE = "BLS for Healthcare Providers"
INSTRUCTOR = "Chris M."
LOCATION = "ASPT Training Center, Providence RI"
PDF_PATH = Path("rosters/test_output.pdf")

STUDENTS = [
    {
        "first_name": "Jane",
        "last_name": "Smith",
        "email_address": "jane.smith@email.com",
        "phone_number": "(401) 555-0101",
    },
    {
        "first_name": "Marcus",
        "last_name": "Jones",
        "email_address": "m.jones@email.com",
        "phone_number": "(401) 555-0102",
    },
    {
        "first_name": "Priya",
        "last_name": "Patel",
        "email_address": "p.patel@email.com",
        "phone_number": "(401) 555-0103",
    },
    {
        "first_name": "Derek",
        "last_name": "Souza",
        "email_address": "d.souza@email.com",
        "phone_number": "(401) 555-0104",
    },
]


def create_image():
    img = Image.new("RGB", (200, 60), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.line(
        [
            (10, 40),
            (60, 20),
            (110, 40),
            (160, 15),
            (190, 35),
        ],
        fill=(13, 31, 60),
        width=2,
    )
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def make_test_signature():
    b64 = base64.b64encode(create_image()).decode("utf-8")
    return f"data:image/png;base64,{b64}"


def step_1_submit_waivers() -> bool:
    print("[STEP 1] Submitting 4 student waivers...")
    for student in STUDENTS:
        payload = {
            "class_date": CLASS_DATE,
            "course_type": COURSE_TYPE,
            "first_name": student["first_name"],
            "last_name": student["last_name"],
            "email_address": student["email_address"],
            "phone_number": student["phone_number"],
            "signature_data": make_test_signature(),
            "waiver_agreed": True,
        }
        try:
            r = requests.post(
                f"{API}/submit-waiver",
                json=payload,
                timeout=10,
            )
            r.raise_for_status()
            print(
                f"  ✓ {student['first_name']} {student['last_name']} "
                "submitted"
            )
        except Exception as e:
            print(
                f"  ✗ FAIL — [STEP 1]: {student['first_name']} "
                f"{student['last_name']}: {e}"
            )
            return False
    return True


def step_2_check_roster() -> bool:
    print("\n[STEP 2] Verifying roster count...")
    try:
        r = requests.get(
            f"{API}/roster",
            params={"class_date": CLASS_DATE, "course_type": COURSE_TYPE},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()
        if isinstance(data, dict):
            count = data.get("count", 0)
        elif isinstance(data, list):
            count = len(data)
        else:
            count = 0
        if count == 4:
            print("  ✓ PASS — 4 students found")
            return True
        else:
            print(
                f"  ✗ FAIL — [STEP 2]: {count} students found "
                "(expected 4)"
            )
            return False
    except Exception as e:
        print(f"  ✗ FAIL — [STEP 2]: {e}")
        return False


def step_3_generate_pdf() -> bool:
    print("\n[STEP 3] Generating PDF roster...")
    pdf_req = {
        "class_date": CLASS_DATE,
        "course_type": COURSE_TYPE,
        "instructor": INSTRUCTOR,
        "location": LOCATION,
    }
    try:
        r = requests.post(
            f"{API}/generate-roster",
            json=pdf_req,
            timeout=30,
        )
        r.raise_for_status()
        PDF_PATH.parent.mkdir(exist_ok=True)
        with open(PDF_PATH, "wb") as f:
            f.write(r.content)
        size_kb = PDF_PATH.stat().st_size // 1024
        if PDF_PATH.exists() and size_kb > 10:
            print(
                f"  ✓ PASS — PDF saved to {PDF_PATH} "
                f"({size_kb} KB)"
            )
            return True
        else:
            print(
                f"  ✗ FAIL — [STEP 3]: PDF missing or too small "
                f"({size_kb} KB)"
            )
            return False
    except Exception as e:
        print(f"  ✗ FAIL — [STEP 3]: {e}")
        return False


def step_4_health_check() -> bool:
    print("\n[STEP 4] Opening PDF for visual inspection...")
    try:
        if sys.platform.startswith("darwin"):
            os.system(f"open {PDF_PATH}")
        elif sys.platform.startswith("win"):
            os.system(f"start {PDF_PATH}")
        else:
            os.system(f"xdg-open {PDF_PATH}")
        print("  ✓ PDF opened — verify names and signatures appear correctly")
    except Exception as e:
        print(f"  ✗ FAIL — [STEP 4]: {e}")
    return True


def main():
    results = []
    results.append(step_1_submit_waivers())
    results.append(step_2_check_roster())
    results.append(step_3_generate_pdf())
    results.append(step_4_health_check())
    passed = sum(results)
    print(f"\nE2E TEST COMPLETE — {passed}/4 checks passed")
    if not all(results):
        sys.exit(1)


if __name__ == "__main__":
    main()



