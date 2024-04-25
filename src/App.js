import React from 'react';
import { Navigate } from 'react-router-dom';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthProvider';
import RequireAuth from './components/RequireAuth';
import Dashboard from './pages/Dashboard';
import CheckTicket from './pages/CheckTicket';
import AssignTicket from './pages/AssignTicket';
import GenerateTickets from './pages/GenerateTickets';
import DeleteTickets from './pages/DeleteTickets';
import ListSoldTickets from './pages/ListSoldTickets';
import ShowPdf from './pages/ShowPdf';
import LoginPage from './pages/LoginPage';
import LogoutPage from './pages/LogoutPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/logout" element={<LogoutPage />} />
          <Route
            path="/dashboard/*"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/checkticket"
            element={
              <RequireAuth>
                <CheckTicket />
              </RequireAuth>
            }
          />
          <Route
            path="/AssignTicket"
            element={
              <RequireAuth>
                <AssignTicket />
              </RequireAuth>
            }
          />
          <Route
            path="/GenerateTickets"
            element={
              <RequireAuth>
                <GenerateTickets />
              </RequireAuth>
            }
          />
          <Route
            path="/DeleteTickets"
            element={
              <RequireAuth>
                <DeleteTickets />
              </RequireAuth>
            }
          />
          <Route
            path="/ListSoldTickets"
            element={
              <RequireAuth>
                <ListSoldTickets />
              </RequireAuth>
            }
          />
          <Route
            path="/ShowPdf"
            element={
              <RequireAuth>
                <ShowPdf />
              </RequireAuth>
            }
          />
          <Route path="/logout" element={<LogoutPage />} />
          <Route path="/" element={<AuthRedirect />} />
          <Route path="*" element={<AuthRedirect />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

function AuthRedirect() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />;
}

export default App;