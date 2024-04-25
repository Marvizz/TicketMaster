const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const saltRounds = 10;

let db = new sqlite3.Database('./mydb.sqlite3', sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
    return;
  }
  console.log('Connected to the SQLite database.');
});


const userName = "User";
const userPassword = "Haslo1";
const permissionsLevel = 0; 


bcrypt.hash(userPassword, saltRounds, function(err, hash) {
  if (err) {
    console.error('Error hashing password', err);
    return;
  }

  db.run(`INSERT INTO Users (Name, Password, PermissionsLevel) VALUES (?, ?, ?)`, [userName, hash, permissionsLevel], function(err) {
    if (err) {
      console.error('Error adding user to database', err.message);
    } else {
      console.log(`A user has been inserted with rowid ${this.lastID}`);
    }

    db.close((err) => {
      if (err) {
        console.error('Error closing database', err.message);
      }
      console.log('Closed the database connection.');
    });
  });
});