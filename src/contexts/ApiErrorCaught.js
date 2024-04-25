let apiErrorHandled = false;

export const handleApiError = (error, navigate) => {
  if (!apiErrorHandled && error.response && error.response.status === 401) {
    apiErrorHandled = true;
    alert('Sesja wygasła. Zostaniesz przekierowany na stronę logowania.');
    navigate('/login', { state: { tokenExpired: true } });
  }
};