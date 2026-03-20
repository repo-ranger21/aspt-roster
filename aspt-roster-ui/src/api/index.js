import { useQuery, useMutation } from '@tanstack/react-query';

export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

async function post(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'API error');
  }
  return res.json();
}

async function get(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return res.json();
}

export const api = {
  submitWaiver: (payload) => post('/submit-waiver', payload),
  getRoster: ({ classDate, courseType } = {}) => {
    const params = new URLSearchParams();
    if (classDate)  params.set('class_date',  classDate);
    if (courseType) params.set('course_type', courseType);
    return get(`/roster?${params}`);
  },
  generateRosterPdf: async (body) => {
    const res = await fetch(`${API_BASE}/generate-roster`, {
      method:  'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': import.meta.env.VITE_INSTRUCTOR_API_KEY ?? '',
      },
      body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PDF generation failed: ${res.status}`);
    return res.blob();
  },
  health: () => get('/health'),
};

export function useRoster({ classDate, courseType, enabled = true }) {
  return useQuery({
    queryKey:        ['roster', classDate, courseType],
    queryFn:         () => api.getRoster({ classDate, courseType }),
    enabled:         enabled && Boolean(classDate && courseType),
    refetchInterval: 15_000,
    select:          (data) => data.students ?? [],
  });
}

export function useSubmitWaiver() {
  return useMutation({ mutationFn: api.submitWaiver });
}

export function useGenerateRosterPdf() {
  return useMutation({ mutationFn: api.generateRosterPdf });
}

export function useHealth() {
  return useQuery({
    queryKey:        ['health'],
    queryFn:         api.health,
    refetchInterval: 30_000,
    retry:           1,
  });
}
