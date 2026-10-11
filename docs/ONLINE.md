# Eldoria online 0.1.15 — konta i postacie

Serwer rozstrzyga ruch, kolizje, zasięgi, cooldowny, obrażenia i nagrody. Wspólny świat mieści osiem postaci, bez PvP i współdzielenia EXP drużyny. Nagrodę dostaje ostatni atakujący, pobliski łup może zebrać jedna osoba. Offline nigdy nie importuje salda, wyposażenia ani stashu na konto.

## Komputer i telefon w jednej sieci

Wymagane: Node.js 24 i uruchomiony Docker Desktop (Linux containers / Compose). W katalogu `eldoria-main`:

```sh
npm ci
npm run db:up
npm run dev:online
```

Launcher uruchamia backend, sprawdza jego gotowość i uruchamia Vite dla LAN bez `spawn npm` na Windows. Otwórz wypisany adres `http://ADRES_KOMPUTERA:5173` na obu urządzeniach w tej samej sieci Wi-Fi. Pozostaw terminal i Docker uruchomione. Dopuść Node w Zaporze Windows w sieci prywatnej, jeśli telefon nie otwiera strony. Backend i PostgreSQL domyślnie nasłuchują wyłącznie lokalnie; nie przekierowuj portów routera. Publiczne wdrożenie wymaga osobnego etapu i HTTPS.

Na stronie startowej wpisz email i hasło (10–128 znaków), kliknij **Załóż konto**, utwórz postać Knight/Archer/Mag i wybierz **Graj**. Nick ma 3–16 znaków i jest unikalny. Konto bezpłatne mieści trzy postacie, premium pięć. Nie ma jeszcze weryfikacji emaila, resetu hasła, płatności ani kasowania postaci. Nie używaj hasła z innych serwisów podczas lokalnego testu.

## Pięć kroków testu

1. Załóż konto i utwórz po jednej postaci każdej profesji. Czwartej na bezpłatnym koncie nie da się utworzyć. Wejdź wybraną postacią.
2. Przejdź kilka kratek, otwórz plecak i obejrzyj skille. Wyjdź przez Ustawienia, ponownie wybierz tę samą postać: pozycja i postęp powinny pozostać. Nie można wejść na tę samą postać jednocześnie na dwóch urządzeniach.
3. Na drugim koncie dołącz inną postacią. Widać jej nick, `lvl:` i mały HP; mana i łuki należą wyłącznie do właściciela. Na telefonie są tylko plecak i zębatka w rogu. Zmień własne HP/manę w Ustawieniach podczas gry.
4. Walcz w lesie. Skille rosną od trafień mieczem/łukiem i zużytej many. Spróbuj wyjść: gra blokuje wylogowanie przez 60 sekund od ostatniego trafienia. Wróć do bezpiecznego miasta i poczekaj na koniec walki, potem wyjdź.
5. Zaloguj się ponownie i sprawdź zapis. Pozostaw postać bez dotykania/klawiatury na 15 minut: sesja wygaśnie. Przy utracie połączenia w walce postać pozostaje narażona na potwory aż walka ustanie. Zgłoś urządzenie, nick, miejsce i czynności poprzedzające błąd.

## Baza i aktualizacje

`db:up` tworzy losowe dane dostępu w ignorowanym folderze `.eldoria-local` oraz PostgreSQL 17.6 w trwałym wolumenie `eldoria-local_postgres`. **Przy rozpakowywaniu nowego ZIP skopiuj `.eldoria-local` ze starego folderu.** Nie pokazuj ani nie commituj `server.env`. Jeśli wolumen istnieje, a pliku brakuje, skrypt przerywa bez usuwania bazy. `npm run db:down` zatrzymuje bazę, zachowując dane. Ctrl+C zatrzymuje serwery gry.

Migracje wykonują się automatycznie i idempotentnie przy starcie backendu. Zewnętrzna baza wymaga serwerowej zmiennej `DATABASE_URL`; przy takim wariancie pomiń `db:up`. Nigdy nie dodawaj sekretów do `VITE_*`. Hasła mają scrypt z losową solą, sesje losowy token w HttpOnly/SameSite cookie, w bazie tylko jego skrót. HTTPS publicznego serwera wymaga secure cookie (`ELDORIA_SECURE_COOKIE=1`) i osobnego przygotowania wdrożenia.

Uprawnienie premium administrator nadaje lokalnie:

```sh
npm run account:tier -- email@example.com premium
```

Powrót do bezpłatnego konta (`free`) jest blokowany, jeśli istnieje więcej niż trzy postacie. Przeglądarka nie może sama zmienić uprawnienia. To narzędzie administracyjne, bez mechanizmu zakupów.

## Granice trwałości i rozwoju

Checkpoint co pięć sekund oraz zapis przed potwierdzeniem bezpiecznego wyjścia obejmują postać, skille, plecak, stash, ustawienia łupu i zadania. Restart przywraca postacie, ale resetuje potwory i łup na ziemi. Awaria może utracić ostatnie pięć sekund zmian postaci. **T14 nadal TODO:** transakcje gospodarki, idempotentne wypłaty i zapis przed ACK każdej operacji ekonomicznej. **T15 nadal TODO:** automatyczny reconnect i transfer regionów. Błąd połączenia wraca do menu, bez symulacji offline.

Sesja ma absolutny limit siedmiu dni oraz 15 minut bezczynności. Samo pobieranie widoku konta nie przedłuża sesji. Aktywność użytkownika lub prawidłowe komendy ją przedłużają. Wylogowanie podczas walki jest blokowane; wymuszone rozłączenie pozostawia postać w świecie do ustania walki. Nie jest to ochrona przed śmiercią po utracie sieci.

Symulacja 20 Hz, snapshoty 10 Hz, publiczne postacie w promieniu 20 kratek. Komendy mają kolejność i walidację; odrzucane są fałszywe HP/złoto/pozycja, duplikaty i nadmiar ponad 30 komend/s (burst 30). Wiadomości mają limit 4096 bajtów i transport 120/s. Nie jest to test obciążenia MMORPG.

`npm run dev:server` uruchamia sam backend, `npm run dev` klienta. Health backendu: `GET /health`, `status: ok`, `protocolVersion: 2`, `mode: accounts`. Vite proxy obsługuje `/api` i `/online` na jednym originie, także w preview. Osobny host/native APK wymaga dodatkowego przygotowania endpointów i cookies; dotychczasowa instrukcja APK obejmuje offline.

Kontrole: `npm run typecheck`, `npm run lint`, `npm test`, `npm run validate:content`, `npm run build`, `npm run test:e2e -- accounts.spec.ts online.spec.ts`. Przed testami uruchom bazę. Integracje korzystają z izolowanych schematów i usuwają tylko własne dane. Przy braku bazy testy PostgreSQL są pomijane — nie stanowi to weryfikacji kont. Playwright sprawdza desktop i emulowany telefon, bez testu fizycznego urządzenia.
