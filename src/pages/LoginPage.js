import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/login.css';
import logo from '../styles/Logo.png';

function LoginPage() {
  const location = useLocation();
  const isSessionExpired = location.state?.sessionExpired;
  const isTokenExpired = location.state?.tokenExpired;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorCount, setErrorCount] = useState(0);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errorMessage = await login({ username, password });
    console.log(errorMessage);
    if (errorMessage) {
      setError(errorMessage);
      setErrorCount((prevCount) => prevCount + 1);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="login-container">
      <div className="logo-container">
        <img src={logo} alt="TicketMaster Logo" className="logo" />
        <h1 className="brand-name">TicketMaster</h1>
      </div>
      {isSessionExpired && (
        <p className="error-message">Twoja sesja wygasła. Zaloguj się ponownie, aby kontynuować.</p>
      )}
      {isTokenExpired && (
        <p className="error-message">Twój token wygasł. Zaloguj się ponownie, aby kontynuować.</p>
      )}
      <h2>Login</h2>
      <form key={errorCount} onSubmit={handleSubmit} className={`login-form ${error ? 'error' : ''}`}>
        <div className="form-group">
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
          />
        </div>
        {error && <div className="error-message">{error}</div>}
        <button type="submit" className="login-button">Log in</button>
      </form>
    </div>
  );
}

export default LoginPage;