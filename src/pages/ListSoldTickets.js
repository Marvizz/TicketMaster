import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Popup from './Popup';
import API_BASE_URL from '../Config';
import Navigation from '../components/Nav';
import { handleApiError } from '../contexts/ApiErrorCaught';
import { Navigate } from 'react-router-dom';
import '../styles/ListSoldTickets.css';

const ListSoldTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [targetGroupId, setTargetGroupId] = useState('');
  const [sortOption, setSortOption] = useState('');
  const [isOpen, setIsOpen] = useState(false);


  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const fetchTickets = async () => {
      setIsLoading(true);
      try {
        const response = await axios.post(`${API_BASE_URL}/api/SoldTickets`, null, {
          withCredentials: true,
        });
        console.log('Otrzymane bilety:', response.data);
        setTickets(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTickets();
  }, []);

  const handleGroupChange = (event) => {
    setSelectedGroupId(event.target.value);
  };

  const handleTicketMove = (ticket, groupId) => {
    setSelectedTicket(ticket);
    setTargetGroupId(groupId);
    setShowConfirmationPopup(true);
  };

  const confirmTicketMove = async () => {
    try {
      await axios.put(
        `${API_BASE_URL}/api/MoveTicket`,
        { ticketId: selectedTicket.Id, targetGroupId },
        { withCredentials: true }
      );
      setTickets((prevTickets) =>
        prevTickets.map((ticket) =>
          ticket.Id === selectedTicket.Id ? { ...ticket, GroupId: targetGroupId } : ticket
        )
      );
      setShowConfirmationPopup(false);
    } catch (err) {
      if(error.response.status === 401){
        handleApiError(error,Navigate)
      }else{
        console.error('Błąd podczas przenoszenia biletu:', err);
      }
    }
  };

  const cancelTicketMove = () => {
    setSelectedTicket(null);
    setTargetGroupId('');
    setShowConfirmationPopup(false);
  };

  const groupedTickets = Array.isArray(tickets) && tickets.length > 0
    ? tickets.reduce((acc, ticket) => {
        if (!acc[ticket.GroupId]) {
          acc[ticket.GroupId] = [];
        }
        acc[ticket.GroupId].push(ticket);
        return acc;
      }, {})
    : {};

  const getSortedGroupedTickets = () => {
    const sortedGroups = Object.entries(groupedTickets)
      .map(([groupId, tickets]) => ({
        groupId,
        tickets,
        isVip: tickets.some((ticket) => ticket.Vip),
        size: tickets.length,
        soldDate: tickets[0]?.SoldDate || '',
      }));

    switch (sortOption) {
      case 'vip':
        return sortedGroups.sort((a, b) => {
          if (a.isVip && !b.isVip) return -1;
          if (!a.isVip && b.isVip) return 1;
          return 0;
        });
      case 'size':
        return sortedGroups.sort((a, b) => b.size - a.size);
      case 'soldDate':
        return sortedGroups.sort((a, b) => new Date(b.soldDate) - new Date(a.soldDate));
      default:
        return sortedGroups;
    }
  };

  const handleSortOptionChange = (event) => {
    setSortOption(event.target.value);
  };

  if (isLoading) return <p>Ładowanie biletów...</p>;
  if (error) return <p>Błąd: {error}</p>;
  if (!Array.isArray(tickets) || tickets.length === 0) return <p>Brak danych</p>;

  return (
    <div className="ticket-list-container">
      <button
        className={`delete-tickets-hamburger-btn ${isOpen ? 'open' : ''}`}
        onClick={toggleMenu}
      >
        <span className={`delete-tickets-hamburger-line ${isOpen ? 'open' : ''}`}></span>
        <span className={`delete-tickets-hamburger-line ${isOpen ? 'open' : ''}`}></span>
        <span className={`delete-tickets-hamburger-line ${isOpen ? 'open' : ''}`}></span>
      </button>

      <Navigation isOpen={isOpen} toggleMenu={toggleMenu} />
      <main className="ticket-list-main-content">
        <div>
          <div>
            <h2>Lista Wszystkich biletów</h2>
            <label>
              Wybierz grupę:
              <select value={selectedGroupId} onChange={handleGroupChange}>
                <option value="">Wszystkie grupy</option>
                {Object.keys(groupedTickets).map((groupId) => (
                  <option key={groupId} value={groupId}>
                    Grupa {groupId}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <label>
                Sortuj według:
                <select value={sortOption} onChange={handleSortOptionChange}>
                  <option value="">Brak sortowania</option>
                  <option value="vip">Grupy VIP</option>
                  <option value="size">Liczba osób (malejąco)</option>
                  <option value="soldDate">Data sprzedaży (od najnowszej)</option>
                </select>
              </label>
            </div>
            {selectedGroupId ? (
              <div>
                <h3>Grupa {selectedGroupId}</h3>
                <p>
                  Liczba osób: {groupedTickets[selectedGroupId].length}<br />
                  VIP: {groupedTickets[selectedGroupId].some((ticket) => ticket.Vip) ? (
                    <span className="vip-label">Tak</span>
                  ) : 'Nie'}<br />
                  Data sprzedaży: {groupedTickets[selectedGroupId][0]?.SoldDate || 'N/A'}
                </p>
                <ul>
                  {groupedTickets[selectedGroupId].map((ticket) => (
                    <li key={ticket.Id} className={ticket.Vip ? 'vip-ticket' : ''}>
                      ID: {ticket.Id}, Nazwa: {ticket.Name}, Nr: {ticket.PhoneNr}, Data Stworzenia Biletu: {ticket.CreateDate}
                      <select
                        value={ticket.GroupId}
                        onChange={(e) => handleTicketMove(ticket, e.target.value)}
                      >
                        {Object.keys(groupedTickets).map((groupId) => (
                          <option key={groupId} value={groupId}>
                            Grupa {groupId}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              getSortedGroupedTickets().map(({ groupId, tickets, isVip }) => (
                <div key={groupId}>
                  <h3>Grupa {groupId}</h3>
                  <p>
                    Liczba osób: {tickets.length}<br />
                    VIP: {isVip ? <span className="vip-label">Tak</span> : 'Nie'}<br />
                    Data sprzedaży: {tickets[0]?.SoldDate || 'N/A'}
                  </p>
                  <ul>
                    {tickets.map((ticket) => (
                      <li key={ticket.Id} className={ticket.Vip ? 'vip-ticket' : ''}>
                        ID: {ticket.Id}, Nazwa: {ticket.Name}, Nr: {ticket.PhoneNr}, Data Stworzenia Biletu: {ticket.CreateDate}
                        <select
                          value={ticket.GroupId}
                          onChange={(e) => handleTicketMove(ticket, e.target.value)}
                        >
                          {Object.keys(groupedTickets).map((groupId) => (
                            <option key={groupId} value={groupId}>
                              Grupa {groupId}
                            </option>
                          ))}
                        </select>
                      </li>
                    ))}
                  </ul>
                  <hr />
                </div>
              ))
            )}
            <Popup
              isOpen={showConfirmationPopup}
              onConfirm={confirmTicketMove}
              onClose={cancelTicketMove}
              message={`Czy na pewno chcesz przenieść bilet ${selectedTicket?.Id} do grupy ${targetGroupId}?`}
              confirmText="Przenieś"
              cancelText="Anuluj"
              type="confirmation"
              className="ticket-list-popup-content"
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ListSoldTickets;