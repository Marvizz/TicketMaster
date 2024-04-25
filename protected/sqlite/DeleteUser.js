const sqlite3 = require('sqlite3').verbose();


let db = new sqlite3.Database('./mydb.sqlite3', sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
    return;
  }
  console.log('Connected to the SQLite database.');
});


const userIdToDelete = 2; 

db.run(`DELETE FROM Users WHERE Id = ?`, userIdToDelete, function(err) {
  if (err) {
    console.error('Error deleting user', err.message);
  } else if (this.changes === 0) {
    console.log('User not found.');
  } else {
    console.log(`Deleted ${this.changes} user(s).`);
  }


  db.close((err) => {
    if (err) {
      console.error('Error closing database', err.message);
    }
    console.log('Closed the database connection.');
  });
});
