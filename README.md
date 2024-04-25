TicketMaster
TicketMaster to system generowania i weryfikacji biletów, który oferuje szereg funkcji ułatwiających zarządzanie i sprzedaż biletów. Aplikacja składa się z klienta napisanego w React.js oraz serwera zbudowanego w Node.js.
Funkcje

Podgląd live zaakceptowanych biletów
Statystyki: liczba dostępnych biletów, sprzedanych biletów oraz liczba grup
Wykres sprzedaży biletów przez zalogowanego użytkownika
Kalendarz odliczający czas do zaplanowanego eventu
Tworzenie i edycja użytkowników z różnymi poziomami uprawnień (od 0 do 3, gdzie 0 to najwyższe uprawnienia)
Generowanie unikalnych kodów QR na biletach
Sprawdzanie i anulowanie biletów
Podgląd sprzedanych biletów
Generowanie pliku PDF ze wszystkimi wygenerowanymi biletami

Technologie

React.js (klient)
Node.js (serwer)
API REST do komunikacji między klientem a serwerem
Socket.IO dla danych w czasie rzeczywistym
Baza danych SQLite
Uwierzytelnianie użytkowników przy użyciu tokenów JWT

Instalacja

Sklonuj repozytorium: git clone https://github.com/Marvizz/TicketMaster.git
Przejdź do folderu projektu: cd TicketMaster
Zainstaluj zależności: npm install
Skonfiguruj plik .env.production.local w głównym folderze z następującymi zmiennymi:
Copy codeJWT_SECRET=
PORT=3001
CORS_ORIGIN=
NODE_ENV=development/production

Uruchom aplikację: npm start

Aplikacja kliencka będzie dostępna pod adresem http://localhost:3001, a serwer będzie nasłuchiwał na porcie 3000.
Aby stworzyć statyczną wersję klienta, użyj polecenia npm run build. Statyczne pliki zostaną wygenerowane w folderze build.
Baza danych
W folderze protected/sqllite znajduje się zainicjowana baza danych z jednym użytkownikiem o nazwie "User" i haśle "Haslo1". W tym folderze znajdują się również pliki, które pozwalają na tworzenie bazy danych, użytkownika, wyświetlanie wybranej tabeli oraz usuwanie użytkownika. Dane należy określić bezpośrednio w kodzie tych plików. Plik DisplayTable.js przyjmuje parametr przy wywoływaniu, np. node DisplayTable.js Users, co wyświetli tabelę z użytkownikami.

Znane problemy:
Zmiana miejsca kodu QR podczas generowania biletów może nie działać poprawnie na przeglądarce Safari na komputerach Mac.
Przesuwanie kodu QR na urządzeniach mobilnych nie jest obecnie obsługiwane.

Licencja
Ten projekt jest udostępniany na licencji GNU General Public License. Więcej informacji znajdziesz w pliku LICENSE.