import React, { useRef, useState, useEffect } from 'react';
import { useBeforeUnload } from 'react-use';
import axios from 'axios';
import Popup from './Popup';
import API_BASE_URL from '../Config';
import Navigation from '../components/Nav';
import { Html5QrcodeScanner, Html5QrcodeScannerState } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { handleApiError } from '../contexts/ApiErrorCaught';
import '../styles/CheckTicket.css'

const CheckTicket = () => {
  const navigate = useNavigate();
  const qrScannerRef = useRef(null);
  const [scannedGroups, setScannedGroups] = useState({});
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [popupType, setPopupType] = useState('info');
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const initializeQRScanner = async () => {
      try {
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
          aspectRatio: 1,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
        };

        const qrCodeSuccessCallback = async (decodedText, decodedResult) => {
          if (qrScannerRef.current && qrScannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
            qrScannerRef.current.pause();
          }

          try {
            const response = await axios.post(
              `${API_BASE_URL}/api/CheckTicket`,
              { qrCode: decodedText },
              { withCredentials: true }
            );

            console.log('Response from server:', response.data);

            if (response.data.found) {
              if (response.data.alreadyConfirmed) {
                setPopupMessage(response.data.message);
                setPopupType('info');
              } else {
                const { GroupId, Tickets, scannedTicket } = response.data;
                const totalTickets = Tickets.length;
                const inactiveTickets = Tickets.reduce((count, ticket) => {
                  if (ticket.deleted === 4) {
                    return count + 2;
                  } else if (ticket.deleted === 2 || ticket.deleted === 3 || ticket.deleted === 0) {
                    return count + 1;
                  } else {
                    return count;
                  }
                }, 0);
                const activeTickets = totalTickets - inactiveTickets;

                console.log('GroupId:', GroupId);
                console.log('Total tickets:', totalTickets);
                console.log('Inactive tickets:', inactiveTickets);
                console.log('Active tickets:', activeTickets);

                setScannedGroups((prevGroups) => {
                  const updatedGroups = { ...prevGroups };

                  if (updatedGroups[GroupId]) {
                    const group = updatedGroups[GroupId];

                    if (group && group.scannedCount >= (group.totalTickets || 0)) {
                      setPopupMessage('Wszystkie bilety z tej grupy zostały już zeskanowane');
                      setPopupType('warning');
                    } else {
                      if (group && !group.scannedTickets.includes(scannedTicket.qrCode)) {
                        group.scannedTickets.push(scannedTicket.qrCode);
                        group.scannedCount = (group.scannedCount || 0) + 1;
                        setPopupMessage('Bilet zaakceptowany');
                        setPopupType('success');
                      } else {
                        setPopupMessage('Bilet został już zeskanowany');
                        setPopupType('warning');
                      }
                    }
                  } else {
                    if (activeTickets > 0) {
                      updatedGroups[GroupId] = {
                        name: response.data.Name,
                        tableSize: response.data.TableSize,
                        scannedTickets: [scannedTicket.qrCode],
                        scannedCount: 1,
                        totalTickets: activeTickets,
                      };
                      setPopupMessage('Bilet zaakceptowany');
                      setPopupType('success');
                    } else {
                      setPopupMessage('Brak dostępnych biletów w tej grupie');
                      setPopupType('warning');
                    }
                  }

                  console.log('Updated scanned groups:', updatedGroups);

                  if (updatedGroups[GroupId] && updatedGroups[GroupId].scannedCount === (updatedGroups[GroupId].totalTickets || 0)) {
                    handleConfirmGroup(GroupId, [...(updatedGroups[GroupId].scannedTickets || [])]);
                  }

                  return updatedGroups;
                });
              }
            } else {
              setPopupMessage('Kod QR jest niepoprawny.');
              setPopupType('error');
            }
          } catch (error) {
            console.error('Error while checking ticket:', error);
            setPopupMessage('Wystąpił problem podczas sprawdzania biletu. Proszę spróbować ponownie.');
            setPopupType('error');
          }

          setIsPopupOpen(true);
        };

        qrScannerRef.current = new Html5QrcodeScanner(
          "qr-reader",
          config
        );

        await qrScannerRef.current.render(qrCodeSuccessCallback);
      } catch (error) {
        console.error('Błąd podczas inicjalizacji skanera QR:', error);
        setPopupMessage('Wystąpił błąd podczas inicjalizacji skanera QR');
        setPopupType('error');
        setIsPopupOpen(true);
      }
    };

    initializeQRScanner();

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.clear();
      }
    };
  }, []);

  useBeforeUnload(() => {
    if (qrScannerRef.current) {
      qrScannerRef.current.clear();
    }
  });

  const closePopup = () => {
    setIsPopupOpen(false);
    if (qrScannerRef.current && qrScannerRef.current.getState() === Html5QrcodeScannerState.PAUSED) {
      qrScannerRef.current.resume();
    }
  };

  const handleConfirmTicket = async (groupId, qrCode) => {
    if (qrCode) {
      try {
        const response = await axios.post(`${API_BASE_URL}/api/ConfirmTicket`, { qrCode: qrCode }, { withCredentials: true });
        if (response.data.success) {
          setScannedGroups((prevGroups) => {
            const updatedGroups = { ...prevGroups };
            const group = updatedGroups[groupId];
            if (group) {
              const tickets = group.scannedTickets;
              const ticketIndex = tickets.indexOf(qrCode);

              if (ticketIndex > -1) {
                tickets.splice(ticketIndex, 1);
                group.scannedCount--;
              }

              if (response.data.allConfirmed) {
                delete updatedGroups[groupId];
              }
            }

            return updatedGroups;
          });
          setPopupMessage('Bilet został potwierdzony.');
          setPopupType('success');
          setIsPopupOpen(true);
        }
      } catch (error) {
        if (error.response.status === 401) {
          handleApiError(error, navigate);
        } else {
          console.error('Error while confirming ticket:', error);
          setPopupMessage('Wystąpił problem podczas potwierdzania biletu. Proszę spróbować ponownie.');
          setPopupType('error');
          setIsPopupOpen(true);
        }
      }
    }
  };

  const handleConfirmGroup = async (groupId, scannedTickets) => {
    if (scannedTickets.length > 0) {
      const uniqueTickets = scannedTickets.filter((ticket, index, self) => ticket && self.indexOf(ticket) === index);

      for (const ticket of uniqueTickets) {
        await handleConfirmTicket(groupId, ticket);
      }
    } else {
      console.warn('Selected group has no scanned tickets');
    }
  };

  const getGroupMessage = (group) => {
    if (group.scannedCount === group.totalTickets) {
      return 'Wszystkie bilety z tej grupy zostały zeskanowane';
    } else if (group.scannedCount > group.totalTickets) {
      return 'Wszystkie bilety z tej grupy zostały zeskanowane, w tej grupie jeden lub więcej z biletów był usunięty';
    }
    return '';
  };

  return (
    <div className="check-ticket-admin-panel">
      <button
        className={`check-ticket-hamburger-btn ${isOpen ? 'open' : ''}`}
        onClick={toggleMenu}
      >
        <span className={`check-ticket-hamburger-line ${isOpen ? 'open' : ''}`}></span>
        <span className={`check-ticket-hamburger-line ${isOpen ? 'open' : ''}`}></span>
        <span className={`check-ticket-hamburger-line ${isOpen ? 'open' : ''}`}></span>
      </button>
      <Navigation isOpen={isOpen} toggleMenu={toggleMenu} />
      <main className="check-ticket-main-content">
        <h2>Sprawdź Bilet</h2>
        <div className="check-ticket-content-wrapper">
          <div className="check-ticket-qr-scanner-container">
            <Popup
              message={popupMessage}
              type={popupType}
              isOpen={isPopupOpen}
              onClose={closePopup}
            />
            <div id="qr-reader" ref={qrScannerRef}></div>
          </div>
          <div className="check-ticket-scanned-groups-container">
            {Object.entries(scannedGroups).map(([groupId, group]) => {
              const groupMessage = getGroupMessage(group);
              return (
                group.scannedCount > 0 && (
                  <div key={groupId} className="check-ticket-group-container">
                    <h2>Witaj {group.name}</h2>
                    {groupMessage && <p>{groupMessage}</p>}
                    <p>
                      Zeskanowano {group.scannedCount} z {group.totalTickets} biletów.
                    </p>
                    <ul className="check-ticket-scanned-tickets-list">
                      {group.scannedTickets.map((ticket, index) => (
                        <li key={index} className="check-ticket-scanned-ticket-item">
                          <span className="check-ticket-ticket-qr-code">{ticket}</span>
                          <button
                            className="check-ticket-confirm-ticket-btn"
                            onClick={() => handleConfirmTicket(groupId, ticket)}
                          >
                            Potwierdź
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CheckTicket;