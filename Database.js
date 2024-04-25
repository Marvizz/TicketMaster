const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Określenie ścieżki do pliku bazy danych SQLite
const dbPath = path.join(__dirname, 'protected', 'sqlite', 'mydb.sqlite3');

// Tworzenie połączenia z bazą danych
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

module.exports = db;