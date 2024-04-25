require('dotenv').config({ path: '.env.production.local' });
const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { PDFDocument } = require('pdf-lib');
const QRCode = require('qrcode');
const multer = require('multer');
const crypto = require('crypto');
const sharp = require('sharp');
const { body, validationResult } = require('express-validator');
const csurf = require('csurf');
const path = require('path');
const fs = require('fs');
const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const https = require('https');
const http = require('http');
const dotenv = require('dotenv');
const socketIO = require('socket.io');
const cookie = require('cookie');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Zbyt wiele żądań, spróbuj ponownie później',
});

let server;
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: '.env.production.local' });
} else {
  dotenv.config({ path: '.env.production.local' });
}


if (process.env.NODE_ENV === 'production') {
  const options = {
    key: fs.readFileSync('/etc/ssl/private/private.key'),
    cert: fs.readFileSync('/etc/ssl/certificate.crt')
  };
  server = https.createServer(options, app);
} else {
  server = http.createServer(app);
}

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());

const bcrypt = require('bcrypt');
const db = require('./Database');


const csrfProtection = csurf({ cookie: true });


const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: "Too many login attempts from this IP, please try again after an hour"
});


const generateToken = (userId, username, PermissionsLevel) => {
  const token = jwt.sign({ userId, username, PermissionsLevel }, process.env.JWT_SECRET, { expiresIn: '30min' });
  return token;
};

const authenticateSocket = (socket, next) => {
  const cookies = cookie.parse(socket.handshake.headers.cookie || '');
  const token = cookies.token;
  
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('Authentication error:', err);
        return next(new Error('Authentication error'));
      }
      socket.userId = decoded.userId;
      next();
    });
  } else {
    console.error('Authentication error: No token provided');
    return next(new Error('Authentication error'));
  }
};

const io = require('socket.io')(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Authorization'],
    credentials: true,
  },
});

io.use(authenticateSocket);

io.on('connection', (socket) => {
  console.log('Client connected');
});

const refreshToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.PermissionsLevel = decoded.PermissionsLevel;
    console.log('token refreshed')
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      const newToken = generateToken(decoded.userId, user.Name,decoded.PermissionsLevel);
      res.cookie('token', newToken, { httpOnly: true });
      req.userId = decoded.userId;
      req.PermissionsLevel = decoded.PermissionsLevel;
      next();
    } else {
      console.error('Invalid token', error);
      return res.status(403).json({ message: "Invalid token." });
    }
  }
};

function authenticateToken(req, res, next) {
  console.log('Entered authenticateToken middleware');
  const token = req.cookies.token;
  console.log(token);
  
  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ message: "Access denied. No token provided." });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err instanceof jwt.TokenExpiredError) {
        console.log('Token expired');
        return res.status(401).json({ message: "Token expired." });
      } else {
        console.log('Invalid token');
        return res.status(403).json({ message: "Invalid token." });
      }
    } else {
      console.log(token);
      req.user = {
        userId: decoded.userId,
        username: decoded.username,
        PermissionsLevel: decoded.PermissionsLevel,
      };
      console.log('Token verified successfully');
      next();
    }
  });
}

function checkPermission(requiredPermissionsLevel) {
  return function(req, res, next) {
    console.log('Permission: Checking permissions');

    if (typeof req.user.PermissionsLevel === 'number' && req.user.PermissionsLevel <= requiredPermissionsLevel) {
      console.log(`Access granted. User's permissions level: ${req.user.PermissionsLevel}, required level: ${requiredPermissionsLevel}`);
      next();
    } else {
      console.log(`Access denied. User's permissions level: ${req.user.PermissionsLevel}, required level: ${requiredPermissionsLevel}`);
      return res.status(403).json({ message: "You do not have permission to access this resource." });
    }
  };
}

app.use((req, res, next) => {
  console.log(`Received request: ${req.method} ${req.path}`);
  next();
});

app.get('/api/checkAuth', authenticateToken, (req, res) => {
  res.json({ isAuthenticated: true, user: req.user });
});

