import React, { useState, useEffect, useRef } from 'react';
import { useBeforeUnload } from 'react-use';
import axios from 'axios';
import Popup from './Popup';
import API_BASE_URL from '../Config';
import Navigation from '../components/Nav';
import { useNavigate } from 'react-router-dom';
import { handleApiError } from '../contexts/ApiErrorCaught';
import { Html5QrcodeScanner, Html5QrcodeScannerState } from 'html5-qrcode';
import '../styles/AssignTicket.css'

const AssignTicket = () => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [popupType, setPopupType] = useState('info');
  const [showExistingGroups, setShowExistingGroups] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [allGroups, setAllGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const navigate = useNavigate();
  
  const [isOpen, setIsOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    tableNumber: '',
    vip: false,
    groupId: '',
    newGroup: true,
  });
  const [scannedQRCodes, setScannedQRCodes] = useState([]);
  const [existingGroups, setExistingGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const qrScannerRef = useRef(null);
  const [scannedCodes, setScannedCodes] = useState([]);

  const [lastScanTime, setLastScanTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const scanDelay = 1000;

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
          processQRCode(decodedText);
        };

        if (!qrScannerRef.current) {
          qrScannerRef.current = new Html5QrcodeScanner(
            "qr-reader",
            config,
            false
          );
        }

        setTimeout(async () => {
          const container = document.getElementById("qr-reader");
          if (qrScannerRef.current && container?.innerHTML === "") {
            await qrScannerRef.current.render(qrCodeSuccessCallback);
          }
        }, 0);
      } catch (error) {
        console.error('Błąd podczas inicjalizacji skanera QR:', error);
      }
    };

    initializeQRScanner();

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.clear();
      }
    };
  }, []);

  const stopQRScanner = async () => {
    if (qrScannerRef.current) {
      try {
        await qrScannerRef.current.clear();
      } catch (error) {
        console.error('Błąd podczas zatrzymywania skanera QR:', error);
      }
    }
  };

  useEffect(() => {
    const fetchAllGroups = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/AllGroups`, {
          withCredentials: true,
        });
        setAllGroups(response.data);
        setFilteredGroups(response.data);
        setExistingGroups(response.data);
      } catch (error) {
        console.error('Error fetching all groups:', error);
      }
    };

    fetchAllGroups();
  }, []);

  useEffect(() => {
    setFilteredGroups(existingGroups);
  }, [existingGroups]);

  useEffect(() => {
    if (selectedGroup) {
      setFormData((prevFormData) => ({
        ...prevFormData,
        name: selectedGroup.Name || '',
        groupId: selectedGroup.GroupId || '',
      }));
    }
  }, [selectedGroup]);

  useBeforeUnload(() => {
    stopQRScanner();
  });
  
  const processQRCode = async (decodedText) => {
    const currentTime = Date.now();

    if (
      !isProcessing &&
      !scannedQRCodes.includes(decodedText) &&
      currentTime - lastScanTime > scanDelay
    ) {
      setIsProcessing(true);
      setLastScanTime(currentTime);

      try {
        setIsLoading(true);

        const response = await axios.post(
          `${API_BASE_URL}/api/CheckTicket`,
          { qrCode: decodedText },
          {
            withCredentials: true,
          }
        );

        if (response.data.found) {
          if (response.data.alreadyConfirmed) {
            openPopup('Bilet jest używany', 'error');
          } else if (response.data.Name) {
            openPopup('Ten bilet jest już przypisany do: ' + response.data.Name, 'error');
          } else {
            setScannedQRCodes((prevCodes) => {
              if (prevCodes.includes(decodedText)) {
                openPopup('Ten bilet znajduje się już na liście', 'warning');
                return prevCodes;
              } else {
                const updatedCodes = [...prevCodes, decodedText];
                openPopup('Bilet dodany pomyślnie', 'success');
                return updatedCodes;
              }
            });
          }
        } else {
          openPopup('Nie znaleziono biletu. Proszę spróbować ponownie.', 'error');
        }
      } catch (error) {
        console.error('Błąd podczas sprawdzania kodu QR:', error);
        // Obsłuż błąd, np. wyświetl komunikat użytkownikowi
      } finally {
        setIsLoading(false);
        setIsProcessing(false);
      }
    }
  };
  
  const openPopup = (message, type = 'info') => {
    setPopupMessage(message);
    setPopupType(type);
    setIsPopupOpen(true);
    if (qrScannerRef.current && qrScannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
      qrScannerRef.current.pause();
    }
  };

  const closePopup = () => {
    setIsPopupOpen(false);
    if (qrScannerRef.current && qrScannerRef.current.getState() === Html5QrcodeScannerState.PAUSED) {
      qrScannerRef.current.resume();
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setFormData((prevState) => ({
      ...prevState,
      [name]: newValue,
    }));
  };

  const handleRemoveQRCode = (codeToRemove) => {
    setScannedQRCodes((prevCodes) => prevCodes.filter((code) => code !== codeToRemove));
  };

  const handleGroupSelect = (group) => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      name: group.Name || '',
      groupId: group.GroupId || '',
      newGroup: false,
    }));
    setShowExistingGroups(false);
  };

  const handleNewGroupChange = (e) => {
    const isNewGroup = e.target.value === 'true';
    setFormData((prevFormData) => ({
      ...prevFormData,
      newGroup: isNewGroup,
      name: isNewGroup ? '' : prevFormData.name,
      groupId: isNewGroup ? '' : prevFormData.groupId,
    }));
    setSelectedGroup(null);
    setShowExistingGroups(!isNewGroup);
  };

  const handleGroupNameChange = (e) => {
    const name = e.target.value;
    setGroupName(name);

    if (name.length < 3) {
      setFilteredGroups(existingGroups);
    } else {
      const filtered = existingGroups.filter((group) =>
        group.Name?.toLowerCase().includes(name.toLowerCase())
      );
      setFilteredGroups(filtered);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let groupId = formData.groupId;
    if (formData.newGroup) {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/NextGroupId`, {
          withCredentials: true,
        });
        groupId = response.data.nextGroupId;
      } catch (error) {
        console.error('Error getting next group ID:', error);
        openPopup('Wystąpił błąd podczas pobierania kolejnego identyfikatora grupy', 'error');
        return;
      }
    }

    const payload = {
      name: formData.name,
      phoneNumber: formData.phoneNumber,
      tableNumber: formData.tableNumber,
      vip: formData.vip ? 1 : 0,
      groupId: groupId,
      scannedQRCodes: scannedQRCodes,
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/api/AssignTicket`, payload, {
        withCredentials: true,
      });

      openPopup('Bilety przypisane pomyślnie', 'success');
      console.log('Bilet(y) przypisane pomyślnie:', response.data);
      setFormData({
        name: '',
        phoneNumber: '',
        tableNumber: '',
        vip: false,
        groupId: '',
        newGroup: true,
      });
      setScannedQRCodes([]);
      setSelectedGroup(null);

      // Pobierz zaktualizowane grupy po przypisaniu biletów
      const updatedGroupsResponse = await axios.get(`${API_BASE_URL}/api/AllGroups`, {
        withCredentials: true,
      });
      setExistingGroups(updatedGroupsResponse.data);
    } catch (error) {
      console.error('Wystąpił błąd podczas przypisywania biletu:', error);
      if (error.response && error.response.status === 400) {
        openPopup(error.response.data, 'error');
      } else if (error.response.status === 401) {
        handleApiError(error, navigate);
      } else {
        openPopup('Wystąpił błąd, spróbuj ponownie', 'error');
      }
    }
  };

  return (
    <div className="admin-panel">
      <button className={`assignticket-hamburger-btn ${isOpen ? 'open' : ''}`} onClick={toggleMenu}>
        <span className={`assignticket-hamburger-line ${isOpen ? 'open' : ''}`}></span>
        <span className={`assignticket-hamburger-line ${isOpen ? 'open' : ''}`}></span>
        <span className={`assignticket-hamburger-line ${isOpen ? 'open' : ''}`}></span>
      </button>
      <Navigation isOpen={isOpen} toggleMenu={toggleMenu} />
      <main className="assignticket-main-content">
        <h2>Przypisz Bilet</h2>
        <div>
          <div>
            <Popup
              message={popupMessage}
              type={popupType}
              isOpen={isPopupOpen}
              onClose={closePopup}
            />
          </div>
          <div id="qr-reader"></div>
          <h3>Zeskanowane Kody QR:</h3>
          <ul>
            {scannedQRCodes.map((code, index) => (
              <li key={index}>
                {code}
                <button className="assignticket-remove-button" onClick={() => handleRemoveQRCode(code)}>Usuń</button>
              </li>
            ))}
          </ul>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nazwa"
              disabled={!formData.newGroup}
              required
            />
            <input
              type="text"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="Nr. telefonu (opcjonalnie)"
            />
            <input
              type="number"
              name="tableNumber"
              value={formData.tableNumber}
              onChange={handleChange}
              placeholder="Numer Stolika (opcjonalnie)"
            />
            <label>
              <input
                type="checkbox"
                name="vip"
                checked={formData.vip}
                onChange={handleChange}
              />
              VIP
            </label>
            <div>
              <label>
                <input
                  type="radio"
                  name="newGroup"
                  value="true"
                  checked={formData.newGroup === true}
                  onChange={handleNewGroupChange}
                />
                Nowa Grupa
              </label>
              <label>
                <input
                  type="radio"
                  name="newGroup"
                  value="false"
                  checked={formData.newGroup === false}
                  onChange={handleNewGroupChange}
                />
                Istniejąca Grupa
              </label>
            </div>
            {showExistingGroups && (
              <div>
                <input
                  type="text"
                  name="groupName"
                  placeholder="Wyszukaj Grupę"
                  value={groupName}
                  onChange={handleGroupNameChange}
                />
                <ul>
                  {filteredGroups
                    .filter((group) => group.Name)
                    .map((group) => (
                      <li key={group.GroupId}>
                        <label>
                          <input
                            type="radio"
                            checked={formData.groupId === group.GroupId}
                            onChange={() => handleGroupSelect(group)}
                          />
                          {group.Name} (GroupId: {group.GroupId}, TableSize:{" "}
                          {group.TableSize})
                        </label>
                      </li>
                    ))}
                </ul>
              </div>
            )}
            <button className="assignticket-submit-button" type="submit">Przypisz Bilet</button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AssignTicket;