import { useState, useEffect } from 'react';
import axios from 'axios';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';

// Define types for our state
interface StatusData {
  status: string;
  timestamp: string;
}

function App() {
  const [count, setCount] = useState(0);
  const [backendMessage, setBackendMessage] = useState('');
  const [status, setStatus] = useState<StatusData>({ status: '', timestamp: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inputData, setInputData] = useState('');
  const [echoResponse, setEchoResponse] = useState<Record<string, any> | null>(null);

  // Fetch basic API message on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api');
        setBackendMessage(response.data.message);

        // Also fetch the status
        const statusResponse = await axios.get('/api/status');
        setStatus(statusResponse.data);
      } catch (err) {
        setError('Failed to connect to the backend service');
        console.error('API error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle echo API call
  const handleEcho = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/echo', { text: inputData });
      setEchoResponse(response.data);
    } catch (err) {
      setError('Error sending data to backend');
      console.error('Echo API error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="logos">
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>React + Vite + Express</h1>

      <div className="card">
        <button onClick={() => setCount(prevCount => prevCount + 1)}>count is {count}</button>
      </div>

      {/* Backend connectivity section */}
      <div className="api-section">
        <h2>Backend Connectivity Demo</h2>

        {loading && <p className="loading">Loading data from backend...</p>}
        {error && <p className="error">{error}</p>}

        {backendMessage && (
          <div className="api-response">
            <h3>API Response:</h3>
            <p>{backendMessage}</p>
          </div>
        )}

        {status.status && (
          <div className="status-response">
            <h3>Backend Status:</h3>
            <p>
              Status: <span className="status-badge">{status.status}</span>
            </p>
            <p>Last updated: {new Date(status.timestamp).toLocaleString()}</p>
          </div>
        )}

        {/* Echo API demo */}
        <div className="echo-demo">
          <h3>Echo API Test:</h3>
          <div className="input-group">
            <input
              type="text"
              value={inputData}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputData(e.target.value)}
              placeholder="Enter some text to send to the backend"
            />
            <button onClick={handleEcho} disabled={loading || !inputData}>
              Send to Backend
            </button>
          </div>

          {echoResponse && (
            <div className="echo-response">
              <h4>Backend Echo Response:</h4>
              <pre>{JSON.stringify(echoResponse, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>

      <p className="read-the-docs">
        This template demonstrates React-Express connectivity via API calls
      </p>
    </div>
  );
}

export default App;
