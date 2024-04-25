const sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('./mydb.sqlite3', (err) => {
    if (err) {
        console.error(err.message);
        throw err;
    }
    console.log('Connected to the SQLite database.');
});

const createUsersTable = () => {
    const query = `CREATE TABLE IF NOT EXISTS Users (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        Name TEXT,
        Password TEXT,
        PermissionsLevel INTEGER
    )`;
    db.run(query, (err) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log('Users table created or already exists.');
        }
    });
};

const createTicketsTable = () => {
    const query = `CREATE TABLE IF NOT EXISTS Tickets (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        QrCode TEXT,
        Name TEXT,
        PhoneNr TEXT,
        TableSize INTEGER,
        CreateDate DATETIME,
        SoldDate DATETIME,
        TableNumber INTEGER,
        GroupId INTEGER,
        Vip INTEGER,
        EventName TEXT,
        Deleted INTEGER,
        ScannedTimestamp DATETIME,
        ScannedBy TEXT,
        ConfirmedTimestamp DATETIME,
        EventDate DATE,
        SoldBy TEXT
    )`;
    db.run(query, (err) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log('Tickets table created or already exists.');
        }
    });
};


createUsersTable();
createTicketsTable();


db.close((err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Closed the database connection.');
});