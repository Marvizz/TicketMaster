import { Link } from 'react-router-dom';
import React from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { FaTachometerAlt, FaFilePdf, FaClipboardCheck, FaListAlt, FaSignOutAlt } from 'react-icons/fa';
import { TbTicketOff, TbTicket } from 'react-icons/tb';
import { TfiTicket } from 'react-icons/tfi';
import { HiTicket } from 'react-icons/hi2';
import '../styles/nav.css';

const Navigation = ({isOpen, toggleMenu}) => {
  const { user, logout } = useAuth();
  
  const hasPermission = (requiredPermissionLevel) => {
    return user && user.PermissionsLevel !== undefined ? user.PermissionsLevel <= requiredPermissionLevel : false;
  };
  

  if (!user) {
    return null;
  }


  return (
    <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <h2>Menu</h2>
      </div>
      <ul>
        {hasPermission(3) && (
          <li>
            <Link to="/Dashboard" onClick={toggleMenu}>
              <FaTachometerAlt /> Panel Główny
            </Link>
          </li>
        )}
        {hasPermission(1) && (
          <li>
            <Link to="/ShowPdf" onClick={toggleMenu}>
              <FaFilePdf /> Pokaż PDF
            </Link>
          </li>
        )}
        {hasPermission(3) && (
          <li>
            <Link to="/CheckTicket" reloadDocument onClick={toggleMenu}>
              <HiTicket dataslot="whatever_value" /> Sprawdź Bilet
            </Link>
          </li>
        )}
        {hasPermission(2) && (
          <li>
            <Link to="/AssignTicket" reloadDocument onClick={toggleMenu}>
              <TbTicket /> Przypisz Bilet
            </Link>
          </li>
        )}
        {hasPermission(0) && (
          <li>
            <Link to="/generatetickets" onClick={toggleMenu}>
              <TfiTicket /> Wygeneruj Bilety
            </Link>
          </li>
        )}
        {hasPermission(0) && (
          <li>
            <Link to="/deletetickets" onClick={toggleMenu}>
              <TbTicketOff /> Anuluj Bilety
            </Link>
          </li>
        )}
        {hasPermission(2) && (
          <li>
            <Link to="/listsoldtickets" onClick={toggleMenu}>
              <FaListAlt /> Lista Sprzedanych Biletów
            </Link>
          </li>
        )}
        <li>
          <button onClick={logout}>
            <FaSignOutAlt /> Wyloguj
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Navigation;