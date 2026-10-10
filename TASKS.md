# Eldoria — kolejka implementacji

Statusy: TODO, IN_PROGRESS, BLOCKED, REVIEW (ocena testera), DONE (implementacja sprawdzona). Bieżące statusy i dowody wykonania poniżej. Specyfikacja kryteriów nie zastępuje wyników kontroli. Wersja 0.0.1 jest prototypem, nie ukończoną wersją 0.1.

## Zasady kolejki
Bierz pierwszy gotowy wpis. Zależności muszą być DONE; wyjątek: po T02 REVIEW można budować domenę, lecz nie rozbudowywać finalnej mapy przed akceptacją stylu. Każdy wpis po pracy uzupełnij o dowód: polecenia/wyniki, pliki, screenshot lub scenariusz manualny. Opisane niżej testy są wymaganiem, nie raportem ich wykonania.

| ID | Etap | Status | Zadanie | Zależności |
|---|---|---|---|---|
| T01 | M0 | DONE | Szkielet repozytorium | — |
| T02 | M0 | REVIEW | Zestaw assetów i scena wzorcowa | T01 |
| T03 | M0 | DONE | Gateway, ruch i mobilny HUD | T01 |
| T04 | M1 | DONE | Pipeline Tiled i walidacja | T01 |
| T05 | M1 | BLOCKED | Vareon, las i portale | T02 zaakceptowane, T03, T04 |
| T06 | M1 | BLOCKED | NPC i dialogi | T05 |
| T07 | M2 | DONE | Potwory, AI i walka | T03, T04 |
| T08 | M2 | DONE | Ekwipunek, loot i mikstury | T07 |
| T09 | M2 | BLOCKED | Sklep i quest | T06, T08 |
| T10 | M2 | BLOCKED | Zapis i odtworzenie | T09 |
| T11 | M2 | BLOCKED | Wydanie 0.1 i poprawki mobilne | T05–T10 |
| T12 | M3 | TODO | Serwer i protokół | T11 |
| T13 | M3 | TODO | Konta i PostgreSQL | T12 |
| T14 | M3 | TODO | Gospodarka i trwałość | T13 |
| T15 | M3 | TODO | Regiony i reconnect | T14 |
| T16 | M3 | TODO | Testy online i zabezpieczenia | T15 |
| T17 | M4 | TODO | Capacitor i APK | T16 |
| T18 | M4 | TODO | Test urządzenia i profilowanie | T17 |
| T19 | M5 | TODO | Profesje i loch | T18 |
| T20 | M5 | TODO | Operacje i obciążenie | T16, T19 |
| T21 | M6 | TODO | Checklista publikacji | T20 |

## Kryteria zadań
### T01 — DONE

**Wynik sesji:** Monorepo npm workspaces, Phaser 3.90.0/Vite/TypeScript strict, lockfile, ESLint 10, Vitest i Playwright. Menu z wersją, .env.example, skrypty README i CI. Czysta instalacja npm ci i kontrole opisane w raporcie sesji.

**Kryteria docelowe:**
Monorepo npm workspaces, Vite/Phaser 3, TypeScript strict, Vitest, lint i lockfile. Uruchamia się menu z wersją. Udostępnione komendy z README, .env.example i ignorowanie sekretów. Dowód: czysta instalacja, typecheck, test i build; Playwright otwiera menu.

### T02 — REVIEW

**Wynik sesji:** Autorskie placeholdery: kafelki 32×32, postać 4 kierunki × 3 klatki 32×48, dom, drzewa i trzy stworzenia. Źródła PNG/Tiled + odtwarzalny generator, ASSET_LICENSES.md. Zrzuty desktop/mobilny: docs/screenshots/. Oceniono ostrość i kamerę; brak audio. Wymagana ocena stylistyki przez testera przed pełnymi mapami T05.

**Kryteria docelowe:**
Katalog licencji i jeden zestaw graficzny. Scena z domem, drzewem, ścieżką, postacią 4-kierunkową i UI; test nearest filtering oraz kamery. Screenshot na desktopie i viewport mobilny, jasno wymienione placeholdery. Oddaj do REVIEW; odnotuj akceptację lub uwagi testera. Brak licencji blokuje wykorzystanie assetu.

### T03 — DONE

