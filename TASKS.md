# Eldoria — kolejka implementacji

Statusy: TODO, IN_PROGRESS, BLOCKED, REVIEW (ocena testera), DONE (implementacja sprawdzona). Wszystkie poniższe zadania są TODO. Dokumentacja nie jest dowodem wykonania kodu.

## Zasady kolejki
Bierz pierwszy gotowy wpis. Zależności muszą być DONE; wyjątek: po T02 REVIEW można budować domenę, lecz nie rozbudowywać finalnej mapy przed akceptacją stylu. Każdy wpis po pracy uzupełnij o dowód: polecenia/wyniki, pliki, screenshot lub scenariusz manualny. Opisane niżej testy są wymaganiem, nie raportem ich wykonania.

| ID | Etap | Zadanie | Zależności |
|---|---|---|---|
| T01 | M0 | Szkielet repozytorium | — |
| T02 | M0 | Zestaw assetów i scena wzorcowa | T01 |
| T03 | M0 | Gateway, ruch i mobilny HUD | T01 |
| T04 | M1 | Pipeline Tiled i walidacja | T01 |
| T05 | M1 | Vareon, las i portale | T02 zaakceptowane, T03, T04 |
| T06 | M1 | NPC i dialogi | T05 |
| T07 | M2 | Potwory, AI i walka | T03, T04 |
| T08 | M2 | Ekwipunek, loot i mikstury | T07 |
| T09 | M2 | Sklep i quest | T06, T08 |
| T10 | M2 | Zapis i odtworzenie | T09 |
| T11 | M2 | Wydanie 0.1 i poprawki mobilne | T05–T10 |
| T12 | M3 | Serwer i protokół | T11 |
| T13 | M3 | Konta i PostgreSQL | T12 |
| T14 | M3 | Gospodarka i trwałość | T13 |
| T15 | M3 | Regiony i reconnect | T14 |
| T16 | M3 | Testy online i zabezpieczenia | T15 |
| T17 | M4 | Capacitor i APK | T16 |
| T18 | M4 | Test urządzenia i profilowanie | T17 |
| T19 | M5 | Profesje i loch | T18 |
| T20 | M5 | Operacje i obciążenie | T16, T19 |
| T21 | M6 | Checklista publikacji | T20 |

## Kryteria zadań
### T01 — TODO
Monorepo npm workspaces, Vite/Phaser 3, TypeScript strict, Vitest, lint i lockfile. Uruchamia się menu z wersją. Udostępnione komendy z README, .env.example i ignorowanie sekretów. Dowód: czysta instalacja, typecheck, test i build; Playwright otwiera menu.

### T02 — TODO
Katalog licencji i jeden zestaw graficzny. Scena z domem, drzewem, ścieżką, postacią 4-kierunkową i UI; test nearest filtering oraz kamery. Screenshot na desktopie i viewport mobilny, jasno wymienione placeholdery. Oddaj do REVIEW; odnotuj akceptację lub uwagi testera. Brak licencji blokuje wykorzystanie assetu.

### T03 — TODO
Domena siatkowa, zegar symulacji, GameGateway/LocalGateway, joystick i klawiatura, HP/mana i przyciski. Kolizje i pojedynczy krok, reset na pointercancel/focus loss. Testy: brak diagonali, brak przejścia przez ścianę, poprawny czas kroku, joystick plus atak jednocześnie. Symulacja działa bez importu Phaser.

### T04 — TODO
Źródła Tiled, eksport JSON, importer i walidator map/ID/portali/spawnów. Wadliwa mapa zwraca czytelny błąd; poprawna ma zgodne kolizje. Test błędnego portalu, brakującego PNG i spawnu w ścianie.

### T05 — TODO
Vareon 48×48 i las 64×64, sortowanie stóp, korony/dachy, przejścia. 5 podróży w obie strony bez zdublowanych inputów/listenerów; spawn wolny, gracz nie zapętla teleportu. Safe-area i viewport w poziomie.

### T06 — TODO
Mira, Oren, Borin; rozmowa z sąsiedztwa, zamknięcie okna, leczenie i dane dialogów. Przycisk pod dialogiem nie wykonuje równocześnie ataku. Test interakcji z odległości i zablokowania ruchu w menu.

### T07 — TODO
Szczur/żuk/wilk, AI idle/chase/attack/return/dead, cooldowny, wybór celu, Iskra i śmierć gracza. Test: zasięg, ściana, mana, cooldown, pojedyncza śmierć, leash/respawn i brak walki w mieście. Minimum ręczny pojedynek z każdym typem stworzenia.

### T08 — TODO
20 pól, stosy, wyposażenie, loot w sąsiedztwie, mikstury. Test pełnego plecaka, granicy stosu, użycia przy pełnym HP i braku mikstur. Mikstura przy pełnym HP nie jest zużywana. Podwójne kliknięcie nie duplikuje łupu.

