// Dashboard.jsx
// Instructor portal — setup → live roster → QR display → roster preview.
// React Query polls /roster every 15s automatically.

import { useState } from 'react';
import { useRoster, useHealth } from '../api/index.js';
import QRDisplay    from './QRDisplay.jsx';
import RosterPreview from './RosterPreview.jsx';

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
      { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
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

// ── Tab button ─────────────────────────────────────────────────────────────
function TabBtn({ id, label, active, disabled, onClick }) {
  return (
    <button
      onClick={() => !disabled && onClick(id)}
      disabled={disabled}
      style={{
        background: 'none', border: 'none',
        borderBottom: active ? '3px solid #C8102E' : '3px solid transparent',
        padding: '14px 18px',
        fontFamily: 'Barlow Condensed, sans-serif',
        fontSize: 15, fontWeight: 700,
        letterSpacing: '0.04em', textTransform: 'uppercase',
        color: disabled ? '#ccc' : active ? '#C8102E' : '#6B7A99',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

// ── Setup form ─────────────────────────────────────────────────────────────
function SetupForm({ onStart }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    course:     COURSES[0],
    instructor: '',
    date:       today,
    location:   '',
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  function handleStart() {
    if (!form.instructor.trim() || !form.location.trim()) {
      alert('Please fill in Instructor Name and Location.');
      return;
    }
    onStart(form);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-condensed text-navy font-bold text-3xl tracking-wide mb-1">
        Create a Class Session
      </h1>
      <p className="text-sm mb-6" style={{ color: '#6B7A99' }}>
        Fill in the details below. A live roster and QR code will be generated for your students.
      </p>

      <div className="card p-6 space-y-4">
        <div>
          <label className="label">Course Type *</label>
          <select className="field" value={form.course} onChange={set('course')}>
            {COURSES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Instructor Name *</label>
            <input className="field" value={form.instructor} onChange={set('instructor')}
                   placeholder="e.g. Chris M." />
          </div>
          <div>
            <label className="label">Class Date *</label>
            <input className="field" type="date" value={form.date} onChange={set('date')} />
          </div>
        </div>
        <div>
          <label className="label">Location / Facility *</label>
          <input className="field" value={form.location} onChange={set('location')}
                 placeholder="e.g. ASPT Training Center, Providence RI" />
        </div>
        <button className="btn-primary w-full mt-2 text-xl py-3.5" onClick={handleStart}>
          Generate QR Code &amp; Start Session →
        </button>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        {[
          { icon: '📱', title: 'Students Scan', body: 'QR code opens the sign-in form on their phone' },
          { icon: '✍️', title: 'They Sign',     body: 'Name, contact, and finger-drawn waiver signature' },
          { icon: '📄', title: 'You Export',    body: 'One click generates a state-compliant PDF roster' },
        ].map(c => (
          <div key={c.title} className="stat-card text-center">
            <div className="text-3xl mb-2">{c.icon}</div>
            <div className="font-condensed text-navy font-bold text-sm uppercase tracking-wide mb-1">{c.title}</div>
            <div className="text-xs" style={{ color: '#6B7A99' }}>{c.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Live Roster tab ────────────────────────────────────────────────────────
function LiveRoster({ session, students, isLoading, isFetching, refetch }) {
  return (
    <div>
      {/* Stat bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Course',     value: session.course },
          { label: 'Date',       value: formatDate(session.date) },
          { label: 'Instructor', value: session.instructor },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="label mb-1">{s.label}</div>
            <div className="font-condensed text-navy font-bold text-lg leading-tight">{s.value}</div>
          </div>
        ))}
        <div className="stat-card border-l-4 border-orange">
          <div className="label mb-1">Checked In</div>
          <div className="font-condensed text-navy font-bold text-4xl">{students.length}</div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-3 mb-4">
        <button
          className="btn-secondary flex items-center gap-2"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <span className={isFetching ? 'animate-spin' : ''}>↻</span>
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
        <div className="ml-auto flex items-center gap-2 text-sm" style={{ color: '#6B7A99' }}>
          <span className="live-dot" />
          Auto-refreshes every 15s
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16 text-sm italic" style={{ color: '#AAB' }}>
            Loading roster…
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy text-white">
                {['#', 'Last Name', 'First Name', 'Phone', 'Email', 'Check-In', 'Signature'].map(h => (
                  <th key={h}
                      className="px-4 py-3 text-left font-condensed font-bold text-xs tracking-widest uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-sm italic" style={{ color: '#AAB' }}>
                    No students checked in yet. Share the QR code to get started.
                  </td>
                </tr>
              ) : students.map((s, i) => (
                <tr key={i}
                    className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate'} border-b border-border anim-row`}
                    style={{ animationDelay: `${i * 0.03}s` }}>
                  <td className="px-4 py-3 font-semibold text-xs" style={{ color: '#6B7A99' }}>{i + 1}</td>
                  <td className="px-4 py-3 font-bold text-navy">{s.last_name}</td>
                  <td className="px-4 py-3 text-navy">{s.first_name}</td>
                  <td className="px-4 py-3" style={{ color: '#556' }}>{formatPhone(s.phone_number)}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#556' }}>{s.email_address}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#778' }}>{formatTime(s.timestamp)}</td>
                  <td className="px-3 py-2">
                    {s.signature_data
                      ? <img src={s.signature_data} alt="sig"
                             style={{ height: 34, maxWidth: 110,
                                      border: '1px solid #E2E8F0', borderRadius: 3, background: '#fff' }} />
                      : <span style={{ color: '#ccc' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Dashboard shell ────────────────────────────────────────────────────────
export default function Dashboard() {
  const [session, setSession] = useState(null);   // null = setup screen
  const [tab,     setTab]     = useState('setup');

  const { data: apiHealth } = useHealth();

  const {
    data:       students = [],
    isLoading,
    isFetching,
    refetch,
  } = useRoster({
    classDate:  session?.date,
    courseType: session?.course,
    enabled:    Boolean(session),
  });

  function handleStart(formData) {
    setSession(formData);
    setTab('roster');
  }

  const tabs = [
    { id: 'setup',   label: '⚙ Setup',       disabled: false },
    { id: 'roster',  label: `📋 Live Roster${session ? ` (${students.length})` : ''}`, disabled: !session },
    { id: 'qr',      label: '📱 QR Code',     disabled: !session },
    { id: 'preview', label: '📄 Roster Preview', disabled: !session },
  ];

  return (
    <div className="min-h-screen bg-slate font-body">

      {/* Top nav */}
      <header className="bg-navy border-b-4 border-red no-print">
        <div className="max-w-7xl mx-auto px-5 flex items-center justify-between">
          <div className="flex items-center gap-3 py-4">
            <div className="w-9 h-9 bg-red rounded-lg flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
              </svg>
            </div>
            <div>
              <div className="font-condensed text-white font-bold tracking-wide leading-tight"
                   style={{ fontSize: 16 }}>
                ASPT INSTRUCTOR PORTAL
              </div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,.45)' }}>
                QR Roster &amp; Compliance Generator
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* API health indicator */}
            <div className="flex items-center gap-1.5 text-xs"
                 style={{ color: apiHealth ? '#86efac' : '#fca5a5' }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: apiHealth ? '#22c55e' : '#ef4444',
                display: 'inline-block',
              }} />
              {apiHealth ? 'API Online' : 'API Offline'}
            </div>

            {session && (
              <>
                <div className="flex items-center gap-1.5 text-sm font-semibold"
                     style={{ color: 'rgba(255,255,255,.7)' }}>
                  <span className="live-dot" /> LIVE
                </div>
                <div className="bg-orange text-white font-condensed font-bold text-sm
                                rounded-full px-4 py-1 tracking-wide">
                  {students.length} CHECKED IN
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="bg-white border-b border-border no-print">
        <div className="max-w-7xl mx-auto px-5 flex overflow-x-auto">
          {tabs.map(t => (
            <TabBtn key={t.id} {...t} active={tab === t.id} onClick={setTab} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-5 py-6">
        {tab === 'setup'   && <SetupForm onStart={handleStart} />}
        {tab === 'roster'  && session && (
          <LiveRoster
            session={session} students={students}
            isLoading={isLoading} isFetching={isFetching} refetch={refetch}
          />
        )}
        {tab === 'qr'      && session && <QRDisplay session={session} />}
        {tab === 'preview' && session && <RosterPreview session={session} students={students} />}
      </div>

    </div>
  );
}
