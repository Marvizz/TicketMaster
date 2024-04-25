import React from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { Navigate, useLocation } from 'react-router-dom';

const RequireAuth = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  console.log('RequireAuth user:', user);
  console.log('RequireAuth isLoading:', isLoading); 

  if (isLoading) {
    return <div>Loading...</div>; 
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default RequireAuth;