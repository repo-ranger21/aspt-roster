// SignaturePad.jsx
// Reusable finger/mouse signature component.
// Used by IntakeForm. Handles retina scaling automatically.

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import SigPad from 'signature_pad';

const SignaturePad = forwardRef(function SignaturePad({ onSigned, onCleared, hasError }, ref) {
  const canvasRef = useRef(null);
  const padRef    = useRef(null);
  const [signed, setSigned]   = useState(false);

  // Scale canvas for retina displays
  function resizeCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio  = window.devicePixelRatio || 1;
    const rect   = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * ratio;
    canvas.height = rect.height * ratio;
    canvas.getContext('2d').scale(ratio, ratio);
    padRef.current?.clear();
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    padRef.current = new SigPad(canvas, {
      minWidth: 1.5,
      maxWidth: 3,
      penColor: '#0D1F3C',
    });

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    padRef.current.addEventListener('beginStroke', () => {
      setSigned(true);
      onSigned?.(padRef.current.toDataURL('image/png'));
    });

    padRef.current.addEventListener('endStroke', () => {
      onSigned?.(padRef.current.toDataURL('image/png'));
    });

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      padRef.current?.off();
    };
  }, []);

  // Expose clear() to parent via ref
  useImperativeHandle(ref, () => ({
    clear() {
      padRef.current?.clear();
      setSigned(false);
      onCleared?.();
    },
    isEmpty() {
      return padRef.current?.isEmpty() ?? true;
    },
    toDataURL() {
      return padRef.current?.toDataURL('image/png');
    },
  }));

  return (
    <div className="space-y-1">
      <div
        className="relative rounded-lg overflow-hidden transition-all duration-200"
        style={{
          border: `1.5px solid ${hasError ? '#C8102E' : signed ? '#0D1F3C' : '#D1D9E6'}`,
          background: '#fff',
          touchAction: 'none',
        }}
      >
        {!signed && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
               style={{ color: '#C8D0DC', fontFamily: 'Barlow, sans-serif', fontSize: 14 }}>
            Sign here with your finger or mouse
          </div>
        )}
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: 130, cursor: 'crosshair' }}
        />
      </div>
      {signed && (
        <button
          type="button"
          onClick={() => {
            padRef.current?.clear();
            setSigned(false);
            onCleared?.();
          }}
          className="text-red text-xs underline font-body"
        >
          Clear signature
        </button>
      )}
    </div>
  );
});

export default SignaturePad;
