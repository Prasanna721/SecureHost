import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [scanResults, setScanResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
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


  const getRatingColor = (rating) => {
    if (rating >= 7) return '#ef4444';
    if (rating >= 4) return '#f59e0b';
    return '#10b981';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'pending': return '⏳';
      case 'failed': return '❌';
      default: return '📄';
    }
  };

  useEffect(() => {
    fetchScanResults();
    const interval = setInterval(fetchScanResults, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading SecureHost...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">🛡️</span>
            <h1>SecureHost</h1>
          </div>
          <div className="header-actions">
            <button 
              onClick={fetchScanResults} 
              className="btn btn-refresh"
              title="Refresh results"
            >
              🔄
            </button>
            <div className="view-toggle">
              <button
                className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                ⊞
              </button>
              <button
                className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                ☰
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Dashboard */}
      <div className="stats-dashboard">
        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">Total Scans</div>
          </div>
        </div>
        
        <div className="stat-card confidential">
          <div className="stat-icon">🔒</div>
          <div className="stat-content">
            <div className="stat-number">{stats.confidential}</div>
            <div className="stat-label">Confidential</div>
          </div>
        </div>
        
        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-number">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
        
        <div className="stat-card delete">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-number">{stats.toDelete}</div>
            <div className="stat-label">To Delete</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="main-content">
        {scanResults.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📸</div>
            <h3>No screenshots analyzed yet</h3>
            <p>Take a screenshot and watch SecureHost analyze it for sensitive content</p>
            <div className="empty-animation">
              <div className="pulse-dot"></div>
              <div className="pulse-dot"></div>
              <div className="pulse-dot"></div>
            </div>
          </div>
        ) : (
          <div className={`results-container ${viewMode}`}>
            {scanResults.map((result) => (
              <div key={result.id} className="result-card">
                {/* Card Header */}
                <div className="card-header">
                  <div className="card-timestamp">
                    {formatTimestamp(result.created_at)}
                  </div>
                  <div className={`status-indicator status-${result.status}`}>
                    {getStatusIcon(result.status)}
                  </div>
                </div>

                {/* Screenshot Preview */}
                <div className="card-image" onClick={() => setSelectedResult(result)}>
                  {result.image_url && (
                    <img
                      src={result.image_url}
                      alt="Screenshot"
                      className="screenshot-img"
                    />
                  )}
                  <div className="image-overlay">
                    <button className="overlay-btn">
                      🔍 View Details
                    </button>
                  </div>
                </div>

                {/* Analysis Results */}
                {result.status === 'completed' && result.classification && (
                  <div className="card-content">
                    <div className="classification-badge">
                      <span className={`classification ${result.classification.toLowerCase()}`}>
                        {result.classification}
                      </span>
                    </div>
                    
                    <div className="risk-meter">
                      <div className="risk-label">Risk Level</div>
                      <div className="risk-bar">
                        <div 
                          className="risk-fill"
                          style={{ 
                            width: `${(result.sensitivity_rating || 0) * 10}%`,
                            backgroundColor: getRatingColor(result.sensitivity_rating || 0)
                          }}
                        ></div>
                      </div>
                      <div className="risk-value">
                        {result.sensitivity_rating || 0}/10
                      </div>
                    </div>

                    <div className="delete-recommendation">
                      {result.should_be_deleted ? (
                        <span className="delete-yes">⚠️ Deletion Recommended</span>
                      ) : (
                        <span className="delete-no">✅ Safe to Keep</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Card Actions */}
                <div className="card-actions">
                  <button
                    onClick={() => setSelectedResult(result)}
                    className="btn btn-primary"
                  >
                    📄 Details
                  </button>
                  <button
                    onClick={() => deleteResult(result.id)}
                    className="btn btn-danger"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      {/* Enhanced Modal */}
      {selectedResult && (
        <div className="modal-backdrop" onClick={() => setSelectedResult(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span className="modal-icon">🔍</span>
                <h2>Analysis Details</h2>
              </div>
              <button 
                className="modal-close" 
                onClick={() => setSelectedResult(null)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              <div className="modal-split">
                {/* Left Panel - Screenshot */}
                <div className="modal-panel image-panel">
                  <h3>📸 Screenshot</h3>
                  <div className="modal-image-container">
                    {selectedResult.image_url && (
                      <img
                        src={selectedResult.image_url}
                        alt="Screenshot"
                        className="modal-image"
                      />
                    )}
                  </div>
                  
                  {/* Quick Stats in Modal */}
                  {selectedResult.status === 'completed' && (
                    <div className="modal-quick-stats">
                      <div className="quick-stat">
                        <span className="quick-stat-label">Classification</span>
                        <span className={`quick-stat-value ${selectedResult.classification?.toLowerCase()}`}>
                          {selectedResult.classification}
                        </span>
                      </div>
                      <div className="quick-stat">
                        <span className="quick-stat-label">Risk Level</span>
                        <span className="quick-stat-value">
                          {selectedResult.sensitivity_rating}/10
                        </span>
                      </div>
                      <div className="quick-stat">
                        <span className="quick-stat-label">Action</span>
                        <span className={`quick-stat-value ${selectedResult.should_be_deleted ? 'delete-recommended' : 'safe'}`}>
                          {selectedResult.should_be_deleted ? 'Delete' : 'Keep'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Right Panel - JSON Data */}
                <div className="modal-panel data-panel">
                  <h3>📊 Raw Analysis Data</h3>
                  <div className="json-container">
                    <pre className="json-display">
                      {JSON.stringify(selectedResult, null, 2)}
                    </pre>
                  </div>
                  
                  {/* Reasoning Section */}
                  {selectedResult.reasoning && (
                    <div className="reasoning-section">
                      <h4>🧠 AI Reasoning</h4>
                      <div className="reasoning-text">
                        {selectedResult.reasoning}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;