//usun zaznaczanie nie dziala 


import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../Config';
import Navigation from '../components/Nav';
import { useNavigate } from 'react-router-dom';
import { handleApiError } from '../contexts/ApiErrorCaught';
import '../styles/DeleteTickets.css';

const DeleteTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [groupedTickets, setGroupedTickets] = useState({});
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedTickets, setSelectedTickets] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [firstCheckedIndex, setFirstCheckedIndex] = useState(null);
  const [allChecked, setAllChecked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);


  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const fetchTickets = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/DisplayTable/Tickets`, {
          credentials: 'include',
        });

        if (!response.ok) throw new Error('Błąd sieci!');
        const data = await response.json();

        const ticketsGroupedByDateAndEvent = data.reduce((acc, ticket, index) => {
          if (ticket.Deleted === 0 || ticket.Deleted === 2 || ticket.Deleted === 4) return acc; // Pomijanie biletów oznaczonych jako usunięte pojebalem logike podczas zmiany skanowania moze byc ustawione na 1 jak skanowanie napiraw sie 

          const date = ticket.CreateDate.split(' ')[0];
          const event = ticket.EventName || 'Brak eventu';
          if (!acc[date]) {
            acc[date] = {};
          }
          if (!acc[date][event]) {
            acc[date][event] = {};
          }
          if (!acc[date][event][ticket.GroupId]) {
            acc[date][event][ticket.GroupId] = [];
          }
          ticket.index = index;
          acc[date][event][ticket.GroupId].push(ticket);
          return acc;
        }, {});
        
        setTickets(data);
        setGroupedTickets(ticketsGroupedByDateAndEvent);
        if (Object.keys(ticketsGroupedByDateAndEvent).length > 0) {
          setSelectedDate(Object.keys(ticketsGroupedByDateAndEvent)[0]);
        }
      } catch (err) {
        if(error.response.status === 401){
          handleApiError(error, navigate);
        }else{
          setError(err.message);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchTickets();
  }, []);

const handleDateChange = (event) => {
  setSelectedDate(event.target.value);
  setSelectedEvent('');
  setAllChecked(false);
  setSelectedTickets(new Set());
  };

const handleEventChange = (event) => {
  setSelectedEvent(event.target.value);
  setAllChecked(false);
  setSelectedTickets(new Set());
  };

  const handleCheckboxChange = (id, index, event) => {
    const shiftHeld = event.nativeEvent.shiftKey;
    console.log('Shift held:', shiftHeld);
    console.log('Target index:', index);
  
    const newSelectedTickets = new Set(selectedTickets);
  
    if (!shiftHeld) {
      if (newSelectedTickets.has(id)) {
        newSelectedTickets.delete(id);
      } else {
        newSelectedTickets.add(id);
        setFirstCheckedIndex(index);
      }
    } else {
      const start = firstCheckedIndex !== null ? Math.min(firstCheckedIndex, index) : index;
      const end = firstCheckedIndex !== null ? Math.max(firstCheckedIndex, index) : index;
      for (let i = start; i <= end; i++) {
        const ticket = filteredTickets[i];
        newSelectedTickets.add(ticket.Id);
      }
    }
  
    setSelectedTickets(newSelectedTickets);
    console.log('Selected tickets:', newSelectedTickets);
  
    if (newSelectedTickets.size === filteredTickets.length) {
      setAllChecked(true);
    } else {
      setAllChecked(false);
    }
  };

  const handleSelectAll = (event) => {
    const checked = event.target.checked;
    setAllChecked(checked);
  
    if (checked) {
      const allTicketIds = filteredTickets.map((ticket) => ticket.Id);
      setSelectedTickets(new Set(allTicketIds));
    } else {
      setSelectedTickets(new Set());
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/DeleteTickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ ticketIds: Array.from(selectedTickets) }),
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || 'Błąd podczas usuwania biletów!');
      }

      const updatedTickets = tickets.map(ticket => {
        if (selectedTickets.has(ticket.Id)) {
          return { ...ticket, Deleted: true };
        }
        return ticket;
      });

      setTickets(updatedTickets);

      const updatedGroupedTickets = Object.entries(groupedTickets).reduce((acc, [date, events]) => {
        acc[date] = Object.entries(events).reduce((eventsAcc, [eventName, eventTickets]) => {
          eventsAcc[eventName] = Array.isArray(eventTickets) ? eventTickets.map(ticket => {
            if (selectedTickets.has(ticket.Id)) {
              return { ...ticket, Deleted: true };
            }
            return ticket;
          }) : [];
          return eventsAcc;
        }, {});
        return acc;
      }, {});

      setGroupedTickets(updatedGroupedTickets);

      setSelectedTickets(new Set());
      setAllChecked(false);
      setError(null);

    } catch (err) {
      if(error.response.status){
        handleApiError(error, navigate);
      }else{
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
  };

  

  const filteredTickets = selectedEvent
  ? Object.values(groupedTickets[selectedDate]?.[selectedEvent] || {}).flatMap(
        tickets => tickets.filter(ticket => (ticket.Name || '').toLowerCase().includes(searchQuery.toLowerCase()))
      )
  : Object.values(groupedTickets[selectedDate] || {}).flatMap(
      events => Object.values(events).flatMap(
          tickets => tickets.filter(ticket => (ticket.Name || '').toLowerCase().includes(searchQuery.toLowerCase()))
        )
    );

      
  if (isLoading) return <p>Ładowanie biletów...</p>;
  if (error) return <p>Błąd: {error}</p>;



  return (
    <div className="delete-tickets-container">
      <button
        className={`delete-tickets-hamburger-btn ${isOpen ? 'open' : ''}`}
        onClick={toggleMenu}
      >
        <span className={`delete-tickets-hamburger-line ${isOpen ? 'open' : ''}`}></span>
        <span className={`delete-tickets-hamburger-line ${isOpen ? 'open' : ''}`}></span>
        <span className={`delete-tickets-hamburger-line ${isOpen ? 'open' : ''}`}></span>
      </button>
      <Navigation isOpen={isOpen} toggleMenu={toggleMenu} />
      <main className="delete-tickets-main-content">
        <h2>Anuluj Bilet</h2>
        <div>
          <div>
            <label>
              Wybierz datę:
              <select value={selectedDate} onChange={handleDateChange} className="delete-tickets-select">
                {Object.keys(groupedTickets).map((date) => (
                  <option key={date} value={date}>
                    {date}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Wybierz event:
              <select value={selectedEvent} onChange={handleEventChange} className="delete-tickets-select">
                <option value="">Wybierz event...</option>
                {Object.keys(groupedTickets[selectedDate] || {}).map((event) => {
                  console.log('Event:', event);
                  return (
                    <option key={event} value={event}>
                      {event}
                    </option>
                  );
                })}
              </select>
            </label>
            <input
              type="text"
              placeholder="Szukaj po nazwie..."
              value={searchQuery}
              onChange={handleSearch}
              className="delete-tickets-search-input"
            />
            <button
              onClick={handleDelete}
              disabled={selectedTickets.size === 0 || isLoading}
              className="delete-tickets-delete-button"
            >
              Usuń zaznaczone bilety
            </button>
            <label className="delete-tickets-select-all-label">
              <input type="checkbox" checked={allChecked} onChange={handleSelectAll} />
              Zaznacz wszystkie
            </label>
            <ul className="delete-tickets-list">
              {filteredTickets?.map((ticket, index) => {
                const groupSize = groupedTickets[selectedDate]?.[selectedEvent || ticket.EventName]?.[ticket.GroupId]?.length || 1;
                return (
                  <li key={ticket.Id} className="delete-tickets-list-item">
                    <input
                      type="checkbox"
                      checked={selectedTickets.has(ticket.Id)}
                      onChange={event => handleCheckboxChange(ticket.Id, index, event)}
                      className="delete-tickets-checkbox"
                    />
                    <span className="delete-tickets-id">ID: {ticket.QrCode}</span>, Nazwa: {ticket.Name || 'N/A'}, Nr: {ticket.PhoneNr}, Ile osób: {groupSize}, Data Stworzenia Biletu: {ticket.CreateDate}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DeleteTickets;