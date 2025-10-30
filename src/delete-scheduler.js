const cron = require('node-cron');
const fs = require('fs');
const { db } = require('./server');

function initializeDeleteScheduler() {
  cron.schedule('0 * * * *', () => {
    console.log('Running scheduled deletion check...');
    checkAndDeleteExpiredFiles();
  });
  
  console.log('Delete scheduler initialized - checking hourly for expired files');
}

async function checkAndDeleteExpiredFiles() {
  const now = new Date().toISOString();
  
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, screenshot_path, deletion_date, should_be_deleted 
       FROM scan_results 
       WHERE should_be_deleted = 1 
       AND deletion_date IS NOT NULL 
       AND deletion_date <= ?`,
      [now],
      (err, rows) => {
        if (err) {
          console.error('Error checking for expired files:', err);
          reject(err);
          return;
        }
        
        console.log(`Found ${rows.length} files to delete`);
        
        rows.forEach(row => {
          try {
            if (fs.existsSync(row.screenshot_path)) {
              fs.unlinkSync(row.screenshot_path);
              console.log(`Deleted file: ${row.screenshot_path}`);
            }
            
            db.run('DELETE FROM scan_results WHERE id = ?', [row.id], (deleteErr) => {
              if (deleteErr) {
                console.error(`Error deleting record ${row.id}:`, deleteErr);
              } else {
                console.log(`Deleted database record: ${row.id}`);
              }
            });
            
          } catch (error) {
            console.error(`Error deleting file ${row.screenshot_path}:`, error);
          }
        });
        
        resolve(rows.length);
      }
    );
  });
}

function scheduleFileForDeletion(filePath, hoursFromNow = 24) {
  const deletionDate = new Date();
  deletionDate.setHours(deletionDate.getHours() + hoursFromNow);
  
  return deletionDate.toISOString();
}

function markForImmediateDeletion(scanResultId) {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    
    db.run(
      'UPDATE scan_results SET should_be_deleted = 1, deletion_date = ? WHERE id = ?',
      [now, scanResultId],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      }
    );
  });
}

function getScheduledDeletions() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, screenshot_path, deletion_date, classification, sensitivity_rating
       FROM scan_results 
       WHERE should_be_deleted = 1 
       AND deletion_date IS NOT NULL
       ORDER BY deletion_date ASC`,
      [],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

if (require.main === module) {
  initializeDeleteScheduler();
  
  setInterval(() => {
    console.log('Delete scheduler is running...');
  }, 60000); // Log every minute to show it's alive
}

module.exports = {
  initializeDeleteScheduler,
  checkAndDeleteExpiredFiles,
  scheduleFileForDeletion,
  markForImmediateDeletion,
  getScheduledDeletions
};