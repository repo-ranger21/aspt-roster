import { Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard.jsx';
import IntakeForm from './components/IntakeForm.jsx';

export default function App() {
  return (
    <Routes>
      {/* Instructor portal — default route */}
      <Route path="/" element={<Dashboard />} />

      {/* Student intake — opened via QR code scan */}
      {/* URL format: /intake?course=BLS+for+Healthcare+Providers&date=2026-03-15 */}
      <Route path="/intake" element={<IntakeForm />} />
    </Routes>
  );
}
