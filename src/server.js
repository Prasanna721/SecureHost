const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const db = new sqlite3.Database('./privacy_guardian.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS scan_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    screenshot_path TEXT NOT NULL,
    image_url TEXT NOT NULL,
    rules_text TEXT NOT NULL,
    classification TEXT,
    sensitivity_rating INTEGER,
    should_be_deleted BOOLEAN,
    deletion_date TEXT,
    reasoning TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    status TEXT DEFAULT 'pending'
  )`);
});

app.get('/api/scan-results', (req, res) => {
  db.all(
    'SELECT * FROM scan_results ORDER BY created_at DESC',
    [],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

app.post('/api/scan-results', (req, res) => {
  const { screenshot_path, image_url, rules_text, pipelex_result } = req.body;
  
  if (pipelex_result) {
    const stmt = db.prepare(`UPDATE scan_results 
      SET classification = ?, sensitivity_rating = ?, should_be_deleted = ?, 
          deletion_date = ?, reasoning = ?, processed_at = CURRENT_TIMESTAMP, 
          status = 'completed'
      WHERE screenshot_path = ?`);
    
    stmt.run([
      pipelex_result.classification,
      pipelex_result.sensitivity_rating,
      pipelex_result.should_be_deleted,
      pipelex_result.deletion_date,
      pipelex_result.reasoning,
      screenshot_path
    ], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, message: 'Result updated' });
    });
  } else {
    const stmt = db.prepare(`INSERT INTO scan_results 
      (screenshot_path, image_url, rules_text) 
      VALUES (?, ?, ?)`);
    
    stmt.run([screenshot_path, image_url, rules_text], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, message: 'Scan queued' });
    });
  }
});

app.delete('/api/scan-results/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT screenshot_path FROM scan_results WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (row && fs.existsSync(row.screenshot_path)) {
      fs.unlinkSync(row.screenshot_path);
    }
    
    db.run('DELETE FROM scan_results WHERE id = ?', [id], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Record deleted' });
    });
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Privacy Guardian API server running on port ${PORT}`);
});

module.exports = { db };