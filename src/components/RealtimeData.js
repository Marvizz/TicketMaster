import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import API_BASE_URL from '../Config';
import { useAuth } from '../contexts/AuthProvider';
import { useNavigate } from 'react-router-dom';

import { handleApiError } from '../contexts/ApiErrorCaught';

function App() {
  const [confirmedTickets, setConfirmedTickets] = useState(0);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const socket = io(`${API_BASE_URL}`, {
      withCredentials: true,
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    socket.on('ticketConfirmed', () => {
      console.log('Ticket confirmed event received');

      fetchConfirmedTickets();
    });

    socket.on('error', (error) => {
      console.error('Błąd socket.io:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchConfirmedTickets = useCallback(async () => {

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/confirmedTickets`,
        null,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );
      setConfirmedTickets(response.data.confirmedCount);
      console.log('Confirmed tickets updated:', response.data.confirmedCount);
    } catch (error) {
      handleApiError(error, navigate);
    }
  }, [token]);

  useEffect(() => {
    fetchConfirmedTickets();
  }, [fetchConfirmedTickets]);

  return (
    <div
      style={{
        marginTop: 0,
        marginBottom: '20px',
        fontSize: '16px',
        textAlign: 'center',
        color: '#1f4444'
      }}
    >
      <h2>Status biletów</h2>
      <p>Potwierdzone bilety: {confirmedTickets}</p>
</div>
  );
}

export default App;