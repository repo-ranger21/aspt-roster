// IntakeForm.jsx
// Student-facing sign-in form. Opened via QR code scan.
// Reads course + date from URL query params.
// Route: /intake?course=BLS+for+Healthcare+Providers&date=2026-03-15

import { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSubmitWaiver } from '../api/index.js';
import SignaturePad from './SignaturePad.jsx';

const WAIVER = `By signing below, I acknowledge that I am voluntarily participating in a training
course provided by American Safety Programs & Training Inc. (ASPT), an American Heart Association
Authorized Training Center. I understand that CPR/BLS/First Aid training involves physical activity
including chest compressions on mannequins and other hands-on skills practice. I agree to follow
all instructor directions and safety guidelines throughout the course. I acknowledge that I am
physically capable of participating in this training. I hereby release ASPT, its instructors,
officers, directors, employees, and agents from any and all liability, claims, or causes of action
arising from my participation. I confirm all information provided is accurate and complete. I
understand my digital signature has the same legal validity as a handwritten signature.`;

function Field({ label, id, error, children }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      {children}
      {error && <p className="err-msg">{error}</p>}
    </div>
  );
}

export default function IntakeForm() {
  const [params]   = useSearchParams();
  const courseType = params.get('course') || 'BLS for Healthcare Providers';
  const classDate  = params.get('date')   || new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
  });
  const [agreed,    setAgreed]    = useState(false);
  const [signature, setSignature] = useState(null);
  const [errors,    setErrors]    = useState({});
  const [submitted, setSubmitted] = useState(false);

  const sigRef = useRef(null);
  const { mutateAsync: submitWaiver, isPending } = useSubmitWaiver();

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: '' }));
  };

  function validate() {
    const e = {};
    if (!form.firstName.trim())                       e.firstName = 'Required';
    if (!form.lastName.trim())                        e.lastName  = 'Required';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))
                                                      e.email     = 'Valid email required';
    if (!form.phone.trim())                           e.phone     = 'Required';
    if (!agreed)                                      e.agreed    = 'You must agree before continuing';
    if (!signature || sigRef.current?.isEmpty())      e.signature = 'Signature required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) {
      // Scroll to first error
      document.querySelector('.error, [data-error="true"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    await submitWaiver({
      class_date:     classDate,
      course_type:    courseType,
      first_name:     form.firstName.trim(),
      last_name:      form.lastName.trim(),
      email_address:  form.email.trim(),
      phone_number:   form.phone.trim(),
      signature_data: sigRef.current.toDataURL(),
      waiver_agreed:  true,
    });

    setSubmitted(true);
  }

  // ── Success screen ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate flex items-center justify-center p-6">
        <div className="card max-w-sm w-full text-center p-10">
          <div
            className="anim-pop w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl"
            style={{ background: '#eafaf1', border: '3px solid #27ae60' }}
          >✓</div>
          <h1 className="font-condensed text-navy font-bold text-3xl mb-2 tracking-wide">
            You're Checked In!
          </h1>
          <p className="text-base mb-6" style={{ color: '#556' }}>
            Welcome, <strong>{form.firstName} {form.lastName}</strong>!<br />
            Your waiver has been recorded for<br />
            <strong>{courseType}</strong>.
          </p>
          <div className="bg-slate rounded-xl p-4 text-sm" style={{ color: '#556' }}>
            Please take a seat — your instructor will begin shortly.
          </div>
          <p className="text-xs mt-8" style={{ color: '#AAB' }}>
            American Safety Programs & Training Inc.
          </p>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate font-body">

      {/* Header */}
      <header className="bg-navy border-b-4 border-red px-5 py-4 anim-slide-down">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
          </div>
          <div>
            <div className="font-condensed text-white font-bold tracking-wide leading-tight"
                 style={{ fontSize: 17 }}>
              AMERICAN SAFETY PROGRAMS<br />&amp; TRAINING INC.
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,.5)' }}>
              AHA Authorized Training Center
            </div>
          </div>
        </div>
      </header>

      {/* Session banner */}
      <div className="bg-white border-b border-border px-5 py-3 anim-slide-down stagger-1">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div>
            <span className="label" style={{ display: 'inline' }}>Course&nbsp;</span>
            <span className="font-semibold text-navy">{courseType}</span>
          </div>
          <div>
            <span className="label" style={{ display: 'inline' }}>Date&nbsp;</span>
            <span className="font-semibold text-navy">
              {new Date(classDate + 'T12:00:00').toLocaleDateString('en-US',
                { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-5 max-w-lg mx-auto space-y-4">

        {/* Personal info card */}
        <div className="card p-5 anim-slide-up stagger-2">
          <h2 className="card-header">Your Information</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name *" id="firstName" error={errors.firstName}>
                <input
                  id="firstName" className={`field ${errors.firstName ? 'error' : ''}`}
                  value={form.firstName} onChange={set('firstName')}
                  placeholder="Jane" autoComplete="given-name" autoCapitalize="words"
                />
              </Field>
              <Field label="Last Name *" id="lastName" error={errors.lastName}>
                <input
                  id="lastName" className={`field ${errors.lastName ? 'error' : ''}`}
                  value={form.lastName} onChange={set('lastName')}
                  placeholder="Smith" autoComplete="family-name" autoCapitalize="words"
                />
              </Field>
            </div>
            <Field label="Email Address *" id="email" error={errors.email}>
              <input
                id="email" className={`field ${errors.email ? 'error' : ''}`}
                type="email" value={form.email} onChange={set('email')}
                placeholder="jane.smith@email.com"
                autoComplete="email" inputMode="email"
              />
            </Field>
            <Field label="Phone Number *" id="phone" error={errors.phone}>
              <input
                id="phone" className={`field ${errors.phone ? 'error' : ''}`}
                type="tel" value={form.phone} onChange={set('phone')}
                placeholder="(401) 555-0100"
                autoComplete="tel" inputMode="tel"
              />
            </Field>
          </div>
        </div>

        {/* Waiver card */}
        <div className="card p-5 anim-slide-up stagger-3">
          <h2 className="card-header">Liability Waiver &amp; Release</h2>
          <div
            className="bg-slate rounded-lg p-3 text-xs leading-relaxed mb-4 border border-border"
            style={{ color: '#445', maxHeight: 150, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
          >
            {WAIVER}
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="relative mt-0.5 flex-shrink-0">
              <input
                type="checkbox" id="agreed" className="sr-only"
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked);
                  setErrors((er) => ({ ...er, agreed: '' }));
                }}
              />
              <div
                onClick={() => {
                  setAgreed(a => !a);
                  setErrors((er) => ({ ...er, agreed: '' }));
                }}
                className="w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all duration-200"
                style={{
                  border: `2px solid ${agreed ? '#0D1F3C' : '#D1D9E6'}`,
                  background: agreed ? '#0D1F3C' : '#fff',
                }}
              >
                {agreed && (
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm leading-snug" style={{ color: errors.agreed ? '#C8102E' : '#445' }}>
              I have read and agree to the Liability Waiver and Release above. *
            </span>
          </label>
          {errors.agreed && <p className="err-msg mt-2">{errors.agreed}</p>}
        </div>

        {/* Signature card */}
        <div
          className="card p-5 anim-slide-up stagger-4"
          style={{ border: errors.signature ? '1.5px solid #C8102E' : undefined }}
        >
          <h2 className="card-header">Digital Signature *</h2>
          <p className="text-xs italic mb-3" style={{ color: '#889' }}>
            Sign with your finger in the box below
          </p>
          <SignaturePad
            ref={sigRef}
            onSigned={(data) => {
              setSignature(data);
              setErrors((er) => ({ ...er, signature: '' }));
            }}
            onCleared={() => setSignature(null)}
            hasError={Boolean(errors.signature)}
          />
          {errors.signature && <p className="err-msg mt-2">{errors.signature}</p>}
        </div>

        {/* Submit */}
        <div className="anim-slide-up stagger-5 pb-8">
          <button
            className="btn-primary w-full text-xl py-4"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? 'Submitting…' : '✓  Complete Check-In'}
          </button>
          <p className="text-center text-xs mt-3" style={{ color: '#AAB' }}>
            American Safety Programs & Training Inc.<br />
            AHA Authorized Training Center · Rhode Island
          </p>
        </div>

      </div>
    </div>
  );
}
