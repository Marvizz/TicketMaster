import API_BASE_URL from '../Config';
import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import axios from 'axios';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { handleApiError } from '../contexts/ApiErrorCaught';
import { useNavigate } from 'react-router-dom';
import '../styles/FullCalendarStyles.css'

const EventCalendar = () => {
  const [events, setEvents] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const [nearestEvent, setNearestEvent] = useState(null);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/EventCalendar`, { withCredentials: true })
      .then(response => {
        const events = response.data.map(event => ({
          title: event.EventName,
          date: event.EventDate,
          description: event.EventName,
        }));
        setEvents(events);


        const today = new Date();
        const nearestEvent = events.reduce((nearest, event) => {
          const eventDate = new Date(event.date);
          if (eventDate >= today && (!nearest || eventDate < new Date(nearest.date))) {
            return event;
          }
          return nearest;
        }, null);
        setNearestEvent(nearestEvent);
      })
      .catch(error => handleApiError(error, navigate));

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768); 
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const getDaysUntilEvent = (eventDate) => {
    const today = new Date();
    const diff = new Date(eventDate) - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const headerToolbarOptions = {
    start: {
      color: '#1f4444', 
    },
    prev: {
      color: '#1f4444', 
    },
    next: {
      color: '#1f4444', 
    },
    today: {
      color: '#1f4444',
    },
  };
  
  return (
    <div>
      <h2>Nadchodzące Eventy</h2>
      {nearestEvent && (
        <div className="nearest-event">
          <h3>Najbliższy Event:</h3>
          <p>
            {nearestEvent.title} Za {getDaysUntilEvent(nearestEvent.date)} dni
          </p>
        </div>
      )}
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        eventDidMount={info => {
          if (info.event.extendedProps.description) {
            info.el.setAttribute('data-tooltip-id', 'event-tooltip');
            info.el.setAttribute('data-tooltip-content', info.event.extendedProps.description);
          }
        }}
        headerToolbar={{
          start: 'prev,next today',
          center: 'title',
          end: 'prevYear,nextYear',
        }}
      />
      <Tooltip
        id="event-tooltip"
        style={
          isMobile
            ? { fontSize: '15px', padding: '4px', zIndex: 9999 }
            : { fontSize: '15px', padding: '5px', zIndex: 9999 }
        }
      />
    </div>
  );
};

export default EventCalendar;