/*
app.get('/api/refresh', authenticateToken, apiLimiter, (req, res) => {
  const userId = req.user.userId;


  db.get('SELECT Id, Name, PermissionsLevel FROM Users WHERE Id = ?', [userId], (err, user) => {
    if (err) {
      console.error('Database error', err);
      return res.status(500).json({ message: "An error occurred during the refresh process." });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }


    const token = generateToken(user.Id, user.Name, user.PermissionsLevel);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 900000,
      sameSite: 'Strict'
    });
    console.log('Token saved in cookie during refresh:', token);
    res.json({
      id: user.Id,
      username: user.Name,
      PermissionsLevel: user.PermissionsLevel
    });
  });
});
*/
app.post('/api/login', loginLimiter, [
  body('username').isString().trim().notEmpty(),
  body('password').isLength({ min: 5 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  db.get('SELECT * FROM Users WHERE Name = ?', [username], (err, user) => {
    if (err) {
      console.error('Database error', err);
      return res.status(500).json({ message: "An error occurred during the login process." });
    }
  
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
  
    console.log("User found:", user); 
    console.log("Hashed password from DB:", user.Password);
  
    bcrypt.compare(password, user.Password, (err, result) => {
      if (err) {
        console.error('Bcrypt error', err);
        return res.status(500).json({ message: "An error occurred during the login process." });
      }

      if (result) {
        const token = generateToken(user.Id, user.Name, user.PermissionsLevel);
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',//localhost>develpoment
          maxAge: 3600000,
          sameSite: 'Strict'
        });
        console.log('Token saved in cookie:', token);
        res.json({ message: "Logged in successfully" });
      } else {
        res.status(401).json({ message: "Invalid username or password" });
      }
    });
  });
});
//TODO DODAC TOKENY CSRF
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ message: "Invalid CSRF token." });
  }
  next(err);
});

app.post('/api/logout', authenticateToken, apiLimiter,(req, res) => {
  res.clearCookie('token');
  res.json({ message: "Logged out successfully" });
});

app.get('/api/protected/pdf',apiLimiter, authenticateToken, checkPermission(0), refreshToken, (req, res) => {
  const pdfDirectory = path.join(__dirname, 'protected', 'pdf');

  fs.readdir(pdfDirectory, (err, files) => {
    if (err) {
      console.error('Błąd podczas odczytu katalogu:', err);
      res.status(500).json({ error: 'Wystąpił błąd podczas pobierania listy plików PDF.' });
      return;
    }

    const pdfFiles = files.filter(file => path.extname(file).toLowerCase() === '.pdf');
    res.json({ files: pdfFiles });
  });
});