**Wynik sesji:** Domena bez Phaser/DOM, tick 20 Hz, wstrzyknięty zegar, GameGateway/LocalGateway, komendy walidowane Zod i izolowane snapshoty. D-pad/WASD, kolizje i krok 200 ms, reset pointercancel/blur/resize, HP/mana, przyciski 48+ CSS px. Test emulowanego wielodotyku: ruch + Iskra działa. Fizyczny telefon: niewykonany.

**Kryteria docelowe:**
Domena siatkowa, zegar symulacji, GameGateway/LocalGateway, joystick i klawiatura, HP/mana i przyciski. Kolizje i pojedynczy krok, reset na pointercancel/focus loss. Testy: brak diagonali, brak przejścia przez ścianę, poprawny czas kroku, joystick plus atak jednocześnie. Symulacja działa bez importu Phaser.

### T04 — DONE

**Wynik sesji:** Edytowalne .tmj, PNG i eksport JSON, importer, validate:content. Walidacja wymiarów, ID, warstw, PNG, portali, spawnów w ścianie i transformacji GID. Dwie mapy 28×22 są wzorcami, nie pełnymi mapami T05. Testy wadliwych danych i zgodności źródło/eksport przechodzą.

**Kryteria docelowe:**
Źródła Tiled, eksport JSON, importer i walidator map/ID/portali/spawnów. Wadliwa mapa zwraca czytelny błąd; poprawna ma zgodne kolizje. Test błędnego portalu, brakującego PNG i spawnu w ścianie.

### T05 — BLOCKED

**Wynik sesji:** Oczekuje akceptacji T02. Zgodnie z AGENTS.md: „Do akceptacji stylistyki przez testera nie rozwijaj całego świata na niesprawdzonym zestawie”. Nie wykonano finalnych Vareon 48×48 ani lasu 64×64. Małe mapy wzorcowe umożliwiają już test portali, kamery i sterowania.

**Kryteria docelowe:**
Vareon 48×48 i las 64×64, sortowanie stóp, korony/dachy, przejścia. 5 podróży w obie strony bez zdublowanych inputów/listenerów; spawn wolny, gracz nie zapętla teleportu. Safe-area i viewport w poziomie.

### T06 — BLOCKED

**Wynik sesji:** Oczekuje T05. W scenie wzorcowej nie ma jeszcze Miry, Orena ani Borina; okno plecaka nie jest implementacją dialogów NPC.

**Kryteria docelowe:**
Mira, Oren, Borin; rozmowa z sąsiedztwa, zamknięcie okna, leczenie i dane dialogów. Przycisk pod dialogiem nie wykonuje równocześnie ataku. Test interakcji z odległości i zablokowania ruchu w menu.

### T07 — DONE

**Wynik sesji:** Szczur/żuk/wilk, stany AI, ograniczony A*, cooldowny miecza/Iskry, zasięg i linia widzenia, mana i regeneracja, EXP/awans, leash/respawn i śmierć gracza. Bezpieczny dziedziniec nie pozwala walczyć. W przeglądarce zweryfikowano pojedynki z każdym typem przez rzeczywiste UI (e2e). Testy domeny: cooldown, brak many, ściana, brak teleportu, powrót/HP bez EXP, pojedyncze nagrody, śmierć, respawn. Wilk przeniesiony poza zasięg wejścia do wzorcowej sceny, aby nie atakował przed nauką sterowania.

**Kryteria docelowe:**
Szczur/żuk/wilk, AI idle/chase/attack/return/dead, cooldowny, wybór celu, Iskra i śmierć gracza. Test: zasięg, ściana, mana, cooldown, pojedyncza śmierć, leash/respawn i brak walki w mieście. Minimum ręczny pojedynek z każdym typem stworzenia.

### T08 — DONE

**Wynik sesji:** Plecak 20 pól, stosy do 99, broń/pancerz, zakładanie/zdejmowanie, mikstury, łup odbierany tylko obok. Nagrody są atomowe: pełny plecak pozostawia przedmiot i złoto na ziemi, duplikat Loot nie wypłaca drugi raz. UI plecaka i odbiór skóry/chityny sprawdzone w przeglądarce; testy granic stosów i pełnego plecaka w domenie.

