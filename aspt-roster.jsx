import { useState, useRef, useEffect, useCallback } from "react";

const NAVY = "#0D1F3C";
const RED = "#C8102E";
const ORANGE = "#F47920";
const LIGHT = "#F4F6FA";
const BORDER = "#D1D9E6";

const WAIVER_TEXT = `By signing below, I acknowledge that I am voluntarily participating in a training course provided by American Safety Programs & Training Inc. (ASPT). I understand that CPR/BLS/First Aid training involves physical activity including chest compressions on mannequins and other hands-on practice. I agree to follow all instructor directions and safety guidelines during the course. I hereby release ASPT, its instructors, officers, and agents from any and all claims arising from my participation. I confirm that the information I have provided is accurate and complete.`;

const COURSE_TYPES = [
  "BLS for Healthcare Providers",
  "Heartsaver CPR AED",
  "Heartsaver First Aid CPR AED",
  "ACLS",
  "PALS",
  "EMT-Basic Refresher",
  "First Aid Only",
  "Bloodborne Pathogens",
  "Custom / Other",
];

const generateSessionId = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

// ── Signature Pad ──────────────────────────────────────────────────────────
function SignaturePad({ onSigned, cleared }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasSig, setHasSig] = useState(false);

  useEffect(() => {
    if (cleared) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSig(false);
    }
  }, [cleared]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    if (!hasSig) setHasSig(true);
  };

  const stop = () => {
    drawing.current = false;
    if (hasSig) {
      onSigned(canvasRef.current.toDataURL());
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
    onSigned(null);
  };

  return (
    <div>
      <div style={{ position: "relative", border: `2px solid ${hasSig ? NAVY : BORDER}`, borderRadius: 6, background: "#fff", transition: "border-color 0.2s" }}>
        <canvas
          ref={canvasRef}
          width={600}
          height={140}
          style={{ width: "100%", height: 140, display: "block", cursor: "crosshair", touchAction: "none" }}
          onMouseDown={start}
          onMouseMove={draw}
          onMouseUp={stop}
          onMouseLeave={stop}
          onTouchStart={start}
          onTouchMove={draw}
          onTouchEnd={stop}
        />
        {!hasSig && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", color: "#aab", fontFamily: "Barlow, sans-serif", fontSize: 14 }}>
            Sign here with your finger or mouse
          </div>
        )}
      </div>
      {hasSig && (
        <button onClick={clear} style={{ marginTop: 6, background: "none", border: "none", color: RED, fontSize: 12, cursor: "pointer", fontFamily: "Barlow, sans-serif", textDecoration: "underline" }}>
          Clear signature
        </button>
      )}
    </div>
  );
}