app.get('/api/protected/pdf/:filename', apiLimiter, authenticateToken, checkPermission(0), refreshToken, (req, res) => {
  const pdfDirectory = path.join(__dirname, 'protected', 'pdf');
  const filename = req.params.filename;

 
  if (!/^[\w\-]+\.pdf$/i.test(filename)) {
    res.status(400).json({ error: 'Nieprawidłowa nazwa pliku PDF.' });
    return;
  }

  const pdfPath = path.join(pdfDirectory, filename);

  fs.access(pdfPath, fs.constants.F_OK, (err) => {
    if (err) {
      res.status(404).json({ error: 'Plik PDF nie został znaleziony.' });
      return;
    }

    fs.stat(pdfPath, (err, stats) => {
      if (err) {
        console.error('Błąd podczas pobierania informacji o pliku:', err);
        res.status(500).json({ error: 'Wystąpił błąd podczas pobierania pliku PDF.' });
        return;
      }

      const fileSize = stats.size;
      const fileStream = fs.createReadStream(pdfPath);

      fileStream.on('error', (err) => {
        console.error('Błąd podczas odczytu pliku PDF:', err);
        res.status(500).json({ error: 'Wystąpił błąd podczas pobierania pliku PDF.' });
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', fileSize);
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

      fileStream.pipe(res);
    });
  });
});

//safari źle skaluje ? albo niższe rozdzielczości? freezuje serwer podczas generowania TODO
app.post('/api/GenerateTickets',apiLimiter, authenticateToken, checkPermission(0), refreshToken, upload.single('image'), async (req, res) => {
  const { ticketAmount, qrPositionX, qrPositionY, qrSize, dpi, eventName, eventDate } = req.body;
  const PxTomm = (px) => (px * dpi) / 25.4;
  let pdfDoc = await PDFDocument.create();

  try {
    for (let i = 0; i < ticketAmount; i++) {
      const qrCodeValue = crypto.randomBytes(32).toString('hex');
      const qrCodeDataUri = await QRCode.toDataURL(qrCodeValue, { errorCorrectionLevel: 'H', scale: 20 });

      // Pobieranie metadanych obrazu
      const uploadedImageMetadata = await sharp(req.file.buffer).metadata();
      const uploadedImageWidthInMm = uploadedImageMetadata.width / uploadedImageMetadata.density * 25.4;
      const uploadedImageHeightInMm = uploadedImageMetadata.height / uploadedImageMetadata.density * 25.4;
      const uploadedImageWidthInPoints = PxTomm(uploadedImageWidthInMm);
      const uploadedImageHeightInPoints = PxTomm(uploadedImageHeightInMm);
      const PdfWidth = (uploadedImageMetadata.width / dpi) * 72;
      const PdfHeight = (uploadedImageMetadata.height / dpi) * 72;

      // Sprawdzenie, czy kod QR mieści się w obrazie, jeśli nie, skaluje do wysokości obrazu
      const qrFinalSize = Math.min(qrSize, uploadedImageWidthInPoints, uploadedImageHeightInPoints);

      // Konwersja kodu QR z Data URI na bufor i skalowanie do finalnych wymiarów
      const qrCodeImageBuffer = await sharp(Buffer.from(qrCodeDataUri.split(",")[1], 'base64'))
        .resize({ width: Math.round(qrFinalSize), height: Math.round(qrFinalSize) })
        .toBuffer();

      const ticketImageWithQR = await sharp(req.file.buffer)
        .composite([
          {
            input: qrCodeImageBuffer,
            left: parseInt(qrPositionX, 10),
            top: parseInt(qrPositionY, 10),
          },
        ])
        .png()
        .toBuffer();

      // Dodawanie do PDF
      const image = await pdfDoc.embedPng(ticketImageWithQR);
      const page = pdfDoc.addPage([PdfWidth, PdfHeight]);
      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();
      const imageAspectRatio = uploadedImageWidthInPoints / uploadedImageHeightInPoints;
      const pageAspectRatio = pageWidth / pageHeight;
      let drawWidth, drawHeight;

      if (imageAspectRatio > pageAspectRatio) {
        drawWidth = pageWidth;
        drawHeight = drawWidth / imageAspectRatio;
      } else {
        drawHeight = pageHeight;
        drawWidth = drawHeight * imageAspectRatio;
      }

      page.drawImage(image, {
        x: (pageWidth - drawWidth) / 2,
        y: (pageHeight - drawHeight) / 2,
        width: drawWidth,
        height: drawHeight,
      });

      db.run(
        `INSERT INTO Tickets (QrCode, Name, PhoneNr, TableSize, EventName, EventDate) VALUES (?, ?, ?, ?, ?, ?)`,
        [qrCodeValue, null, null, null, eventName, eventDate],
        function (err) {
          if (err) return console.error(err.message);
          console.log(`A row has been inserted with rowid ${this.lastID}`);
        }
      );
    }

    const pdfBytes = await pdfDoc.save();
    const pdfPath = `protected/pdf/tickets-${Date.now()}.pdf`;
    fs.writeFileSync(pdfPath, pdfBytes);
    res.send({ message: 'Bilety wygenerowane pomyślnie.' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Wystąpił błąd podczas generowania biletów' });
  }
});
app.post('/api/confirmedTickets',apiLimiter, authenticateToken, checkPermission(3), refreshToken, (req, res) => {
  const token = req.headers.authorization;
  console.log('Received token:', token);
  db.all(
    'SELECT COUNT(*) AS count FROM Tickets WHERE Deleted IN (3, 4)',
    (err, rows) => {
      if (err) {
        console.error('Error fetching confirmed tickets:', err);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        const confirmedCount = rows[0].count;
        res.json({ confirmedCount });
      }
    }
  );
});


app.get('/api/DisplayTable/:Table',apiLimiter, authenticateToken, checkPermission(1), refreshToken, (req, res) => {
  const tableName = req.params.Table;

  const allowedTables = ['Tickets']; 
  if (!allowedTables.includes(tableName)) {
    return res.status(400).json({ error: 'Nieprawidłowa nazwa tabeli.' });
  }

  const query = `SELECT * FROM ${tableName}`;

  db.all(query, (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Wystąpił błąd podczas pobierania danych z bazy.' });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Nie znaleziono danych.' });
    }
    res.json(rows);
  });
});
app.post('/api/DeleteTickets',apiLimiter, authenticateToken, checkPermission(1), refreshToken, async (req, res) => {
  const IdToUpdate = req.body.ticketIds;
  if (!IdToUpdate || IdToUpdate.length === 0) {
    return res.status(400).json({ message: "No ticket IDs provided for deletion." });
  }

  const placeholders = IdToUpdate.map(() => `?`).join(',');
  const updateQuery = `UPDATE Tickets SET Deleted = false WHERE Id IN (${placeholders})`;

  db.run(updateQuery, IdToUpdate, function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: "An error occurred while updating tickets." });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: "Selected IDs do not exist in the database." });
    } else {
      console.log(`${this.changes} tickets successfully marked as deleted.`);
      return res.status(200).json({
        message: `${this.changes} tickets successfully marked as deleted`,
        updatedTicketIds: IdToUpdate
      });
    }
  });
});

