const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/itsm.sqlite');

db.run('ALTER TABLE logs ADD COLUMN details TEXT', (err) => {
  if (err && !err.message.includes('duplicate')) {
    console.error('Error:', err);
  } else {
    console.log('Details column added successfully');
  }
  db.close();
});