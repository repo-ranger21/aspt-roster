// QRDisplay.jsx
// Shows the QR code for the active session.
// Used as a tab inside Dashboard.

const COURSES = [
  'BLS for Healthcare Providers',
  'Heartsaver CPR AED',
  'Heartsaver First Aid CPR AED',
  'ACLS',
  'PALS',
  'EMT-Basic Refresher',
  'First Aid Only',
  'Bloodborne Pathogens',
  'Custom / Other',
];

function formatDate(iso) {
  try {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US',
      { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  } catch { return iso; }
}

export default function QRDisplay({ session }) {
  if (!session) return null;

  // In dev: Vite proxy rewrites /api → localhost:8000, so the intake URL
  // points to the Vite dev server at port 5173.
  const intakeUrl = `${window.location.origin}/intake?` +
    new URLSearchParams({ course: session.course, date: session.date });


  return (
    <div className="max-w-lg">
      <h2 className="font-condensed text-navy font-bold text-2xl tracking-wide mb-1">
        Student Check-In QR Code
      </h2>
      <p className="text-sm mb-5" style={{ color: '#6B7A99' }}>
        Display this on screen or print and tape it to the door.
      </p>

      {/* QR card */}
      <div className="card overflow-hidden mb-4">
        {/* Navy header */}
        <div className="bg-navy px-6 py-4 border-b-4 border-red">
          <div className="font-condensed text-white font-bold tracking-wide text-lg">
            AMERICAN SAFETY PROGRAMS &amp; TRAINING
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,.5)' }}>
            AHA Authorized Training Center · Student Check-In
          </div>
        </div>

        {/* QR image */}
        <div className="flex justify-center py-8 bg-slate">
          <div className="bg-white rounded-2xl p-4 shadow-inner border border-border inline-block">
              <QRCodeSVG
                value={intakeUrl}
                size={240}
                fgColor="#0D1F3C"
                bgColor="#F4F6FA"
                level="H"
              />
          </div>
        </div>

        {/* Session meta */}
        <div className="border-t border-border px-6 py-4 grid grid-cols-2 gap-3 text-sm">
          {[
            ['Course',     session.course],
            ['Date',       formatDate(session.date)],
            ['Instructor', session.instructor],
            ['Location',   session.location],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="label mb-0.5">{label}</div>
              <div className="font-semibold text-navy leading-snug">{value}</div>
            </div>
          ))}
        </div>

        {/* Encoded URL */}
        <div className="border-t border-border px-6 py-3">
          <div className="label mb-1">Encoded URL</div>
          <div className="font-mono text-xs break-all" style={{ color: '#AAB' }}>
            {intakeUrl}
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="space-y-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          💡 <strong>Tip:</strong> Press{' '}
          <kbd className="bg-amber-100 border border-amber-300 rounded px-1.5 py-0.5 text-xs">
            Ctrl/Cmd + P
          </kbd>{' '}
          on this tab to print a paper copy as backup.
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          🛠 <strong>High-res print:</strong> Run{' '}
          <code className="bg-blue-100 rounded px-1.5 py-0.5 text-xs">
            python generate_qr.py --course "{session.course}" --date {session.date}
          </code>{' '}
          for a branded 300 DPI PNG.
        </div>
      </div>
    </div>
  );
}