app.get('/api/dashboard',apiLimiter, authenticateToken, refreshToken, checkPermission(3),(req, res) => {
  const userId = req.user.userId;

  db.get('SELECT * FROM Users WHERE Id = ?', [userId], (err, user) => {
    if (err) {
      console.error('Database error', err);
      return res.status(500).json({ message: "An error occurred while fetching user data." });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newToken = generateToken(userId);
    res.cookie('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600000,
      sameSite: 'Strict',
    });

    res.json({ message: "This is the dashboard", user });
  });
});
app.post('/api/CheckTicket',apiLimiter, authenticateToken, refreshToken, (req, res) => {
  const { qrCode} = req.body;
  const scannedBy = req.user.userId;
  db.get('SELECT GroupId, Name, TableSize, Deleted FROM Tickets WHERE QrCode = ?', [qrCode], (err, row) => {
    if (err) {
      res.status(500).json({ error: 'Error reading from the database' });
    } else if (row) {
      const groupId = row.GroupId;
      const currentStatus = row.Deleted;

      if (currentStatus === 3 || currentStatus === 4) {
        res.json({
          found: true,
          alreadyConfirmed: true,
          message: 'Ta osoba została już potwierdzona.'
        });
      } else {
        db.all('SELECT QrCode, Deleted FROM Tickets WHERE GroupId = ?', [groupId], (err, rows) => {
          if (err) {
            res.status(500).json({ error: 'Error reading from the database' });
          } else {
            const tickets = rows.map(ticket => ({
              qrCode: ticket.QrCode,
              deleted: ticket.Deleted
            }));

            const scannedTimestamp = new Date();
            let newStatus;

            switch (currentStatus) {
              case null:
                newStatus = 1;
                break;
              case 0:
                newStatus = 2;
                break;
              default:
                newStatus = currentStatus;
            }

            db.run(
              'UPDATE Tickets SET ScannedTimestamp = ?, ScannedBy = ?, Deleted = ? WHERE QrCode = ?',
              [scannedTimestamp, scannedBy, newStatus, qrCode],
              (err) => {
                if (err) {
                  console.error('Error updating ticket:', err);
                  res.status(500).json({ error: 'Internal server error' });
                } else {
                  res.json({
                    found: true,
                    alreadyConfirmed: false,
                    GroupId: groupId,
                    Name: row.Name,
                    TableSize: row.TableSize,
                    Tickets: tickets,
                    scannedTicket: {
                      qrCode: qrCode,
                      scannedTimestamp: scannedTimestamp,
                      scannedBy: scannedBy,
                      status: newStatus
                    }
                  });
                }
              }
            );
          }
        });
      }
    } else {
      res.json({ found: false, message: 'Nie znaleziono biletu. Proszę spróbować ponownie.' });
    }
  });
});
app.post('/api/ConfirmTicket',apiLimiter, authenticateToken, refreshToken, (req, res) => {
  const { qrCode } = req.body;

  db.get('SELECT GroupId, Deleted FROM Tickets WHERE QrCode = ?', [qrCode], (err, row) => {
    if (err) {
      res.status(500).json({ error: 'Error reading from the database' });
    } else if (row) {
      const groupId = row.GroupId;
      const currentStatus = row.Deleted;

      if (currentStatus === 1 || currentStatus === 2) {
        const newStatus = currentStatus === 1 ? 3 : 4;
        const confirmedTimestamp = new Date();

        db.run(
          'UPDATE Tickets SET ConfirmedTimestamp = ?, Deleted = ? WHERE QrCode = ?',
          [confirmedTimestamp, newStatus, qrCode],
          (err) => {
            if (err) {
              console.error('Error confirming ticket:', err);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              db.all(
                'SELECT COUNT(*) AS count FROM Tickets WHERE GroupId = ? AND Deleted IN (0, 3)',
                [groupId],
                (err, rows) => {
                  if (err) {
                    console.error('Error checking confirmed tickets:', err);
                    res.status(500).json({ error: 'Internal server error' });
                  } else {
                    const confirmedCount = rows[0].count;
                    res.json({
                      success: true,
                      message: 'Bilet został potwierdzony.',
                      allConfirmed: confirmedCount === 0,
                    });
                    io.emit('ticketConfirmed');
                    console.log('ticketConfirmed event emitted'); // Dodaj to logowanie
                  }
                }
              );
            }
          }
        );
      } else {
        res.status(400).json({ error: 'Bilet nie może być potwierdzony.' });
      }
    } else {
      res.status(404).json({ error: 'Bilet nie został znaleziony.' });
    }
  });
});

