// AuthProvider.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API_BASE_URL from '../Config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/checkAuth`, {
          method: 'GET',
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setToken(data.token);
          if (location.pathname === '/login') {
            navigate('/dashboard', { replace: true });
          }
        } else {
          setUser(null);
          setToken(null);
          if (location.pathname !== '/login') {
            navigate('/login', { state: { sessionExpired: true } });
          }
        }
      } catch (error) {
        console.error("Authentication check error:", error);
        setUser(null);
        setToken(null);
        if (location.pathname !== '/login') {
          navigate('/login', { state: { sessionExpired: true } });
        }
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [navigate, location.pathname]);

  const login = async (userCredentials) => {
    try {
      if (user) {
        // Jeśli użytkownik jest już zalogowany, przekieruj go do /dashboard
        navigate('/dashboard', { replace: true });
        return;
      }
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userCredentials),
        credentials: 'include',
      });
      if (response.ok) {
        const userData = await response.json();
        console.log('Login successful, user data:', userData);
        setUser({
          ...userData,
          permissions: userData.permissions || [], // Ustaw pustą tablicę, jeśli permissions nie jest dostępne
        });
        navigate('/dashboard', { replace: true });
      } else {
        console.error("Login failed");
        const errorData = await response.json();
        console.log(errorData);
        // Sprawdzenie, czy błąd pochodzi z walidacji
        if (errorData.errors && errorData.errors.length > 0) {
          return 'Nieprawidłowa Nazwa użytkownika lub hasło'; // Zwracanie komunikatów walidacji do wyświetlenia
        } else if (errorData.message) {
          return 'Nieprawidłowa Nazwa użytkownika lub hasło'; // Zwracanie ogólnego komunikatu o błędzie
        } else {
          // Domyślna wiadomość, jeśli nie można zidentyfikować błędu
          return "Wystąpił nieznany błąd. Spróbuj ponownie.";
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      return 'Za dużo nieudanych prób. Spróbuj ponownie za 15min';
    }
  };

  const logout = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        console.log('Logout successful');
        setUser(null);
        navigate('/login', { replace: true, state: { loggedOut: true } }); // Przekieruj do strony logowania po wylogowaniu z parametrem loggedOut
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      if(error.response.status === 401){
        console.log('Sesja wygasła, Wylogowano');
        setUser(null);
        navigate('/login', { replace: true, state: { loggedOut: true } });
      }else{
        console.error("Logout error:", error);
      }
    }
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};