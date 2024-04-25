import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthProvider';
import API_BASE_URL from '../Config';
import { useNavigate } from 'react-router-dom';
import '../styles/CreateUserForm.css';

import { handleApiError } from '../contexts/ApiErrorCaught';

const CreateUserForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [permissionsLevel, setpermissionsLevel] = useState('');
  const { token } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/CreateUser`,
        {
          username,
          password,
          permissionsLevel,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );
  
      if (response.status === 201) {
        setMessage({ text: 'Użytkownik został utworzony', color: 'green' });
        setUsername('');
        setPassword('');
        setpermissionsLevel('');
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        try {
          handleApiError(error, navigate);
        } catch (error) {
          console.error('Błąd autoryzacji:', error);
          setMessage({ text: 'Błąd autoryzacji', color: 'red' });
        }
      } else {
        console.error('Błąd podczas tworzenia użytkownika:', error);
        if (error.response) {
          if (error.response.status === 409) {
            setMessage({ text: 'Użytkownik o podanej nazwie już istnieje', color: 'red' });
          } else if (error.response.status === 400) {
            setMessage({ text: 'Hasło musi mieć minimum 6 znaków', color: 'red' });
          } else {
            setMessage({ text: 'Wystąpił błąd podczas tworzenia użytkownika', color: 'red' });
          }
        } else {
          setMessage({ text: 'Wystąpił błąd podczas tworzenia użytkownika', color: 'red' });
        }
      }
    }
  };

  return (
    <div className="create-user-container">
      <h2>Stwórz nowego użytkownika</h2>
      {message && <p className={`message ${message.color}`}>{message.text}</p>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Nazwa użytkownika:</label>
          <div className="input-container">
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="permissionsLevel">Poziom Uprawnień:</label>
          <div className="input-container">
            <input
              type="number"
              id="permissionsLevel"
              value={permissionsLevel}
              onChange={(e) => setpermissionsLevel(e.target.value)}
              min={0}
              max={3}
              required
              className={`${permissionsLevel < 0 || permissionsLevel > 3 ? 'invalid' : ''}`}
            />
            {(permissionsLevel < 0 || permissionsLevel > 3) && (
              <span className="error-message">Poziom uprawnień musi być między 0 a 3.</span>
            )}
            {permissionsLevel === '' && (
              <span className="range-message">Wprowadź wartość od 0 do 3.</span>
            )}
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="password">Hasło:</label>
          <div className="input-container">
            <input
              type="password"
              id="password"
              value={password}
              minLength={6}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`${password.length > 0 && password.length < 6 ? 'invalid' : ''}`}
            />
            {password.length > 0 && password.length < 6 && (
              <span className="error-message">Hasło musi mieć co najmniej 6 znaków.</span>
            )}
            {password.length === 0 && (
              <span className="range-message">Wprowadź hasło o długości co najmniej 6 znaków.</span>
            )}
          </div>
        </div>
        <button type="submit" className="submit-button">
          Stwórz użytkownika
        </button>
      </form>
    </div>
  );
};

export default CreateUserForm;