**Kryteria docelowe:**
20 pól, stosy, wyposażenie, loot w sąsiedztwie, mikstury. Test pełnego plecaka, granicy stosu, użycia przy pełnym HP i braku mikstur. Mikstura przy pełnym HP nie jest zużywana. Podwójne kliknięcie nie duplikuje łupu.

### T09 — BLOCKED

**Wynik sesji:** Oczekuje T06. Próba trzech typów potworów jest osobną pętlą treningową, nie questem Miry. Sklep i wypłata questa nie są zaimplementowane.

**Kryteria docelowe:**
Quest i sklep według README. Quest liczy zabójstwa tylko po przyjęciu, nagroda najwyżej raz; pełny plecak zostawia odbiór pending bez wypłacania części wielokrotnie. Zakup atomowy, brak ujemnego złota. Test powtórnej wypłaty, braku złota i pełnego plecaka.

### T10 — BLOCKED

**Wynik sesji:** Oczekuje T09. Stan gry nie jest jeszcze utrwalany; odświeżenie i nowa próba resetują postęp. Nie ma importu/eksportu, backupu ani obsługi quota — nie testowano ich jako gotowych.

**Kryteria docelowe:**
Wersjonowany zapis, walidacja, backup poprzedniego poprawnego zapisu i błąd quota. Odtworzenie poziomu, inventory, questa i pozycji; nie zapisuj aktywnego cooldownu jako możliwości natychmiastowego oszustwa w przyszłym online. Test uszkodzenia, nieobsługiwanej wersji, powrotu po śmierci i wielokrotnego odczytu.

### T11 — BLOCKED

**Wynik sesji:** Oczekuje T05–T10. Dostępna pierwsza grywalna scena 0.0.1 i docs/TESTER.md, lecz pełne wydanie 0.1 oraz test telefonu nie są ukończone.

**Kryteria docelowe:**
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

## Stan sesji — 9 października 2026

- Ostatnio ukończone: T01, T03, T04, T07, T08; T02 w REVIEW.
- Wersja do testów: 0.0.1, „Próba Wędrowca”: dziedziniec → brama → szczur/żuk/wilk → łup/plecak → ukończenie próby. Dodatkowo spacer bez potworów do oceny stylu.
- Następne: ocena sceny T02 przez testera, potem T05 → T06 → T09 → T10 → T11. Nie przechodzimy do online ani Androida przed wymaganymi etapami.
- Blocker dalszych pełnych map: akceptacja stylu zgodnie z AGENTS.md i ROADMAP.md M0. Obie obecne mapy są wzorcowe 28×22.
- Uwagi testera: wymagane ostre pixel art i przyjemne audio; finalna grafika niezaakceptowana, audio świadomie wyłączone. Tester nie programuje.
- Ograniczenia: brak NPC, sklepu, questa i trwałego zapisu; brak multiplayer, APK oraz pomiarów FPS na telefonie.

### Dowody i wyniki kontroli

- `npm ci --no-audit --no-fund` — czysta instalacja z lockfile, Node 24.19.0/npm 11.9.0.
- `npm run typecheck` — PASS, TypeScript strict.
- `npm run lint` — PASS, ESLint 10 (wcześniejszy niewspierany ESLint 9 zastąpiono kompatybilną wersją 10).
- `npm test` — PASS, 29 testów w 3 plikach: siatka/kolizje, komendy, portale, zegar, lifecycle gateway, walka, mana, śmierć, leash, respawn, awans, inventory, łup i dane map.
- `npm run validate:content` / `npm run build` — PASS: 2 źródła Tiled i eksporty, PNG, mapy i build klienta. Bundle JS ok. 1,31 MB / 352 KB gzip; Vite ostrzega o chunku >500 KB z Phaser. Całe dist ok. 1,4 MB, poniżej docelowego budżetu pobrania 15 MB; nie jest to pomiar czasu ładowania na telefonie.
- `npm run test:e2e` — scenariusze w Chromium 151: menu/asset loading/pojedynki/łup/plecak/restart, klawiatura/blur/obrót, 5 podróży w obie strony, wielodotyk ruch + czar, zrzuty stylu i hitboxy 48+ px. **PASS: 9 zaliczonych, 1 SKIPPED** (duplikat wielodotyku na desktopie; właściwy mobilny scenariusz zaliczony). Końcowy pełny przebieg obejmował 10 przypadków, trwał ok. 3 min.
- Środowisko miało gotowy `/usr/bin/chromium`; pobranie przeglądarki Playwright było blokowane domeną CDN (403). Skorzystano z istniejącej przeglądarki, bez wyłączania TLS/weryfikacji. Na własnym komputerze można zainstalować przeglądarkę Playwright zgodnie z docs/TESTER.md.
- Build produkcyjny serwowany przez Vite preview — PASS: menu, wszystkie assety bez błędów HTTP/konsoli, brama, wybór celu, Iskra/mana oraz imię `<b>Hero</b>` wyświetlone jako tekst, bez interpretacji HTML.
- Środowisko chmurowe: zapisano `install_script` i `start_skill` (instalacja/kontrole oraz uruchamianie Vite/Chromium). Zapis draftu potwierdzony; publikacji nowej wersji środowiska nie wykonano.
- Fizyczny Android, ręczny wielodotyk na telefonie, 15 minut gry/FPS, audio — NIE WYKONANO. GitHub Actions przygotowane; uruchomienia CI na GitHub nie potwierdzono.