app.post('/api/AssignTicket', apiLimiter, authenticateToken, refreshToken, (req, res) => {
  const { name, tableSize, phoneNumber, scannedQRCodes, tableNumber, groupId, vip } = req.body;
  console.log('Dane odebrane w /api/AssignTicket:', { name, tableSize, phoneNumber, scannedQRCodes, tableNumber, groupId, vip });

  if (!scannedQRCodes || scannedQRCodes.length === 0) {
    return res.status(400).send("Nie podano kodów QR.");
  }

  const placeholders = scannedQRCodes.map(() => '?').join(',');

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    const checkSql = `SELECT QrCode FROM Tickets WHERE QrCode IN (${placeholders}) AND TRIM(Name) <> ''`;
    db.all(checkSql, scannedQRCodes, (err, rows) => {
      if (err) {
        console.error('Błąd podczas sprawdzania biletów:', err.message);
        db.run('ROLLBACK');
        return res.status(500).send("Wystąpił błąd podczas weryfikacji biletów.");
      }

      console.log('Wynik zapytania CHECK:', rows);
      if (rows.length > 0) {
        const assignedQRCodes = rows.map(row => row.QrCode);
        db.run('ROLLBACK');
        return res.status(400).send(`Bilety o kodach ${assignedQRCodes.join(', ')} są już przypisane.`);
      } else {

        const updateSql = `UPDATE Tickets SET Name = ?, PhoneNr = ?, TableSize = ?, SoldDate = CURRENT_TIMESTAMP, TableNumber = ?, GroupId = ?, Vip = ?, SoldBy = ? WHERE QrCode IN (${placeholders})`;
        db.run(updateSql, [name, phoneNumber, tableSize, tableNumber, groupId, vip, req.user.userId, ...scannedQRCodes], function(err) {
          if (err) {
            console.error('Błąd podczas aktualizacji biletów:', err.message);
            db.run('ROLLBACK');
            return res.status(500).send("Wystąpił błąd podczas aktualizacji biletów.");
          }
          console.log('Liczba zaktualizowanych biletów:', this.changes);
          db.run('COMMIT');
          res.send(`Pomyślnie zaktualizowano ${this.changes} bilet(ów).`);
        });
      }
    });
  });
});

app.post('/api/SoldTickets',apiLimiter, authenticateToken, refreshToken, (req, res) => {
  const query = 'SELECT * FROM Tickets WHERE Name IS NOT NULL';

  db.all(query, (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Wystąpił błąd podczas pobierania danych z bazy.' });
    }

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Nie znaleziono danych.' });
    }

    res.json(rows);
  });
});
app.get('/api/ExistingGroups',apiLimiter, authenticateToken, refreshToken,(req, res) => {
  const query = 'SELECT DISTINCT Name, GroupId, SUM(TableSize) AS TableSize FROM Tickets WHERE GroupId IS NOT NULL GROUP BY GroupId';

  db.all(query, (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Wystąpił błąd podczas pobierania istniejących grup.' });
    }

    res.json(rows);
  });
});
app.get('/api/NextGroupId',apiLimiter, authenticateToken, refreshToken,(req, res) => {
  const query = 'SELECT MAX(GroupId) AS MaxGroupId FROM Tickets';

  db.get(query, (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Wystąpił błąd podczas pobierania kolejnego identyfikatora grupy.' });
    }

    const nextGroupId = row.MaxGroupId ? row.MaxGroupId + 1 : 1;
    res.json({ nextGroupId });
  });
});