// ── QR Code Display ────────────────────────────────────────────────────────
function QRDisplay({ sessionId, sessionData }) {
  const url = `https://aspt.training/intake?session=${sessionId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}&bgcolor=FFFFFF&color=0D1F3C&margin=2`;

  return (
    <div style={{ textAlign: "center", padding: "32px 24px" }}>
      <div style={{ display: "inline-block", background: "#fff", border: `3px solid ${NAVY}`, borderRadius: 12, padding: 20, boxShadow: "0 8px 32px rgba(13,31,60,0.12)" }}>
        <img src={qrUrl} alt="QR Code" width={220} height={220} style={{ display: "block" }} />
      </div>
      <div style={{ marginTop: 20, fontFamily: "'Barlow Condensed', sans-serif", color: NAVY }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>STUDENT CHECK-IN</div>
        <div style={{ fontSize: 14, color: "#667", marginTop: 4, fontFamily: "Barlow, sans-serif" }}>Scan to sign in for today's class</div>
      </div>
      <div style={{ marginTop: 20, background: LIGHT, borderRadius: 8, padding: "14px 20px", textAlign: "left", fontFamily: "Barlow, sans-serif", fontSize: 14, color: "#445" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
          <div><span style={{ color: "#889", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Course</span><br /><strong>{sessionData.courseType}</strong></div>
          <div><span style={{ color: "#889", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Date</span><br /><strong>{sessionData.date}</strong></div>
          <div><span style={{ color: "#889", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Instructor</span><br /><strong>{sessionData.instructor}</strong></div>
          <div><span style={{ color: "#889", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Location</span><br /><strong>{sessionData.location}</strong></div>
        </div>
      </div>
      <div style={{ marginTop: 16, fontFamily: "monospace", fontSize: 11, color: "#aaa", letterSpacing: 2 }}>SESSION: {sessionId}</div>
    </div>
  );
}

// ── Student Intake Form ────────────────────────────────────────────────────
function StudentForm({ sessionData, sessionId, onSubmit }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", dob: "" });
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState(null);
  const [errors, setErrors] = useState({});
  const [sigCleared, setSigCleared] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Valid email required";
    if (!form.phone.trim()) e.phone = "Required";
    if (!form.dob) e.dob = "Required";
    if (!agreed) e.agreed = "You must agree to the waiver";
    if (!signature) e.signature = "Signature required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    onSubmit({ ...form, signature, timestamp: new Date().toLocaleTimeString() });
  };

  const inputStyle = (field) => ({
    width: "100%",
    padding: "10px 12px",
    border: `1.5px solid ${errors[field] ? RED : BORDER}`,
    borderRadius: 6,
    fontFamily: "Barlow, sans-serif",
    fontSize: 15,
    color: NAVY,
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  });

  const labelStyle = {
    display: "block",
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 0.5,
    color: "#556",
    marginBottom: 5,
    textTransform: "uppercase",
  };

  return (
    <div style={{ minHeight: "100vh", background: LIGHT, fontFamily: "Barlow, sans-serif" }}>
      {/* Header */}
      <div style={{ background: NAVY, padding: "20px 24px", borderBottom: `4px solid ${RED}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, background: RED, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          </div>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: 1 }}>AMERICAN SAFETY PROGRAMS & TRAINING</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 1 }}>Student Check-In — {sessionData?.courseType}</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 20px 48px" }}>
        {/* Session Info Banner */}
        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderLeft: `4px solid ${ORANGE}`, borderRadius: 6, padding: "12px 16px", marginBottom: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13, color: "#556" }}>
          <div><strong style={{ color: NAVY }}>📅 {sessionData?.date}</strong></div>
          <div><strong style={{ color: NAVY }}>📍 {sessionData?.location}</strong></div>
          <div>Instructor: {sessionData?.instructor}</div>
          <div>Session: {sessionId}</div>
        </div>

        {/* Personal Info */}
        <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${BORDER}`, padding: "20px 20px", marginBottom: 16 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 17, fontWeight: 700, color: NAVY, marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `2px solid ${LIGHT}`, paddingBottom: 10 }}>
            Your Information
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>First Name *</label>
              <input value={form.firstName} onChange={set("firstName")} style={inputStyle("firstName")} placeholder="Jane" />
              {errors.firstName && <div style={{ color: RED, fontSize: 11, marginTop: 3 }}>{errors.firstName}</div>}
            </div>
            <div>
              <label style={labelStyle}>Last Name *</label>
              <input value={form.lastName} onChange={set("lastName")} style={inputStyle("lastName")} placeholder="Smith" />
              {errors.lastName && <div style={{ color: RED, fontSize: 11, marginTop: 3 }}>{errors.lastName}</div>}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Email Address *</label>
            <input value={form.email} onChange={set("email")} style={inputStyle("email")} placeholder="jane.smith@email.com" type="email" />
            {errors.email && <div style={{ color: RED, fontSize: 11, marginTop: 3 }}>{errors.email}</div>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle}>Phone Number *</label>
              <input value={form.phone} onChange={set("phone")} style={inputStyle("phone")} placeholder="(401) 555-0100" type="tel" />
              {errors.phone && <div style={{ color: RED, fontSize: 11, marginTop: 3 }}>{errors.phone}</div>}
            </div>
            <div>
              <label style={labelStyle}>Date of Birth *</label>
              <input value={form.dob} onChange={set("dob")} style={inputStyle("dob")} type="date" />
              {errors.dob && <div style={{ color: RED, fontSize: 11, marginTop: 3 }}>{errors.dob}</div>}
            </div>
          </div>
        </div>

        {/* Liability Waiver */}
        <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${BORDER}`, padding: "20px 20px", marginBottom: 16 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 17, fontWeight: 700, color: NAVY, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `2px solid ${LIGHT}`, paddingBottom: 10 }}>
            Liability Waiver & Release
          </div>
          <div style={{ background: LIGHT, borderRadius: 6, padding: "14px 16px", fontSize: 13, lineHeight: 1.7, color: "#445", maxHeight: 160, overflowY: "auto", marginBottom: 14, border: `1px solid ${BORDER}` }}>
            {WAIVER_TEXT}
          </div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 2, accentColor: NAVY, width: 18, height: 18, flexShrink: 0 }} />
            <span style={{ fontSize: 14, color: errors.agreed ? RED : "#445", lineHeight: 1.5 }}>
              I have read and agree to the Liability Waiver and Release above. *
            </span>
          </label>
          {errors.agreed && <div style={{ color: RED, fontSize: 11, marginTop: 6 }}>{errors.agreed}</div>}
        </div>

        {/* Signature */}
        <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${errors.signature ? RED : BORDER}`, padding: "20px 20px", marginBottom: 24 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 17, fontWeight: 700, color: NAVY, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `2px solid ${LIGHT}`, paddingBottom: 10 }}>
            Digital Signature *
          </div>
          <div style={{ fontSize: 12, color: "#889", marginBottom: 12, fontStyle: "italic" }}>Sign using your finger (mobile) or mouse (desktop)</div>
          <SignaturePad onSigned={setSignature} cleared={sigCleared} />
          {errors.signature && <div style={{ color: RED, fontSize: 11, marginTop: 6 }}>{errors.signature}</div>}
        </div>

        {/* Submit */}
        <button
          onClick={submit}
          style={{ width: "100%", padding: "16px", background: NAVY, color: "#fff", border: "none", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: 1, cursor: "pointer", textTransform: "uppercase", transition: "background 0.2s" }}
          onMouseEnter={(e) => (e.target.style.background = RED)}
          onMouseLeave={(e) => (e.target.style.background = NAVY)}
        >
          ✓ Complete Check-In
        </button>
        <div style={{ textAlign: "center", fontSize: 11, color: "#aab", marginTop: 10 }}>
          American Safety Programs & Training Inc. · AHA Authorized Training Center
        </div>
      </div>
    </div>
  );
}

// ── Success Screen ─────────────────────────────────────────────────────────
function SuccessScreen({ name, courseType }) {
  return (
    <div style={{ minHeight: "100vh", background: LIGHT, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "48px 40px", maxWidth: 440, textAlign: "center", border: `1px solid ${BORDER}`, boxShadow: "0 8px 40px rgba(13,31,60,0.10)" }}>
        <div style={{ width: 72, height: 72, background: "#eafaf1", border: "3px solid #27ae60", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 32 }}>✓</div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 700, color: NAVY, marginBottom: 8 }}>You're Checked In!</div>
        <div style={{ fontSize: 16, color: "#667", marginBottom: 24 }}>Welcome, <strong>{name}</strong>. Your information has been recorded for <strong>{courseType}</strong>.</div>
        <div style={{ background: LIGHT, borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#556" }}>
          Please take a seat — your instructor will begin shortly. Your digital waiver has been saved.
        </div>
        <div style={{ marginTop: 28, fontSize: 12, color: "#aab" }}>American Safety Programs & Training Inc.</div>
      </div>
    </div>
  );
}

// ── Roster View ────────────────────────────────────────────────────────────
function RosterView({ students, sessionData, sessionId }) {
  const printDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div>
      {/* Print Header (shows in both screen and print) */}
      <div style={{ background: NAVY, padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }} className="no-print">
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "#fff", fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>CLASS ROSTER</div>
        <button
          onClick={() => window.print()}
          style={{ background: RED, color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 700, cursor: "pointer", letterSpacing: 0.5 }}
        >
          🖨 Print / Export PDF
        </button>
      </div>

      <div style={{ padding: "24px", fontFamily: "Barlow, sans-serif" }} id="roster-print">
        {/* Official Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `3px solid ${NAVY}`, paddingBottom: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 700, color: NAVY, letterSpacing: 1 }}>AMERICAN SAFETY PROGRAMS & TRAINING INC.</div>
            <div style={{ fontSize: 12, color: "#778", marginTop: 2 }}>AHA Authorized Training Center · Rhode Island</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, color: "#667" }}>
            <div style={{ fontWeight: 600 }}>Session ID: {sessionId}</div>
            <div>Generated: {printDate}</div>
          </div>
        </div>

        {/* Session Details Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, background: LIGHT, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "14px 18px", marginBottom: 24, fontSize: 13 }}>
          {[["Course", sessionData.courseType], ["Instructor", sessionData.instructor], ["Date", sessionData.date], ["Location", sessionData.location]].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontWeight: 700, color: "#889", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{k}</div>
              <div style={{ color: NAVY, fontWeight: 600 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Roster Table */}
        {students.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#aab", fontStyle: "italic" }}>No students checked in yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: NAVY, color: "#fff" }}>
                {["#", "Last Name", "First Name", "Date of Birth", "Phone", "Email", "Check-In Time", "Signature"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: 0.5, fontSize: 12, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : LIGHT, borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: "10px 12px", color: "#889", fontWeight: 600 }}>{i + 1}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: NAVY }}>{s.lastName}</td>
                  <td style={{ padding: "10px 12px", color: NAVY }}>{s.firstName}</td>
                  <td style={{ padding: "10px 12px", color: "#556" }}>{s.dob}</td>
                  <td style={{ padding: "10px 12px", color: "#556" }}>{s.phone}</td>
                  <td style={{ padding: "10px 12px", color: "#556" }}>{s.email}</td>
                  <td style={{ padding: "10px 12px", color: "#778" }}>{s.timestamp}</td>
                  <td style={{ padding: "6px 12px" }}>
                    {s.signature ? (
                      <img src={s.signature} alt="sig" style={{ height: 36, maxWidth: 120, border: `1px solid ${BORDER}`, borderRadius: 3, background: "#fff" }} />
                    ) : (
                      <span style={{ color: "#bbb" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Footer */}
        <div style={{ marginTop: 32, borderTop: `1px solid ${BORDER}`, paddingTop: 16, display: "flex", justifyContent: "space-between", fontSize: 11, color: "#aab" }}>
          <span>Total Students: <strong style={{ color: NAVY }}>{students.length}</strong></span>
          <span>ASPT ATC · schoolofamericansafety.org · This document is for official training records only.</span>
        </div>

        {/* Instructor Sign-off Block */}
        <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {["Instructor Signature", "Date"].map((label) => (
            <div key={label}>
              <div style={{ borderBottom: `1.5px solid ${NAVY}`, height: 40, marginBottom: 6 }} />
              <div style={{ fontSize: 11, color: "#778", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Instructor Dashboard ────────────────────────────────────────────────────
function InstructorDashboard() {
  const [tab, setTab] = useState("setup");
  const [sessionId] = useState(generateSessionId);
  const [sessionCreated, setSessionCreated] = useState(false);
  const [sessionData, setSessionData] = useState({
    courseType: COURSE_TYPES[0], instructor: "", date: new Date().toISOString().split("T")[0], location: "", notes: "",
  });
  const [students, setStudents] = useState([]);
  const [demoMode, setDemoMode] = useState(false);

  const handleCreate = () => {
    if (!sessionData.instructor || !sessionData.location) {
      alert("Please fill in Instructor Name and Location before creating the session.");
      return;
    }
    setSessionCreated(true);
    setTab("qr");
  };

  const addStudent = (s) => setStudents((prev) => [...prev, s]);

  const tabs = [
    { id: "setup", label: "⚙ Setup" },
    { id: "qr", label: "📱 QR Code", disabled: !sessionCreated },
    { id: "roster", label: `📋 Roster${students.length > 0 ? ` (${students.length})` : ""}`, disabled: !sessionCreated },
    { id: "preview", label: "👁 Student View", disabled: !sessionCreated },
  ];

  const inputStyle = {
    width: "100%", padding: "10px 12px", border: `1.5px solid ${BORDER}`, borderRadius: 6,
    fontFamily: "Barlow, sans-serif", fontSize: 15, color: NAVY, background: "#fff", outline: "none", boxSizing: "border-box",
  };
  const labelStyle = { display: "block", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: "#889", marginBottom: 5, textTransform: "uppercase" };

  return (
    <div style={{ minHeight: "100vh", background: LIGHT, fontFamily: "Barlow, sans-serif" }}>
      {/* Top Bar */}
      <div style={{ background: NAVY, borderBottom: `4px solid ${RED}`, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0" }}>
          <div style={{ width: 40, height: 40, background: RED, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🛡️</div>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: 1, lineHeight: 1.2 }}>ASPT INSTRUCTOR PORTAL</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>QR Roster & Compliance Generator</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {sessionCreated && <div style={{ fontFamily: "monospace", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 2 }}>SESSION {sessionId}</div>}
          {sessionCreated && (
            <div style={{ background: students.length > 0 ? "#27ae60" : ORANGE, color: "#fff", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 0.5 }}>
              {students.length} CHECKED IN
            </div>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${BORDER}`, display: "flex", padding: "0 24px" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => !t.disabled && setTab(t.id)}
            disabled={t.disabled}
            style={{
              background: "none", border: "none", borderBottom: tab === t.id ? `3px solid ${RED}` : "3px solid transparent",
              padding: "14px 18px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, fontWeight: 700,
              color: t.disabled ? "#ccc" : tab === t.id ? RED : "#667", cursor: t.disabled ? "not-allowed" : "pointer",
              letterSpacing: 0.5, transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 24px" }}>

        {/* SETUP TAB */}
        {tab === "setup" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 700, color: NAVY, letterSpacing: 0.5 }}>Create a Class Session</div>
              <div style={{ fontSize: 14, color: "#778", marginTop: 4 }}>Fill in the class details. A QR code will be generated for student check-in.</div>
            </div>
            <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${BORDER}`, padding: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Course Type *</label>
                  <select value={sessionData.courseType} onChange={(e) => setSessionData((d) => ({ ...d, courseType: e.target.value }))} style={{ ...inputStyle }}>
                    {COURSE_TYPES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Instructor Name *</label>
                  <input value={sessionData.instructor} onChange={(e) => setSessionData((d) => ({ ...d, instructor: e.target.value }))} style={inputStyle} placeholder="e.g. Chris M." />
                </div>
                <div>
                  <label style={labelStyle}>Class Date *</label>
                  <input type="date" value={sessionData.date} onChange={(e) => setSessionData((d) => ({ ...d, date: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Location / Facility *</label>
                  <input value={sessionData.location} onChange={(e) => setSessionData((d) => ({ ...d, location: e.target.value }))} style={inputStyle} placeholder="e.g. ASPT Training Center, Providence RI" />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Notes (Optional)</label>
                  <textarea value={sessionData.notes} onChange={(e) => setSessionData((d) => ({ ...d, notes: e.target.value }))} style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} placeholder="Any special notes for this session..." />
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={handleCreate}
                  style={{ flex: 1, padding: "14px", background: NAVY, color: "#fff", border: "none", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 19, fontWeight: 700, cursor: "pointer", letterSpacing: 1, transition: "background 0.2s" }}
                  onMouseEnter={(e) => (e.target.style.background = RED)}
                  onMouseLeave={(e) => (e.target.style.background = NAVY)}
                >
                  Generate QR Code & Start Session →
                </button>
              </div>
            </div>

            {/* Info Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 24 }}>
              {[
                { icon: "📱", title: "Students Scan QR", body: "Each student scans the QR code on their phone — no app download required." },
                { icon: "✍️", title: "Digital Sign-In", body: "They fill out their info and sign the liability waiver directly on their device." },
                { icon: "📄", title: "Instant Roster", body: "Submissions appear live on your dashboard, formatted into a print-ready compliance roster." },
              ].map((c) => (
                <div key={c.title} style={{ background: "#fff", borderRadius: 10, border: `1px solid ${BORDER}`, padding: "18px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: NAVY, fontSize: 15, marginBottom: 6 }}>{c.title}</div>
                  <div style={{ fontSize: 13, color: "#778", lineHeight: 1.5 }}>{c.body}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QR TAB */}
        {tab === "qr" && sessionCreated && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 700, color: NAVY }}>Student Check-In QR Code</div>
              <div style={{ fontSize: 14, color: "#778", marginTop: 4 }}>Display this on your screen or print it out. Students scan to access the sign-in form.</div>
            </div>
            <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
              <QRDisplay sessionId={sessionId} sessionData={sessionData} />
            </div>
            <div style={{ marginTop: 16, background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#856404" }}>
              💡 <strong>Tip:</strong> Press <kbd>Ctrl/Cmd + P</kbd> on this tab to print the QR code on paper as a backup.
            </div>
          </div>
        )}

        {/* ROSTER TAB */}
        {tab === "roster" && sessionCreated && (
          <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
            <RosterView students={students} sessionData={sessionData} sessionId={sessionId} />
          </div>
        )}

        {/* STUDENT PREVIEW TAB */}
        {tab === "preview" && sessionCreated && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 700, color: NAVY }}>Student View Preview</div>
              <div style={{ fontSize: 13, color: "#778", marginTop: 2 }}>This is what students see when they scan the QR code. Submit a test entry to see it appear on the roster.</div>
            </div>
            <div style={{ border: `2px solid ${BORDER}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 20px rgba(13,31,60,0.08)" }}>
              <StudentForm
                sessionData={sessionData}
                sessionId={sessionId}
                onSubmit={(data) => {
                  addStudent(data);
                  alert(`✓ ${data.firstName} ${data.lastName} checked in! Switch to the Roster tab to see their entry.`);
                }}
              />
            </div>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
        kbd { background: #eee; border: 1px solid #bbb; border-radius: 3px; padding: 1px 5px; font-size: 11px; }
      `}</style>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────
export default function App() {
  return <InstructorDashboard />;
}
