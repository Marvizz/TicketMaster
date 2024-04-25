const sqlite3 = require('sqlite3').verbose();


const tableName = process.argv[2];


let db = new sqlite3.Database('./mydb.sqlite3', sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
    return;
  }
  console.log('Connected to the SQLite database.');
});

db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName], (err, row) => {
  if (err) {
    console.error('Error checking if table exists', err.message);
    db.close();
    return;
  }
  
  if (!row) {
    console.error(`Table ${tableName} does not exist.`);
    db.close();
    return;
  }

  db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
    if (err) {
      console.error('Error fetching table info', err.message);
      db.close();
      return;
    }

    const headers = columns.map(column => column.name);
    console.log('Columns:', headers.join(', '));


    const query = `SELECT * FROM ${tableName}`;

    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Error fetching data from table', err.message);
        db.close();
        return;
      }
      

      rows.forEach((row) => {
        const rowData = headers.map(header => `${header}: ${row[header]}`).join(', ');
        console.log(rowData);
      });

      db.close((err) => {
        if (err) {
          console.error('Error closing database', err.message);
        }
        console.log('Closed the database connection.');
      });
    });
  });
});
