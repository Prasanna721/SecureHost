import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [scanResults, setScanResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    confidential: 0,
    pending: 0,
    toDelete: 0
  });

  const fetchScanResults = async () => {
    try {
      const response = await fetch('/api/scan-results');
      const data = await response.json();
      setScanResults(data);
      
      const statsData = {
        total: data.length,
        confidential: data.filter(item => 
          item.classification && item.classification.toLowerCase().includes('confidential')
        ).length,
        pending: data.filter(item => item.status === 'pending').length,
        toDelete: data.filter(item => item.should_be_deleted).length
      };
      setStats(statsData);
      
    } catch (error) {
      console.error('Error fetching scan results:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteResult = async (id) => {
    if (window.confirm('Are you sure you want to delete this scan result and screenshot?')) {
      try {
        await fetch(`/api/scan-results/${id}`, { method: 'DELETE' });
        fetchScanResults();
      } catch (error) {
        console.error('Error deleting result:', error);
      }
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getClassificationClass = (classification) => {
    if (!classification) return '';
    const lower = classification.toLowerCase();
    if (lower.includes('confidential')) return 'classification-confidential';
    if (lower.includes('internal')) return 'classification-internal';
    if (lower.includes('restricted')) return 'classification-restricted';
    if (lower.includes('public')) return 'classification-public';
    return '';
  };

  const getRatingClass = (rating) => {
    if (rating >= 7) return 'rating-high';
    if (rating >= 4) return 'rating-medium';
    return 'rating-low';
  };

  useEffect(() => {
    fetchScanResults();
    const interval = setInterval(fetchScanResults, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <h2>Loading scan results...</h2>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="header">
        <div className="container">
          <h1>🛡️ Privacy Guardian</h1>
          <p>Enterprise Screenshot Security Analysis</p>
        </div>
      </div>

      <div className="container">
        <button onClick={fetchScanResults} className="refresh-btn">
          🔄 Refresh
        </button>

        <div className="stats-bar">
          <div className="stat-item">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">Total Scans</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{stats.confidential}</div>
            <div className="stat-label">Confidential</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{stats.toDelete}</div>
            <div className="stat-label">To Delete</div>
          </div>
        </div>

        <div className="scan-results">
          <h2>📸 Screenshot Scan Results</h2>
          
          {scanResults.length === 0 ? (
            <div className="empty-state">
              <p>No scan results yet. Screenshots will appear here as they are analyzed.</p>
            </div>
          ) : (
            scanResults.map((result) => (
              <div key={result.id} className="scan-item">
                <div className="scan-header">
                  <div className="timestamp">
                    📅 {formatTimestamp(result.created_at)}
                  </div>
                  <div className={`status-badge status-${result.status}`}>
                    {result.status}
                  </div>
                </div>

                {result.status === 'completed' && result.classification && (
                  <>
                    <div className="sensitivity-info">
                      <div className="info-item">
                        <div className="info-label">Classification</div>
                        <div className={`info-value ${getClassificationClass(result.classification)}`}>
                          {result.classification}
                        </div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">Risk Rating</div>
                        <div className={`info-value ${getRatingClass(result.sensitivity_rating)}`}>
                          {result.sensitivity_rating}/10
                        </div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">Delete Recommended</div>
                        <div className={`info-value ${result.should_be_deleted ? 'delete-recommended' : 'delete-not-recommended'}`}>
                          {result.should_be_deleted ? '⚠️ YES' : '✅ NO'}
                        </div>
                      </div>
                    </div>

                    {result.reasoning && (
                      <div className="reasoning">
                        <strong>Analysis:</strong> {result.reasoning}
                      </div>
                    )}

                    {result.deletion_date && (
                      <div className="info-item">
                        <div className="info-label">Scheduled Deletion</div>
                        <div className="info-value">
                          🗓️ {formatTimestamp(result.deletion_date)}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {result.image_url && (
                    <img
                      src={result.image_url}
                      alt="Screenshot"
                      className="screenshot-preview"
                      onClick={() => window.open(result.image_url, '_blank')}
                      style={{ cursor: 'pointer' }}
                    />
                  )}
                  
                  <div className="actions">
                    <button
                      onClick={() => deleteResult(result.id)}
                      className="btn btn-danger"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;