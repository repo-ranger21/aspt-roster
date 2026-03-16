// src/api/index.js
// All API calls + React Query hooks in one place.
// The proxy in vite.config.js rewrites /api → http://127.0.0.1:8000
// so in production just swap API_BASE to your Render URL.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const API_BASE = '/api';

// ── Raw fetch helpers ─────────────────────────────────────────────────────

async function post(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Server error ${res.status}`);
  }
  return res.json();
}

async function get(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return res.json();
}

// ── API functions ─────────────────────────────────────────────────────────

export const api = {
  /** Submit a student waiver + check-in */
  submitWaiver: (payload) => post('/submit-waiver', payload),

  /** Fetch roster — optionally filtered by date and course */
  getRoster: ({ classDate, courseType } = {}) => {
    const params = new URLSearchParams();
    if (classDate)  params.set('class_date',  classDate);
    if (courseType) params.set('course_type', courseType);
    return get(`/roster?${params}`);
  },

  /** Trigger PDF generation and return a blob for download */
  generateRosterPdf: async (body) => {
    const res = await fetch(`${API_BASE}/generate-roster`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PDF generation failed: ${res.status}`);
    return res.blob();
  },

  /** Health check */
  health: () => get('/health'),
};

// ── React Query hooks ─────────────────────────────────────────────────────

/**
 * Live roster — polls every 15 seconds when a session is active.
 * Think of it as React Query tapping your shoulder every 15s saying
 * "hey, want me to check if anyone new checked in?" — you don't have to ask.
 */
export function useRoster({ classDate, courseType, enabled = true }) {
  return useQuery({
    queryKey:        ['roster', classDate, courseType],
    queryFn:         () => api.getRoster({ classDate, courseType }),
    enabled:         enabled && Boolean(classDate && courseType),
    refetchInterval: 15_000,   // poll every 15 seconds
    select:          (data) => data.students ?? [],
  });
}

/** Submit waiver mutation */
export function useSubmitWaiver() {
  return useMutation({ mutationFn: api.submitWaiver });
}

/** Generate PDF mutation */
export function useGenerateRosterPdf() {
  return useMutation({ mutationFn: api.generateRosterPdf });
}

/** Health check — used by dashboard to show API status */
export function useHealth() {
  return useQuery({
    queryKey:        ['health'],
    queryFn:         api.health,
    refetchInterval: 30_000,
    retry:           1,
  });
}
