import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../Config';
import Popup from './Popup';
import Navigation from '../components/Nav';
import { handleApiError } from '../contexts/ApiErrorCaught';
import { useNavigate } from 'react-router-dom';
import '../styles/ShowPdf.css';

const ShowPdf = ({ token }) => {
  const [pdfList, setPdfList] = useState([]);
  const [selectedPdf, setSelectedPdf] = useState('');
  const [pdfSrc, setPdfSrc] = useState('');
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState('newest');
  const [popupOpen, setPopupOpen] = useState(false);
  const [pdfToDelete, setPdfToDelete] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);

  useEffect(() => {
    fetchPdfList();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const fetchPdfList = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/protected/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        withCredentials: true,
      });
      setPdfList(response.data.files);
      setError(null);
    } catch (error) {
      setError('Wystąpił błąd podczas pobierania listy plików PDF.');
    }
  };

  const handleShowPdf = async (filename) => {
    setIsLoading(true);
    setLoadingProgress(0);
  
    try {
      const response = await axios.get(`${API_BASE_URL}/api/protected/pdf/${encodeURIComponent(filename)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        withCredentials: true,
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total && progressEvent.loaded) {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            setLoadingProgress(progress);
          }
        },
      });

      const pdfUrl = URL.createObjectURL(response.data);
      setSelectedPdf(filename);
      setPdfSrc(pdfUrl);
      setError(null);
    } catch (error) {
      console.log('error:', error);
      if (error.response.status === 401) {
        handleApiError(error, navigate);
      } else {
        setError('Wystąpił błąd podczas pobierania pliku PDF.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfirmation = (filename) => {
    setPdfToDelete(filename);
    setPopupOpen(true);
  };

  const handleDeletePdf = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/api/DeletePdf/${encodeURIComponent(pdfToDelete)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        withCredentials: true,
      });
      setPdfList(pdfList.filter((pdf) => pdf !== pdfToDelete));
      setSelectedPdf('');
      setPdfSrc('');
      setError(null);
      setPopupOpen(false);
      setPdfToDelete('');
    } catch (error) {
      if (error.response.status === 401) {
        handleApiError(error, navigate);
      } else {
        setError('Wystąpił błąd podczas usuwania pliku PDF.');
      }
    }
  };

  const extractDateFromFilename = (filename) => {
    const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
    return dateMatch ? new Date(dateMatch[1]) : new Date();
  };

  const sortedPdfList = [...pdfList].sort((a, b) => {
    const dateA = extractDateFromFilename(a);
    const dateB = extractDateFromFilename(b);
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  return (
    <div className="showpdf-container">
      <div
        className={`showpdf-content ${isLoading ? 'blurred' : ''}`}
        style={{
          width: isLoading ? `${windowWidth}px` : 'auto',
          height: isLoading ? `${windowHeight}px` : 'auto',
        }}
      >
        <button className={`showpdf-hamburger-btn ${isOpen ? 'open' : ''}`} onClick={toggleMenu}>
          <span className={`showpdf-hamburger-line ${isOpen ? 'open' : ''}`}></span>
          <span className={`showpdf-hamburger-line ${isOpen ? 'open' : ''}`}></span>
          <span className={`showpdf-hamburger-line ${isOpen ? 'open' : ''}`}></span>
        </button>
        <Navigation isOpen={isOpen} toggleMenu={toggleMenu} />
        <main>
          <div className="showpdf-header">
            <h2>Sprawdź Bilet</h2>
          </div>
          <div>
            <>
              <div>
                <ul className="showpdf-pdf-list">
                  {sortedPdfList.map((filename) => (
                    <li key={filename}>
                      <button onClick={() => handleShowPdf(filename)}>{filename}</button>
                      <button onClick={() => handleDeleteConfirmation(filename)}>Usuń</button>
                    </li>
                  ))}
                </ul>
              </div>
              {error && <p className="showpdf-error-message">{error}</p>}
              {pdfSrc && (
                <div className="showpdf-pdf-preview">
                  <iframe src={pdfSrc} width="100%" height="600px" title="PDF Preview"></iframe>
                  <button onClick={() => window.open(pdfSrc, '_blank', 'noopener,noreferrer')}>
                    Otwórz PDF w nowej karcie
                  </button>
                </div>
              )}
              <Popup
                message={`Czy na pewno chcesz usunąć plik ${pdfToDelete}?`}
                type="warning"
                isOpen={popupOpen}
                onClose={() => setPopupOpen(false)}
                onConfirm={handleDeletePdf}
                confirmText="Usuń"
                cancelText="Anuluj"
              />
            </>
          </div>
        </main>
      </div>
      {isLoading && (
        <div className="showpdf-loading-overlay">
          <div className="showpdf-loading-progress">{loadingProgress}%</div>
        </div>
      )}
    </div>
  );
};
export default ShowPdf;