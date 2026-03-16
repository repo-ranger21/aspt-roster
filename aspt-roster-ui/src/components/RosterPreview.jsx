// RosterPreview.jsx
// Print-preview panel shown inside the Dashboard.
// Uses react-to-print so the instructor can print directly from the browser
// without leaving the app — or hit "Generate PDF" to get the ReportLab version.

import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useGenerateRosterPdf } from '../api/index.js';

function formatDate(iso) {
  try {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US',
      { month: 'long', day: 'numeric', year: 'numeric' });
  } catch { return iso; }
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString('en-US',
      { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return iso; }
}

function formatPhone(raw) {
  const d = String(raw ?? '').replace(/\D/g, '');
  return d.length === 10
    ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
    : raw;
}

// ── Printable content ─────────────────────────────────────────────────────
// Separated so react-to-print captures only this DOM node
function PrintableRoster({ session, students, ref: printRef }) {
  return (
    <div ref={printRef} className="p-6 bg-white font-body" style={{ minWidth: 700 }}>

      {/* Header */}
      <div className="flex items-end justify-between border-b-2 border-navy pb-4 mb-5">
        <div>
          <div className="font-condensed text-navy font-bold tracking-wide"
               style={{ fontSize: 22 }}>
            AMERICAN SAFETY PROGRAMS &amp; TRAINING INC.
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#778' }}>
            AHA Authorized Training Center · Rhode Island
          </div>
        </div>
        <div className="text-right text-xs" style={{ color: '#667' }}>
          <div className="font-semibold">
            Generated: {new Date().toLocaleDateString('en-US',
              { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Session meta grid */}
      <div
        className="grid gap-3 rounded-lg p-4 mb-5 border"
        style={{
          gridTemplateColumns: 'repeat(4, 1fr)',
          background: '#F4F6FA',
          borderColor: '#D1D9E6',
          fontSize: 13,
        }}
      >
        {[
          ['Course',     session.course],
          ['Instructor', session.instructor],
          ['Date',       formatDate(session.date)],
          ['Location',   session.location],
        ].map(([label, value]) => (
          <div key={label}>
            <div style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.07em', textTransform: 'uppercase', color: '#889',
              marginBottom: 2,
            }}>{label}</div>
            <div style={{ fontWeight: 600, color: '#0D1F3C' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Title */}
      <div className="text-center font-condensed text-navy font-bold uppercase tracking-wide mb-4"
           style={{ fontSize: 14 }}>
        Class Attendance Roster &amp; Liability Waiver Record
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#0D1F3C', color: '#fff' }}>
            {['#', 'Last Name', 'First Name', 'Phone', 'Email', 'Check-In', 'Signature'].map(h => (
              <th key={h} style={{
                padding: '8px 10px', textAlign: 'left',
                fontFamily: 'Barlow Condensed, sans-serif',
                fontSize: 11, fontWeight: 700,
                letterSpacing: '0.07em', textTransform: 'uppercase',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((s, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#F4F6FA', borderBottom: '1px solid #D1D9E6' }}>
              <td style={{ padding: '8px 10px', color: '#889', fontWeight: 600 }}>{i + 1}</td>
              <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0D1F3C' }}>{s.last_name}</td>
              <td style={{ padding: '8px 10px', color: '#0D1F3C' }}>{s.first_name}</td>
              <td style={{ padding: '8px 10px', color: '#556' }}>{formatPhone(s.phone_number)}</td>
              <td style={{ padding: '8px 10px', color: '#556', fontSize: 11 }}>{s.email_address}</td>
              <td style={{ padding: '8px 10px', color: '#778' }}>{formatTime(s.timestamp)}</td>
              <td style={{ padding: '5px 10px' }}>
                {s.signature_data
                  ? <img src={s.signature_data} alt="sig"
                         style={{ height: 34, maxWidth: 110, border: '1px solid #E2E8F0',
                                  borderRadius: 3, background: '#fff' }} />
                  : <span style={{ color: '#ccc' }}>—</span>}
              </td>
            </tr>
          ))}
          {/* Blank rows for walk-ins */}
          {Array.from({ length: Math.max(0, 20 - students.length) }).map((_, i) => (
            <tr key={`blank-${i}`}
                style={{ background: (students.length + i) % 2 === 0 ? '#fff' : '#F4F6FA',
                         borderBottom: '1px solid #D1D9E6' }}>
              {Array.from({ length: 7 }).map((_, j) => (
                <td key={j} style={{ padding: '8px 10px', height: 36 }} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-between mt-4 pt-3 border-t border-border text-xs" style={{ color: '#AAB' }}>
        <span>Total Students: <strong style={{ color: '#0D1F3C' }}>{students.length}</strong></span>
        <span>ASPT ATC · schoolofamericansafety.org · Official training record</span>
      </div>

      {/* Instructor sign-off */}
      <div className="grid grid-cols-3 gap-6 mt-8">
        {['Instructor Signature', 'Print Name', 'Date'].map(label => (
          <div key={label}>
            <div style={{ borderBottom: '1.5px solid #0D1F3C', height: 44, marginBottom: 5 }} />
            <div style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.07em', textTransform: 'uppercase', color: '#889',
            }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── RosterPreview ─────────────────────────────────────────────────────────
export default function RosterPreview({ session, students = [] }) {
  const printRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `ASPT_Roster_${session?.date}_${session?.course?.replace(/\s+/g, '_')}`,
  });

  const { mutateAsync: generatePdf, isPending: generatingPdf } = useGenerateRosterPdf();

  async function handleDownloadPdf() {
    const blob = await generatePdf({
      class_date:  session.date,
      course_type: session.course,
      instructor:  session.instructor,
      location:    session.location,
    });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `ASPT_Roster_${session.date}_${session.course.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (!session) return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 no-print">
        <h2 className="font-condensed text-navy font-bold text-2xl tracking-wide flex-1">
          Roster Preview
        </h2>
        <button className="btn-secondary" onClick={handlePrint}>
          🖨 Print
        </button>
        <button
          className="btn-primary"
          onClick={handleDownloadPdf}
          disabled={generatingPdf}
        >
          {generatingPdf ? '⏳ Generating…' : '📄 Download PDF'}
        </button>
      </div>

      {/* Scrollable preview wrapper */}
      <div className="card overflow-auto">
        <PrintableRoster ref={printRef} session={session} students={students} />
      </div>
    </div>
  );
}