### Zmienione obszary

`apps/client`, `packages/domain`, `packages/content`, `packages/protocol`, `assets/source`, `scripts`, `tests/e2e`, konfiguracja monorepo i CI, `ASSET_LICENSES.md`, `docs/TESTER.md`, screenshoty, README i ten dziennik. Zmiany przygotowane lokalnie do zapisania; brak automatycznego wdrożenia.

## Stan sesji — 10 października 2026

- Wersja do testów: **0.0.2**. Zgłoszenie testera: „Nie mam żadnych potworów”, screenshot bezpiecznego dziedzińca z komunikatem o zablokowanym ruchu.
- Przyczyna: domyślny start na bezpiecznej mapie i nieczytelna instrukcja dojścia do zagajnika. Normalna próba zaczyna się teraz w zagajniku: szczur i żuk są w pobliżu, wilk dalej na południowym wschodzie. Tryb spaceru nadal zaczyna się na dziedzińcu i stale pokazuje informację „Spacer bez potworów”.
- Naprawione: stała wskazówka do bramy (kierunek i odległość), informacja o potworach za bramą na dziedzińcu, licznik żywych potworów w zagajniku, wyróżnienie dostępnego przejścia oraz kliknięcie bramy. Domena nadal wymaga podejścia do bramy. Klawiatura działa również z Caps Lock.
- Zmienione pliki: klient, testy e2e, wersje manifestów i lockfile, README, docs/TESTER.md, screenshoty oraz TASKS.md.
- Kontrole: `npm run typecheck` — PASS; `npm run lint` — PASS; `npm test` — **29 PASS**; `npm run build` (wraz z validate:content) — PASS, 2 mapy. `npm run test:e2e` — **11 PASS, 1 SKIPPED**, desktop i mobilny Chromium; pominięty duplikat wielodotyku na desktopie, scenariusz mobilny zaliczony. Pełny przebieg ok. 3,2 min.
- Nowy scenariusz regresji: start przy potworach → dziedziniec → blokada ruchu bez utraty wskazówki → brak teleportu z daleka → kliknięcie pobliskiej bramy → wybór szczura i rzucenie Iskry. Testuje też wielkie litery klawiatury. Dotychczasowa pełna próba walki, łupu i restartu nadal przechodzi na obu viewportach.
- Test fizycznego telefonu i audio — NIE WYKONANO. Grafika nadal robocza; T02 pozostaje REVIEW, dalsze pełne mapy czekają na akceptację stylistyki według AGENTS.md. Pozostałe statusy zadań bez zmian.
- Następny test właściciela: uruchomić 0.0.2 bez zaznaczonego spaceru, pokonać szczura/żuka/wilka, zebrać łup i sprawdzić powrót przez bramę. Instrukcja w docs/TESTER.md.

## Szablon raportu zadania
ID / status / zmienione pliki / wykonane komendy i wyniki / test manualny / ograniczenia / następny krok.

## Jak zgłaszać błędy
Wersja, urządzenie/przeglądarka, kroki, oczekiwany efekt, rzeczywisty efekt, screenshot jeśli pomocny. Tester może napisać to zwykłym językiem; Codex zamienia zgłoszenie w zadanie i scenariusz sprawdzenia.
