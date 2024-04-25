import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import DraggableQRCode from './DraggableQRCode';
import API_BASE_URL from '../Config';
import Navigation from '../components/Nav';
import { useNavigate } from 'react-router-dom';
import { handleApiError } from '../contexts/ApiErrorCaught';
import '../styles/GenerateTickets.css'


const GenerateTickets = () => {
  const [preview, setPreview] = useState('');
  const [loadedImageSize, setLoadedImageSize] = useState({ width: 0, height: 0 });
  const [ticketAmount, setTicketAmount] = useState('');
  const [eventName, setEventName] = useState('');
  const [qrPosition, setQrPosition] = useState({ x: 0, y: 0 });
  const [qrSize, setQrSize] = useState(150);
  const [dpi, setDpi] = useState(300);
  const [showDpiWarning, setShowDpiWarning] = useState(false);
  const [showQrSizeWarning, setShowQrSizeWarning] = useState(false);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [qrCodeKey, setQrCodeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isExistingEvent, setIsExistingEvent] = useState(false);
  const [eventNames, setEventNames] = useState([]);
  const [eventDate, setEventDate] = useState('');
  const navigate = useNavigate();

  const imageRef = useRef();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {

    const fetchEventNames = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/EventNames`, {
          withCredentials: true,
        });
        if (response.data && Array.isArray(response.data)) {
          const eventNames = response.data
            .map((item) => item.EventName)
            .filter((name) => name !== null && name !== undefined);
          setEventNames(eventNames);
        } else {
          console.warn('Nieprawidłowa odpowiedź z serwera:', response.data);
          setEventNames([]);
        }
      } catch (error) {
        if(error.response.status === 401){
          handleApiError(error, navigate)
        }else{
          console.error('Błąd podczas pobierania nazw eventów:', error);
          setEventNames([]);
        }
      }
    };
  
    fetchEventNames();
  }, [navigate]);

  

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    const imageUrl = URL.createObjectURL(file);
    setPreview(imageUrl);

    const img = new Image();
    img.onload = () => {
      const containerWidth = imageRef.current.offsetWidth;
      const newScaleFactor = containerWidth / img.width;
      setScaleFactor(newScaleFactor);
      setLoadedImageSize({ width: img.width, height: img.height });
    };
    img.src = imageUrl;
  };

  const handleQRCodeDrag = (position) => {
    setQrPosition({ x: position.x / scaleFactor, y: position.y / scaleFactor });
  };

  const handleDpiChange = (e) => {
    const newDpi = e.target.value;
    setDpi(newDpi);
    
    if (newDpi < 300) {
      setShowDpiWarning(true);
    } else {
      setShowDpiWarning(false);
    }
  };

  const handleQRSizeChange = (event) => {
    const newSize = event.target.value;
    setQrSize(newSize);
    if (newSize < 60) {
      setShowQrSizeWarning(true);
    } else {
      setShowQrSizeWarning(false);
    }
    setQrCodeKey((prevKey) => prevKey + 1);
  };



  useEffect(() => {
    const handleResize = () => {
      const maxWidth = document.body.clientWidth;
      let newScaleFactor;

      if (loadedImageSize.width > maxWidth) {
        newScaleFactor = maxWidth / loadedImageSize.width;
      } else {
        newScaleFactor = 1;
      }

      setQrPosition({ x: 0, y: 0 });
      setScaleFactor(newScaleFactor);
      setQrCodeKey((prevKey) => prevKey + 1);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [loadedImageSize]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    document.body.style.overflow = 'hidden';
  
    const formData = new FormData();
    formData.append('ticketAmount', ticketAmount);
    formData.append('eventName', eventName);
    formData.append('eventDate', eventDate);
    formData.append('qrPositionX', qrPosition.x);
    formData.append('qrPositionY', qrPosition.y);
    formData.append('qrSize', qrSize);
    formData.append('dpi', dpi);
  
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput && fileInput.files[0]) {
      formData.append('image', fileInput.files[0]);
    }
  
    try {
      const response = await axios.post(`${API_BASE_URL}/api/GenerateTickets`, formData, {
        withCredentials: true,
      });
  
      if (response.status === 200) {
        console.log('Odpowiedź z serwera:', response.data);
        setPreview('');
        setTicketAmount('');
        setEventName('');
        setIsExistingEvent(false);
        setLoadedImageSize({ width: 0, height: 0 });
        setQrPosition({ x: 0, y: 0 });
        setQrSize(150);
        setDpi(300);
        setEventDate('');
        fileInput.value = '';
      } else {
        console.error('Błąd podczas przesyłania formularza:', response.statusText);
      }
    } catch (error) {
      if (error.response.status === 401) {
        handleApiError(error, navigate);
      } else {
        console.log(error);
      }
    } finally {
      setIsLoading(false);
      document.body.style.overflow = '';
    }
  
    console.log(`Przesyłanie: ${ticketAmount} biletów, nazwa eventu: ${eventName}, pozycja QR: ${JSON.stringify(qrPosition)}, rozmiar QR: ${qrSize} mm, DPI: ${dpi}`);
  };

  const imageWidthInInches = loadedImageSize.width / dpi;
  const imageWidthInMM = imageWidthInInches * 25.4;
  const qrInMM = (qrSize / dpi) * 25.4;

  const maxWidth = '100vw';

  return (
    <div className="ticket-generator-panel">
      <button className={`ticket-generator-hamburger ${isOpen ? 'open' : ''}`} onClick={toggleMenu}>
        <span className={`ticket-generator-hamburger-line ${isOpen ? 'open' : ''}`}></span>
        <span className={`ticket-generator-hamburger-line ${isOpen ? 'open' : ''}`}></span>
        <span className={`ticket-generator-hamburger-line ${isOpen ? 'open' : ''}`}></span>
      </button>
      <Navigation isOpen={isOpen} toggleMenu={toggleMenu} />
      <main className="ticket-generator-content" style={{ padding: '20px' }}>
        <h2>Wygeneruj bilety</h2>
        <div>
          {isLoading && (
            <div className="ticket-generator-loading">
              <div className="ticket-generator-loading-text">
                Generowanie biletów...
              </div>
            </div>
          )}
          <h2>Wygeneruj Bilety</h2>
          <form className="ticket-generator-form" onSubmit={handleSubmit}>
            <input type="number" placeholder="Liczba biletów" value={ticketAmount} onChange={(e) => setTicketAmount(e.target.value)} required />
            <label>
              <input type="checkbox" checked={isExistingEvent} onChange={(e) => setIsExistingEvent(e.target.checked)} />
              Istniejący Event
            </label>
            {isExistingEvent ? (
              <select value={eventName} onChange={(e) => setEventName(e.target.value)} required>
                <option value="">Wybierz event</option>
                {eventNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            ) : (
              <input type="text" placeholder="Nazwa Eventu" value={eventName} onChange={(e) => setEventName(e.target.value)} required />
            )}
            <input type="file" onChange={handleImageChange} required />
            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
            <input type="number" placeholder="Rozmiar kodu QR" value={qrSize} onChange={handleQRSizeChange} max="9000" required />
            {showQrSizeWarning && (
              <div className="ticket-generator-warning">
                Kod może być nieczytelny, spróbuj użyć grafikę o większej rozdzielczości.
              </div>
            )}
            <input type="number" placeholder="DPI" value={dpi} onChange={handleDpiChange} max="1200" required />
            {showDpiWarning && (
              <div className="ticket-generator-error">
                Wartość DPI jest poniżej zalecanej minimalnej wartości 300.
              </div>
            )}
            <div className="ticket-generator-info">
              Rozdzielczość twojej grafiki to: {loadedImageSize.width} px, dla wybranego DPI: {dpi}, szerokość twojej grafiki wyniesie: {imageWidthInMM} mm, Qr kod to {qrInMM} mm
            </div>
            <div className="ticket-generator-preview">
              {preview && <img ref={imageRef} src={preview} alt="Podgląd obrazka" className="ticket-generator-preview-image" />}
              <DraggableQRCode
                key={qrCodeKey}
                src="QrSample.png"
                limit={{
                  width: loadedImageSize.width * scaleFactor,
                  height: loadedImageSize.height * scaleFactor,
                }}
                size={qrSize * scaleFactor}
                position={{
                  x: qrPosition.x * scaleFactor,
                  y: qrPosition.y * scaleFactor,
                }}
                onDrag={handleQRCodeDrag}
              />
            </div>
            <button type="submit" className="ticket-generator-submit">
              Generuj
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default GenerateTickets;