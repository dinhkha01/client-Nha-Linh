import { Routes, Route, Navigate } from 'react-router-dom'
import TimekeepingPage from './pages/Timekeeping'

export default function RouteConfig() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/timekeeping" replace />} />
      <Route path="/timekeeping" element={<TimekeepingPage />} />
    </Routes>
  );
}