app.get('/api/AllGroups', authenticateToken, refreshToken, (req, res) => {
  const query = `
    SELECT Name, GroupId, COUNT(*) AS TableSize
    FROM Tickets
    WHERE GroupId IS NOT NULL
    GROUP BY GroupId
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Wystąpił błąd podczas pobierania wszystkich grup.' });
    }

    res.json(rows);
  });
});
app.put('/api/MoveTicket',apiLimiter, authenticateToken, refreshToken, (req, res) => {
  const { ticketId, targetGroupId } = req.body;

  const query = 'UPDATE Tickets SET GroupId = ? WHERE Id = ?';
  const params = [targetGroupId, ticketId];

  db.run(query, params, (err) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Wystąpił błąd podczas przenoszenia biletu.' });
    }

    res.json({ message: 'Bilet został przeniesiony do nowej grupy.' });
  });
});

app.get('/api/EventNames', authenticateToken, refreshToken, checkPermission(0), (req,res) => {
  const query = 'SELECT DISTINCT EventName FROM Tickets';

  db.all(query,(err, rows) =>{
    if(err){
      console.error(err.message);
      return res.status(500).json({error: 'Wystąpił błąd podczas pobierania wyników.'});
    }
    res.json(rows);
  })
})

app.delete('/api/DeletePdf/:filename',apiLimiter, authenticateToken, refreshToken, checkPermission(0), (req, res) => {
  const { filename } = req.params;
  const { username } = req.user;

  const pdfDirectory = path.join(__dirname,'protected', 'pdf');
  const pdfPath = path.join(pdfDirectory, filename);
  const deletedPdfDirectory = path.join(__dirname, 'protected', 'deleted_pdfs');
  const deletedPdfPath = path.join(deletedPdfDirectory, filename);

  if (fs.existsSync(pdfPath)) {
    try {
      fs.renameSync(pdfPath, deletedPdfPath);
      console.log('Oznaczono jako usunięty:', filename, 'Przez użytkownika', username);
      res.sendStatus(200);
    } catch (error) {
      console.error('Błąd podczas oznaczania pliku jako usunięty:', error);
      res.status(500).json({ error: 'Wystąpił błąd podczas oznaczania pliku PDF jako usunięty.' });
    }
  } else {
    res.status(404).json({ error: 'Plik PDF nie istnieje.' });
  }
});

const deletedPdfDirectory = path.join(__dirname, 'protected', 'deleted_pdfs');


if (fs.existsSync(deletedPdfDirectory)) {
  const deletedFiles = fs.readdirSync(deletedPdfDirectory);

  if (deletedFiles.length > 0) {
    console.log('Znaleziono pliki oznaczone jako usunięte:');
    deletedFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('Czy chcesz trwale usunąć powyższe pliki? (tak/nie): ', (answer) => {
      if (answer.toLowerCase() === 'tak') {
        deletedFiles.forEach((file) => {
          const filePath = path.join(deletedPdfDirectory, file);
          fs.unlinkSync(filePath);
          console.log('Trwale usunięto:', file);
        });
      }
      readline.close();
    });
  }
}
app.post('/api/CreateUser',apiLimiter, authenticateToken, checkPermission(0), (req, res) => {
  const { username, password, permissionsLevel } = req.body;


  if (!username || !password || !permissionsLevel) {
    return res.status(400).json({ error: 'Brakujące dane użytkownika' });
  }

  if (permissionsLevel < 0 || permissionsLevel > 3) {
    return res.status(400).json({ error: 'Poziom uprawnień powinien być między 0 a 3' });
  }
 
    if (password.length < 6) {
      return res.status(400).json({ error: 'Hasło musi mieć co najmniej 6 znaków' });
    }
  

  const checkUserSql = 'SELECT * FROM Users WHERE Name = ?';
  db.get(checkUserSql, [username], (err, row) => {
    if (err) {
      console.error('Błąd podczas sprawdzania istniejącego użytkownika', err);
      return res.status(500).json({ error: 'Błąd serwera' });
    }

    if (row) {
      return res.status(409).json({ error: 'Użytkownik o podanej nazwie już istnieje' });
    }
    if (row) {
      return res.status(400).json({ error: 'Hasło musi mieć co najmniej 6 znaków' });
    }

 
    bcrypt.hash(password, 10, function(err, hash) {
      if (err) {
        console.error('Błąd podczas hashowania hasła', err);
        return res.status(500).json({ error: 'Błąd serwera' });
      }

      const insertUserSql = 'INSERT INTO Users (Name, Password, PermissionsLevel) VALUES (?, ?, ?)';
      const params = [username, hash, permissionsLevel];

      db.run(insertUserSql, params, function(err) {
        if (err) {
          console.error('Błąd podczas dodawania użytkownika do bazy danych', err.message);
          return res.status(500).json({ error: 'Błąd serwera' });
        }

        res.status(201).json({ message: 'Użytkownik został utworzony' });
      });
    });
  });
});

app.post('/api/Statistics',apiLimiter, authenticateToken, checkPermission(3), (req, res) => {
  const { eventName } = req.body;

  const sql = `
    SELECT 
      (SELECT COUNT(*) FROM Tickets WHERE EventName = ? AND Deleted IS NULL AND Name IS NULL) AS availableTickets,
      (SELECT COUNT(*) FROM Tickets WHERE EventName = ? AND Deleted NOT IN (0, 2, 4) AND Name IS NOT NULL) AS soldTickets,
      (SELECT COUNT(DISTINCT GroupId) FROM Tickets WHERE EventName = ? AND Deleted IS NULL) AS groupCount
  `;

  db.get(sql, [eventName, eventName, eventName], (err, row) => {
    if (err) {
      console.error('Błąd podczas pobierania statystyk:', err);
      return res.status(500).json({ error: 'Błąd serwera' });
    }

    const { availableTickets, soldTickets, groupCount } = row;


    const eventNamesSql = `
      SELECT DISTINCT EventName 
      FROM Tickets 
      WHERE EventName IS NOT NULL
    `;

    db.all(eventNamesSql, (err, eventNamesRows) => {
      if (err) {
        console.error('Błąd podczas pobierania nazw eventów:', err);
        return res.status(500).json({ error: 'Błąd serwera' });
      }

      const eventNames = eventNamesRows.map(row => row.EventName);

      res.status(200).json({
        availableTickets,
        soldTickets,
        groupCount,
        eventNames,
      });
    });
  });
});
app.post('/api/users',apiLimiter, authenticateToken, checkPermission(0), (req, res) => {
  const sql = 'SELECT Id, Name FROM Users';

  db.all(sql, (err, rows) => {
    if (err) {
      console.error('Błąd podczas pobierania użytkowników:', err);
      return res.status(500).json({ error: 'Błąd serwera' });
    }

    res.status(200).json(rows);
  });
});


app.put('/api/users/:id', apiLimiter, authenticateToken, checkPermission(1), (req, res) => {
  const userId = req.params.id;
  const { Name, Password, PermissionsLevel } = req.body;

  const checkUserSql = 'SELECT * FROM Users WHERE Id = ?';
  db.get(checkUserSql, [userId], (err, row) => {
    if (err) {
      console.error('Błąd podczas sprawdzania użytkownika:', err);
      return res.status(500).json({ error: 'Błąd serwera' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Użytkownik nie istnieje' });
    }

    const updateUser = () => {
      const updateFields = [];
      const updateValues = [];

      if (Name) {
        updateFields.push('Name = ?');
        updateValues.push(Name);
      }
      if (PermissionsLevel !== undefined) {
        updateFields.push('PermissionsLevel = ?');
        updateValues.push(PermissionsLevel);
      }

      if (updateFields.length === 0 && !Password) {
        return res.status(400).json({ error: 'Brak danych do aktualizacji' });
      }

      if (Password) {
        if (Password.length < 6) {
          return res.status(400).json({ error: 'Hasło musi mieć co najmniej 6 znaków' });
        }

        bcrypt.hash(Password, 10, (err, hash) => {
          if (err) {
            console.error('Błąd podczas hashowania hasła:', err);
            return res.status(500).json({ error: 'Błąd serwera' });
          }

          updateFields.push('Password = ?');
          updateValues.push(hash);

          updateValues.push(userId);

          const updateUserSql = `UPDATE Users SET ${updateFields.join(', ')} WHERE Id = ?`;
          db.run(updateUserSql, updateValues, (err) => {
            if (err) {
              console.error('Błąd podczas aktualizacji użytkownika:', err);
              return res.status(500).json({ error: 'Błąd serwera' });
            }
            res.status(200).json({ message: 'Dane użytkownika zostały zaktualizowane' });
          });
        });
      } else {
        updateValues.push(userId);

        const updateUserSql = `UPDATE Users SET ${updateFields.join(', ')} WHERE Id = ?`;
        db.run(updateUserSql, updateValues, (err) => {
          if (err) {
            console.error('Błąd podczas aktualizacji użytkownika:', err);
            return res.status(500).json({ error: 'Błąd serwera' });
          }
          res.status(200).json({ message: 'Dane użytkownika zostały zaktualizowane' });
        });
      }
    };

    if (Name) {
      const checkUsernameSql = 'SELECT * FROM Users WHERE Name = ? AND Id != ?';
      db.get(checkUsernameSql, [Name, userId], (err, row) => {
        if (err) {
          console.error('Błąd podczas sprawdzania unikalności nazwy użytkownika:', err);
          return res.status(500).json({ error: 'Błąd serwera' });
        }
        if (row) {
          return res.status(409).json({ error: 'Nazwa użytkownika jest już zajęta' });
        }
        updateUser();
      });
    } else {
      updateUser();
    }
  });
});
app.post('/api/SalesData', apiLimiter, authenticateToken, checkPermission(3), (req, res) => {
  const sql1 = `
    SELECT DATE(SoldDate) AS date
    FROM Tickets
    WHERE SoldDate IS NOT NULL AND (Deleted IS NULL OR (Deleted != 0 AND Deleted != 2 AND Deleted != 4))
    GROUP BY DATE(SoldDate)
    ORDER BY DATE(SoldDate);
  `;

  const sql2 = `
    SELECT DATE(t.SoldDate) AS date, CASE WHEN t.SoldBy IS NULL THEN 'Niezalogowany' ELSE u.Name END AS username, COUNT(*) AS count
    FROM Tickets t
    LEFT JOIN Users u ON t.SoldBy = u.Id
    WHERE t.SoldDate IS NOT NULL AND (t.Deleted IS NULL OR (t.Deleted != 0 AND t.Deleted != 2 AND t.Deleted != 4))
    GROUP BY DATE(t.SoldDate), CASE WHEN t.SoldBy IS NULL THEN 'Niezalogowany' ELSE u.Name END
    ORDER BY DATE(t.SoldDate);
  `;

  db.all(sql1, [], (err, dates) => {
    if (err) {
      console.error('Błąd podczas pobierania dat sprzedaży:', err);
      return res.status(500).json({ error: 'Błąd serwera' });
    }

    db.all(sql2, [], (err, userCounts) => {
      if (err) {
        console.error('Błąd podczas pobierania liczby biletów sprzedanych przez użytkowników:', err);
        return res.status(500).json({ error: 'Błąd serwera' });
      }

      const result = dates.map(({ date }) => {
        const total = userCounts.filter(item => item.date === date).reduce((sum, item) => sum + item.count, 0);
        const userCountsData = userCounts.filter(item => item.date === date).reduce((counts, item) => {
          counts[item.username] = item.count;
          return counts;
        }, {});

        return { date, total, user_counts: userCountsData };
      });

      res.status(200).json(result);
    });
  });
});
app.get('/api/EventCalendar',apiLimiter, (req, res) => {
  const query = `
    SELECT DISTINCT EventName, EventDate
    FROM Tickets
    WHERE EventName IS NOT NULL AND EventDate IS NOT NULL
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Błąd podczas pobierania danych z bazy danych' });
    } else {
      res.json(rows);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on ${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://localhost:${PORT}`);
});