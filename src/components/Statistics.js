import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthProvider';
import API_BASE_URL from '../Config';
import '../styles/Statistics.css';

const Statistics = () => {
  const [availableTickets, setAvailableTickets] = useState(0);
  const [soldTickets, setSoldTickets] = useState(0);
  const [groupCount, setGroupCount] = useState(0);
  const [eventNames, setEventNames] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const { token } = useAuth();

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const response = await axios.post(
          `${API_BASE_URL}/api/Statistics`,
          { eventName: selectedEvent },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            withCredentials: true,
          }
        );

        if (response.status === 200) {
          const { availableTickets, soldTickets, groupCount, eventNames } = response.data;
          setAvailableTickets(availableTickets);
          setSoldTickets(soldTickets);
          setGroupCount(groupCount);
          setEventNames(eventNames);
        } else {
          console.error('Błąd podczas pobierania statystyk');
        }
      } catch (error) {
        console.error('Błąd podczas pobierania statystyk:', error);
      }
    };

    fetchStatistics();
  }, [token, selectedEvent]);

  const handleEventChange = (event) => {
    setSelectedEvent(event.target.value);
  };

  return (
    <div className="statistics-container">
      <h2>Statystyki</h2>
      <div className="event-select-container">
        <label htmlFor="eventSelect">Wybierz event:</label>
        <select id="eventSelect" value={selectedEvent} onChange={handleEventChange}>
          <option value="">Wszystkie eventy</option>
          {eventNames.map((eventName) => (
            <option key={eventName} value={eventName}>
              {eventName}
            </option>
          ))}
        </select>
      </div>
      <div className="statistics-info">
        <p>Liczba dostępnych biletów: {availableTickets}</p>
        <p>Liczba sprzedanych biletów: {soldTickets}</p>
        <p>Liczba grup: {groupCount}</p>
      </div>
    </div>
  );
};

export default Statistics;