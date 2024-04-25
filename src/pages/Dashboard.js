import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../contexts/AuthProvider';
import '../styles/Dashboard.css';
import logo from '../styles/Logo.png';

import Navigation from '../components/Nav';
import ShowPdf from './ShowPdf';
import CheckTicket from './CheckTicket';
import AssignTicket from './AssignTicket';
import GenerateTickets from './GenerateTickets';
import DeleteTickets from './DeleteTickets';
import ListSoldTickets from './ListSoldTickets';

import CreateUserForm from '../components/CreateUserForm';
import Statistics from '../components/Statistics';
import RealtimeData from '../components/RealtimeData';
import TicketSalesChart from '../components/TicketSalesChart';
import EventCalendar from '../components/EventCalendar';
import UserManagement from '../components/UserManagement';


const Dashboard = () => {
  const { user, isLoading, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return <div>Ładowanie...</div>;
  }

  if (!user) {
    return <div>Nie jesteś zalogowany.</div>;
  }
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="dashboard-admin-panel">
      <button className={`dashboard-hamburger-btn ${isOpen ? 'open' : ''}`} onClick={toggleMenu}>
        <span className={`dashboard-hamburger-line ${isOpen ? 'open' : ''}`}></span>
        <span className={`dashboard-hamburger-line ${isOpen ? 'open' : ''}`}></span>
        <span className={`dashboard-hamburger-line ${isOpen ? 'open' : ''}`}></span>
      </button>
      <Navigation isOpen={isOpen} toggleMenu={toggleMenu} />
      <div className="dashboard-main-content">
        <header>
          <h2>Panel Administracyjny</h2>
        </header>
        <section className="dashboard-welcome">
          <h2>Witaj, {user?.username}!</h2>
          <p>Twoja rola: {user.PermissionsLevel}</p>
        </section>
        <main>
          <Routes>
            <Route path="/Dashboard" element={<Dashboard />} />
            <Route path="/ShowPdf" element={<ShowPdf token={token} />} />
            <Route path="/CheckTicket" element={<CheckTicket />} />
            <Route path="/AssignTicket" element={<AssignTicket />} />
            <Route path="/generatetickets" element={<GenerateTickets />} />
            <Route path="/deletetickets" element={<DeleteTickets />} />
            <Route path="/listsoldtickets" element={<ListSoldTickets />} />
          </Routes>
        </main>
        <div className="dashboard-additional-components">
          {user.PermissionsLevel <= 3 && <RealtimeData permissionsLevel={user.PermissionsLevel} />}
          {user.PermissionsLevel <= 3 && <Statistics permissionsLevel={user.PermissionsLevel} />}
          {user.PermissionsLevel <= 3 && (
            <div className="dashboard-ticket-sales-chart-container">
              <TicketSalesChart permissionsLevel={user.PermissionsLevel} />
            </div>
          )}
          {user.PermissionsLevel <= 3 && (
            <div className="dashboard-event-calendar-container">
              <EventCalendar permissionsLevel={user.PermissionsLevel} />
            </div>
          )}
          {user.PermissionsLevel <= 0 && <CreateUserForm permissionsLevel={user.PermissionsLevel} />}
          {user.PermissionsLevel <= 0 && <UserManagement permissionsLevel={user.PermissionsLevel} />}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;