### T09 — TODO
Quest i sklep według README. Quest liczy zabójstwa tylko po przyjęciu, nagroda najwyżej raz; pełny plecak zostawia odbiór pending bez wypłacania części wielokrotnie. Zakup atomowy, brak ujemnego złota. Test powtórnej wypłaty, braku złota i pełnego plecaka.

### T10 — TODO
Wersjonowany zapis, walidacja, backup poprzedniego poprawnego zapisu i błąd quota. Odtworzenie poziomu, inventory, questa i pozycji; nie zapisuj aktywnego cooldownu jako możliwości natychmiastowego oszustwa w przyszłym online. Test uszkodzenia, nieobsługiwanej wersji, powrotu po śmierci i wielokrotnego odczytu.

### T11 — TODO
Pełny smoke test 0.1, UI dotykowe, audio ustawienia, aktualna instrukcja dla testera. Typecheck/lint/test/e2e/content/build. Tester dostaje 5 kroków: rozmowa, las, walka, nagroda, restart. Zanotuj model telefonu oraz ograniczenia. Brak testu telefonu oznacz jako niewykonany, a nie zaliczony.

### T12 — TODO
Node/Colyseus, OnlineGateway i serwer domeny. Dwa klienty widzą tę samą postać/potwora. Klient wysyła intencję, serwer oblicza skutek. Test fałszywego HP/złota, teleportu, niepoprawnego schematu i limitu komend. Nie implementuj protokołu na podstawie API innej wersji Colyseus.

### T13 — TODO
Konta, logowanie, haszowanie, tokeny i migracje PostgreSQL, compose dla lokalnego testu. Jedna aktywna sesja postaci; test błędnego logowania i wygaśnięcia tokenu. Offline zapis nie jest importowany. Sekrety poza repo.

### T14 — TODO
Serwerowy inventory/quest/sklep i transakcje. Idempotentne nagrody, zapis ekonomii przed ACK, ograniczenia w DB. Test równoległego zakupu, powtórzonej komendy i restartu pomiędzy zapisem a odpowiedzią; brak duplikacji i ujemnych ilości.

### T15 — TODO
Obszar zainteresowania, regiony i przekazanie postaci, utrata połączenia oraz reconnect. Test przerwania transferu na każdym kroku, ponowionego transferu i reconnect w walce; postać należy do jednego regionu. UI pokazuje stan sieci i nie przechodzi do offline.

### T16 — TODO
Dwa rzeczywiste klienty, lag 150/300 ms i packet loss, restart serwera, sesje, rate limiting, poprawność checkpointów. Raport wyników i znanych ograniczeń. Multiplayer nie jest DONE po samym otwarciu WebSocket.

### T17 — TODO
Capacitor, konfiguracja Android, ikona i testowy build. Instrukcja SDK/JDK i uruchomienia. Jeśli build niedostępny, status BLOCKED z brakującą zależnością. APK wykonany wymaga ścieżki do rzeczywistego pliku i wyniku kompilacji.

### T18 — TODO
Instalacja na telefonie testera, multitouch, klawiatura, obrócenie, tło/powrót, audio, reconnect, 15 minut gry i pomiar FPS/pamięci. Popraw wykryte blockery; nie obiecuj 60 FPS bez pomiaru.

### T19 — TODO
Zaprojektuj i wdroż cztery profesje, jeden loch i bossa. Parametry oraz różnice omawiane z testerem przed rozbudową; test zdolności i nagród. Nie kopiuj nazw/assetów z Tibii.

### T20 — TODO
Logi bez sekretów, metryki, kopie, próbne odtworzenie, moderacja, healthcheck. Load test 10/25/50 aktywnych klientów po 15 minut i raport kosztu/limitów konkretnej maszyny. Optymalizacje wynikają z pomiarów.

### T21 — TODO
Aktualne wymogi Android/Google Play, prywatność, usuwanie konta, podpisywanie, procedura aktualizacji i rollback. Audyt krytycznych usterek. Nie publikuj ani nie pobieraj opłat bez osobnej instrukcji właściciela.

## Stan sesji
- Ostatnio ukończone: wyłącznie pakiet specyfikacji.
- Aktualne zadanie: brak.
- Następne: T01, potem T02/T03/T04 zgodnie z zależnościami.
- Blockery: assety finalne nie zostały wybrane ani zatwierdzone; środowisko implementacji i SDK nie zostały sprawdzone.
- Uwagi testera: wymagane ostre pixel art i przyjemne audio; tester nie chce ręcznie programować.
- Wyniki testów kodu: nie dotyczy — kod gry jeszcze nie powstał.

## Szablon raportu zadania
ID / status / zmienione pliki / wykonane komendy i wyniki / test manualny / ograniczenia / następny krok.

## Jak zgłaszać błędy
Wersja, urządzenie/przeglądarka, kroki, oczekiwany efekt, rzeczywisty efekt, screenshot jeśli pomocny. Tester może napisać to zwykłym językiem; Codex zamienia zgłoszenie w zadanie i scenariusz sprawdzenia.
