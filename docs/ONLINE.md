# Online T12 — sesja gościnna 0.1.14

To pierwsza wspólna mapa do testów: Vareon, las, ruch innych graczy, wspólne potwory, zdarzenia walki i łup. Serwer oblicza kolizje, zasięgi, cooldowny, obrażenia i nagrody. Nie ma PvP ani dzielenia EXP drużyny; nagrodę za zabójstwo dostaje osoba z ostatnim trafieniem, łup na ziemi może zebrać jedna pobliska osoba. Questy, NPC, czary profesji i depo działają w pamięci sesji. Market nie jest jeszcze dostępny.

## Komputer i telefon w jednej sieci

Z aktualnego katalogu `eldoria-main`, w Node.js 24:

```sh
npm ci
npm run dev:online
```

Polecenie uruchamia backend, sprawdza jego gotowość i uruchamia Vite dla LAN. Używa bezpośrednio Node, więc nie wymaga `spawn npm` na Windowsie. Wypisany adres `http://ADRES_KOMPUTERA:5173` otwórz na komputerze i telefonie w tej samej sieci Wi-Fi. Pozostaw terminal uruchomiony. W menu na obu urządzeniach wybierz **Online — wspólna sesja testowa**, różne nicki oraz dowolne profesje. Nie uruchamiaj osobnego serwera na drugim komputerze — gracze mają wejść na ten sam adres pierwszego komputera.

Jeśli telefon nie otwiera strony, sprawdź ten adres na komputerze i dopuść Node w Zaporze Windows w sieci prywatnej. Ruch HTTP/WebSocket idzie przez port 5173; backend domyślnie nasłuchuje lokalnie na 2567. Ctrl+C kończy serwery. To lokalny test; publiczne wdrożenie jest osobnym etapem.

## Cztery kroki testu

1. Wejdź dwiema postaciami. Obie widzą drugą postać, jej nick i małe HP. Własne HP/mana lub łuki wybierz w menu **przed wejściem**; drugi gracz nie widzi twojej many ani łuków.
2. Odsuń jedną postać od drzwi. Przejdź drugą przez miasto i północną bramę. Sprawdź płynność jej ruchu na drugim ekranie; zajęta kratka blokuje wejście.
3. Walczcie ze szczurem w lesie. Sprawdź wspólne obrażenia, śmierć, animacje i pojedynczy łup. Wybrane czary i broń zachowują wymagania profesji, poziomu, odległości oraz widoczności. Graj również joystickiem i drugim palcem używaj akcji.
4. Wyjdź jedną postacią przez Menu: znika z drugiego ekranu. Ponowne wejście tworzy nową postać poziomu 1. Przełącz na zapis offline: jego poprzedni postęp pozostaje. Zgłoś oba urządzenia, nicki i opis ewentualnego błędu.

**Postęp online jest nietrwały.** Menu/rozłączenie kończy postać, restart serwera usuwa cały świat, a opuszczenie ostatniego gracza zwalnia pokój. Konto i zapis serwerowy są T13/T14; odzyskanie sesji to T15. Nick nie jest kontem ani potwierdzoną tożsamością. Offline złoto, import JSON i lokalny stash nie trafiają online. Nie ma automatycznej zamiany online na offline przy awarii.

## Dla rozwoju

`npm run dev:server` uruchamia sam backend; `npm run dev` uruchamia klienta. `GET /health` backendu zwraca `status: ok`, `protocolVersion: 1`, `mode: guest-test`. Domyślny klient łączy się przez `/online` na swoim originie, także w Vite preview. Port/host backendu można ustawić zmiennymi procesu `ELDORIA_SERVER_PORT` / `ELDORIA_SERVER_HOST`; launcher dostosowuje proxy do portu. Bez launchera ustaw również `ELDORIA_PROXY_TARGET`. Osobno hostowany klient wymaga adresu `VITE_ONLINE_URL` przy budowie. `npm run dev:online` jest wariantem dla web/LAN; istniejący APK pozostaje offline bez skonfigurowanego dostępnego endpointu online.

Jedna sesja mieści maksymalnie 8 gości. Symulacja 20 Hz, spersonalizowane pełne snapshoty 10 Hz, publiczne postacie w promieniu 20 kratek. Klient wysyła walidowaną intencję ze swoim numerem kolejności; ID gracza nadaje transport. Odrzucane są dodatkowe pola HP/złota/pozycji, duplikaty, błędne komendy i nadmiar ponad 30 komend/s (burst 30). Limit wejściowej wiadomości WebSocket: 4096 bajtów; dodatkowy limit transportu: 120 wiadomości/s. To zabezpieczenia prototypu, bez kompletnej ochrony publicznego serwera i bez testu obciążenia M5.

Walidacja: `npm run typecheck`, `npm run lint`, `npm test`, `npm run validate:content`, `npm run build`, `npm run test:e2e -- online.spec.ts`. Playwright uruchamia wymagany backend i klienta; testy jednostkowe uruchamiają dodatkowy serwer na losowym lokalnym porcie. Automatyczne mobilne Chromium nie zastępuje testu na fizycznym telefonie.
