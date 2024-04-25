import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthProvider';
import API_BASE_URL from '../Config';
import { useNavigate } from 'react-router-dom';
import '../styles/UserManagement.css';
import { handleApiError } from '../contexts/ApiErrorCaught';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editedUser, setEditedUser] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.post(`${API_BASE_URL}/api/users`, null, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        });

        if (response.status === 200) {
          setUsers(response.data);
        } else {
          console.error('Błąd podczas pobierania użytkowników');
        }
      } catch (error) {
        console.error('Błąd podczas pobierania użytkowników:', error);
        handleApiError(error, navigate);
      }
    };

    fetchUsers();
  }, [token]);

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditedUser({ Name: user.Name });
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setEditedUser((prevUser) => ({
      ...prevUser,
      [name]: value,
    }));
  };

  const handleSaveUser = async () => {
    if (editedUser.Password && editedUser.Password.length < 6) {
      setErrorMessage('Hasło musi mieć co najmniej 6 znaków');
      return;
    }
  
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/users/${selectedUser.Id}`,
        editedUser,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );
  
      if (response.status === 200) {
        setUsers((prevUsers) =>
          prevUsers.map((user) => (user.Id === selectedUser.Id ? { ...user, ...editedUser } : user))
        );
        setSelectedUser(null);
        setEditedUser({});
        setSuccessMessage('Dane użytkownika zostały zaktualizowane');
        setErrorMessage('');
      } else {
        setErrorMessage('Błąd podczas aktualizacji użytkownika');
      }
    } catch (error) {
      if (error.response && error.response.status === 409) {
        setErrorMessage('Nazwa użytkownika jest już zajęta');
      } else {
        setErrorMessage('Błąd podczas aktualizacji użytkownika');
      }
    }
  };

  return (
    <div className="user-management-container">
      <h2>Zarządzanie użytkownikami</h2>
      <ul>
        {users.map((user) => (
          <li key={user.Id}>
            {user.Name}
            <button onClick={() => handleEditUser(user)}>Edytuj</button>
          </li>
        ))}
      </ul>
      {selectedUser && (
        <div>
          <h3>Edycja użytkownika: {selectedUser.Name}</h3>
          <form>
            <div className="form-group">
              <label htmlFor="Name">Nazwa użytkownika:</label>
              <div className="input-container">
                <input
                  type="text"
                  id="Name"
                  name="Name"
                  value={editedUser.Name || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="Password">Hasło:</label>
              <div className="input-container">
                <input
                  type="password"
                  id="Password"
                  name="Password"
                  value={editedUser.Password || ''}
                  onChange={handleInputChange}
                  className={editedUser.Password && editedUser.Password.length < 6 ? 'invalid' : ''}
                />
                {!editedUser.Password && (
                  <span className="empty-message">Pozostaw puste, aby nie zmieniać hasła.</span>
                )}
                {editedUser.Password && editedUser.Password.length < 6 && (
                  <span className="error-message">Hasło musi mieć co najmniej 6 znaków.</span>
                )}
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="PermissionsLevel">Poziom uprawnień:</label>
              <div className="input-container">
                <input
                  type="number"
                  id="PermissionsLevel"
                  name="PermissionsLevel"
                  value={editedUser.PermissionsLevel || ''}
                  onChange={handleInputChange}
                  min={0}
                  max={3}
                  className={editedUser.PermissionsLevel < 0 || editedUser.PermissionsLevel > 3 ? 'invalid' : ''}
                />
                {editedUser.PermissionsLevel === undefined && (
                  <span className="empty-message">Pozostaw puste, aby nie zmieniać poziomu uprawnień.</span>
                )}
                {(editedUser.PermissionsLevel < 0 || editedUser.PermissionsLevel > 3) && (
                  <span className="error-message">Poziom uprawnień musi mieścić się w zakresie od 0 do 3.</span>
                )}
              </div>
            </div>
            <button type="button" onClick={handleSaveUser}>
              Zapisz
            </button>
          </form>
          {successMessage && (
            <p className="success-message">{successMessage}</p>
          )}
          {errorMessage && (
            <p className="error-message">{errorMessage}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default UserManagement;