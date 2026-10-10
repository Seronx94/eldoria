# Eldoria — kolejka implementacji

Statusy: TODO, IN_PROGRESS, BLOCKED, REVIEW (ocena testera), DONE (implementacja sprawdzona). Bieżące statusy i dowody wykonania poniżej. Specyfikacja kryteriów nie zastępuje wyników kontroli. Bieżąca wersja 0.1.3 jest przygodą offline z odkrywaniem dawnego szlaku; nie jest wydaniem online ani APK.

## Zasady kolejki
Bierz pierwszy gotowy wpis. Zależności muszą być DONE; wyjątek: po T02 REVIEW można budować domenę, lecz nie rozbudowywać finalnej mapy przed akceptacją stylu. Każdy wpis po pracy uzupełnij o dowód: polecenia/wyniki, pliki, screenshot lub scenariusz manualny. Opisane niżej testy są wymaganiem, nie raportem ich wykonania.

| ID | Etap | Status | Zadanie | Zależności |
|---|---|---|---|---|
| T01 | M0 | DONE | Szkielet repozytorium | — |
| T02 | M0 | DONE | Zestaw assetów i scena wzorcowa | T01 |
| T03 | M0 | DONE | Gateway, ruch i mobilny HUD | T01 |
| T04 | M1 | DONE | Pipeline Tiled i walidacja | T01 |
| T05 | M1 | DONE | Vareon, las i portale | T02 zaakceptowane, T03, T04 |
| T06 | M1 | DONE | NPC i dialogi | T05 |
| T07 | M2 | DONE | Potwory, AI i walka | T03, T04 |
| T08 | M2 | DONE | Ekwipunek, loot i mikstury | T07 |
| T09 | M2 | DONE | Sklep i quest | T06, T08 |
| T10 | M2 | DONE | Zapis i odtworzenie | T09 |
| T11 | M2 | REVIEW | Wydanie 0.1 i poprawki mobilne | T05–T10 |
| T09a | M2 | DONE | Ślady dawnego szlaku — quest eksploracji i kronika (wybór testera) | T05, T06, T09, T10 |
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

### T02 — DONE (kolorowy zestaw zaakceptowany do dalszej budowy)

**Wynik sesji:** Autorskie placeholdery: kafelki 32×32, postać 4 kierunki × 3 klatki 32×48, dom, drzewa i trzy stworzenia. Źródła PNG/Tiled + odtwarzalny generator, ASSET_LICENSES.md. Zrzuty desktop/mobilny: docs/screenshots/. Oceniono ostrość i kamerę; brak audio. Po raporcie 0.0.2 z oznaczeniem grafiki roboczej tester polecił „dobra idź dalej”. Odnotowano zgodę na kontynuację z obecnym zestawem; nie oznacza ona zatwierdzenia finalnej grafiki ani pomiaru na fizycznym telefonie.

**Aktualizacja 0.1.1:** Tester wybrał kolorowy pixel art, zielony świat, wyraźne kontury i szczegółowe postacie. Nowa próbka jest przełączalna w menu, obejmuje istniejące sceny i czeka na ocenę stylistyki. Wcześniejsza zgoda na budowę przygody pozostaje odnotowana; ukończone T05–T10 zachowują dowody. Nie rozszerzamy teraz map ani reguł gry.

**Ocena testera po 0.1.1:** „Wygląda to dobrze” i prośba o ruch potworów oraz animacje miecza/czarów. Odnotowano akceptację kierunku kolorowego do dalszej budowy, bez deklaracji finalnej oprawy ani testu fizycznego telefonu.

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

### T05 — DONE

**Wynik sesji:** Po poleceniu dalszej budowy dodano Vareon 48×48 i Mroczny Las 64×64 w obecnym roboczym stylu: rynek/fontanna, budynki, punkty NPC, drzewa, spawny i jawne portale. Źródła Tiled i eksporty zgodne. Sortowanie po stopach, kolizje podstaw, nearest filtering i całkowity zoom zachowane. Zajęte wejście przez żywego potwora otrzymuje najbliższą wolną kratkę, bez nakładania gracza i potwora. Testy domeny obejmują osiągalność sąsiedztwa NPC/bram oraz pięć podróży. E2e pięciu podróży i pełnej przygody zaliczone na desktopie i mobilnym Chromium.

**Kryteria docelowe:**
Vareon 48×48 i las 64×64, sortowanie stóp, korony/dachy, przejścia. 5 podróży w obie strony bez zdublowanych inputów/listenerów; spawn wolny, gracz nie zapętla teleportu. Safe-area i viewport w poziomie.

### T06 — DONE

**Wynik sesji:** Mira, Oren i Borin w Vareon, dane dialogów w packages/content. Interakcja tylko obok NPC; NPC zajmuje kratkę. Modalny dialog blokuje ruch, wybór celu, atak, czar i plecak; Escape lub przycisk kończy rozmowę. Oren przywraca pełne HP/manę bez opłaty. Testy domeny dystansu, blokady i leczenia przechodzą; e2e pełnej przygody zaliczone na desktopie i mobilnym Chromium.

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

### T09 — DONE

**Wynik sesji:** Quest Miry „Niepokój za bramą”: pięć zabójstw w lesie po przyjęciu, 50 EXP/20 złota/2 mikstury, wypłata raz. Pełny plecak pozostawia nagrodę ready bez częściowej wypłaty. Borin sprzedaje mikstury po 5 złota, kupuje skóry/chitynę po 2. Ilości i komendy walidowane; gospodarka w domenie, atomowe zmiany. Próba trzech typów pozostaje oddzielnym treningiem. Testy granic, powtórnych wypłat/sprzedaży, braku złota i pełnego plecaka przechodzą; e2e pełnej przygody zaliczone na desktopie i mobilnym Chromium.

**Kryteria docelowe:**
Quest i sklep według README. Quest liczy zabójstwa tylko po przyjęciu, nagroda najwyżej raz; pełny plecak zostawia odbiór pending bez wypłacania części wielokrotnie. Zakup atomowy, brak ujemnego złota. Test powtórnej wypłaty, braku złota i pełnego plecaka.

### T09a — DONE

**Zakres wybrany przez testera:** „Więcej zadań i eksploracji”. Zadanie Miry „Ślady dawnego szlaku” obok dotychczasowego questa: trzy oznaczone miejsca w istniejącym lesie, opisy w kronice, kierunek i odległość do celu, zapis odkryć, jednorazowa nagroda 75 EXP / 25 złota / 2 mikstury. Zadanie nie wymaga ukończenia pięciu zabójstw; T11 nadal REVIEW na telefonie, T12 nie rozpoczęto.

**Kryteria:** akceptacja u NPC w zasięgu, odkrycia dopiero po przyjęciu i w zasięgu jednej kratki, osiągalne miejsca, brak duplikatów postępu i nagród, pełny plecak zachowuje nagrodę, wznowienie i starsze zapisy, czytelne opisy na mobilnym ekranie. Dowody w raporcie 0.1.3 poniżej.

### T10 — DONE

**Wynik sesji:** Wersjonowany schemat offline v1, kontrola map/pozycji/statystyk/NPC/potworów, LocalGateway export/restore. Zapis zasobów, ekwipunku, questu, łupu i stanów stworzeń; pozostały czas cooldownów/respawnu przenoszony względem nowego zegara, bez darmowego odnowienia. Adapter localStorage: poprzedni poprawny checkpoint, brak automatycznego nadpisania uszkodzonego zapisu, jawne odzyskanie/import (oryginał uszkodzony zachowany osobno), eksport JSON i błędy quota. Autosave przy mapie/nagrodzie/handlu/menu/ukryciu oraz co 30 s po zmianie stanu; ręczny zapis. Trening/spacer nie nadpisują przygody. Testy uszkodzenia, wersji, śmierci, powtórnego odczytu, cooldownu i quota przechodzą; e2e pełnej przygody zaliczone na desktopie i mobilnym Chromium.

**Kryteria docelowe:**
Wersjonowany zapis, walidacja, backup poprzedniego poprawnego zapisu i błąd quota. Odtworzenie poziomu, inventory, questa i pozycji; nie zapisuj aktywnego cooldownu jako możliwości natychmiastowego oszustwa w przyszłym online. Test uszkodzenia, nieobsługiwanej wersji, powrotu po śmierci i wielokrotnego odczytu.

### T11 — REVIEW

**Wynik sesji:** Przygotowano przygodę offline 0.1.0 oraz pięć kroków w docs/TESTER.md. Wszystkie dostępne kontrole oraz pełna przygoda, zapis i regresje treningu zaliczone na desktopie i mobilnym Chromium. Test telefonu, model urządzenia, czas przygody i wygoda sterowania wymagają raportu testera; nie deklarujemy ich jako wykonanych.

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

## Kontynuacja — 10 października 2026, wersja 0.1.0

- Polecenie testera: „dobra idź dalej” po wydaniu 0.0.2. Kontynuowano kolejkę offline z obecnym roboczym zestawem, bez nazywania go finalną grafiką.
- Implementacja: T05 (Vareon/las), T06 (NPC/dialogi), T09 (quest/handel), T10 (zapis). T11 przygotowuje przygodę do oceny na urządzeniu testera. Nie uruchamiano etapu online ani Androida.
- Kontrole: `npm run typecheck` — PASS; `npm run lint` — PASS; `npm test` — **46 PASS w 5 plikach**; `npm run validate:content` / `npm run build` — PASS, 4 mapy (2 przygody + 2 wzorcowe), zgodne edytowalne źródła/eksporty/PNG. JS ok. 1,326 MB / 358 KB gzip, dist ok. 1,7 MB; pozostaje ostrzeżenie Vite o dużym chunku Phaser.
- Nowe testy domeny: osiągalność bram/NPC, rozmiary map i limit 12 stworzeń, dialog/dystans, blokada ruchu/ataków, leczenie, pięć podróży i zajęty spawn wejściowy; zabójstwa przed/po przyjęciu questa, pojedyncza nagroda i pełny plecak; brak złota, błędne ilości, zakup/sprzedaż i duplikaty; round-trip zapisu, martwe/rany/łup, śmierć, pozostały cooldown/respawn, uszkodzenie/wersja/statystyki/kolizje, checkpoint/backup i quota.
- Test produkcyjnego dist przez Vite preview — PASS: menu, assety bez błędów konsoli/HTTP, imię `<b>Hero</b>` jako tekst, dialog i przyjęcie questa, brama, Iskra, zapis/odświeżenie/wznowienie oraz zachowane rany potwora.
- Końcowy `npm run test:e2e` — **19 PASS, 1 SKIPPED, 20 przypadków, ok. 8 min**. Desktop i mobilny Chromium: komplet przygody (5 realnych zabójstw → Mira → nagroda → Oren → Borin → reload), pięć podróży, uszkodzenie/backup/import oraz quota/eksport aktywnej gry; ponadto wszystkie dotychczasowe regresje treningu, klawiatury/blur/obrotu, emulowanego wielodotyku/pointercancel, stylu i bramy. Pominięty wyłącznie desktopowy duplikat wielodotyku; właściwy mobilny test zaliczony. Brak błędów konsoli/HTTP w scenariuszach pełnej przygody i produkcyjnego smoke testu.
- W trakcie weryfikacji poprawiono nazwę przycisku w teście, zachowanie stałej wskazówki powrotu po łupie i bezpieczeństwo wejścia zajętego przez potwora. Końcowe wyniki powyżej pochodzą z pełnego, zakończonego przebiegu.
- Źródła/pliki: assets/source/{vareon,forest}.tmj i eksporty, packages/content/adventure.ts i importer map, packages/protocol komendy, packages/domain symulacja/save.ts/testy, apps/client dialog/menu/storage.ts/testy, testy e2e i konfiguracja Vitest, dokumentacja i nowe screenshoty.
- Fizyczny telefon/Android, ręczny wielodotyk, FPS, 15-minutowa stabilność, czas przygody i audio — NIE WYKONANO. Brak multiplayer, kont i APK. T11 czeka na ocenę właściciela, zgodnie z kryteriami; nie zaliczamy tych brakujących testów automatem.
- Następne konkretne działanie: tester przechodzi pięć kroków docs/TESTER.md na swoim telefonie i zgłasza urządzenie, czas przygody oraz uwagi. Poprawki mają pierwszeństwo przed T12.

## Grafika do oceny — 10 października 2026, wersja 0.1.1

- Uwagi testera: wygląd zbliżony klimatem do Kakele Online; wybrany kierunek: „Kolorowy pixel art: zielony świat, wyraźne kontury i szczegółowe postacie”. To wybór kierunku, nie akceptacja gotowych assetów. T02 wraca do REVIEW dla nowego zestawu; T11 nadal REVIEW.
- Wykonano oryginalne atlasy świata i postaci przez image_gen, zapisano źródła i współrzędne wycięć. Mechaniczny importer do natywnych klatek używa nearest-neighbour i normalizacji alfa. Pochodzenie/warunki użycia w ASSET_LICENSES.md. Nie kopiowano assetów Kakele.
- Klient: 16 wariantów terenu 32×32, nieregularne brzegi ścieżek, dom, beczki, drzewa liściaste i iglaste, studnia w istniejącym miejscu rynku, nowe szczur/żuk/wilk, Wędrowiec 4 kierunki × 3 klatki 32×48 i odrębne stroje Miry/Orena/Borina. Menu przełącza kolorowy zestaw i poprzedni wygląd, zapamiętuje wybór i stosuje go przy wznowieniu.
- Mapy, kolizje, reguły domeny i schemat zapisu zachowane. Brak nowej zawartości świata przed oceną grafiki; dodatkowe kwiaty/kamienie/sakiewka/tablica pozostają rezerwą atlasu. Audio nadal wyłączone.
- Kontrole: `npm run assets:import-colorful` — PASS; natywne rozmiary PNG sprawdzone ImageMagick; `npm run typecheck` i `npm run lint` — PASS; `npm test` — 46 PASS / 5 plików; `npm run build` (z validate:content) — PASS, zgodność wszystkich źródeł PNG/eksportów i 4 map. JS 1,327 MB / 358 KB gzip, dist ok. 2 MB; pozostaje ostrzeżenie o chunku Phaser.
- Nowy scenariusz `npm run test:e2e -- tests/e2e/graphics.spec.ts` — 2 PASS (desktop i mobilny poziomy Chromium): nowa grafika, dialog, portal, realne zabójstwo i łup, spacer, ruch kamery, przyciski ≥48 CSS px, przełączenie poprzedniego stylu i zachowanie preferencji. Usunięto niestabilne założenie o jednym kroku podczas robienia screenshotu z przytrzymanym klawiszem: czas wykonania zrzutu jest zmienny, sprawdzamy rzeczywisty ruch w zadanym kierunku.
- Produkcyjny Vite preview — PASS: kolorowe assety bez błędów HTTP/konsoli, Mira/quest, przejście do lasu, zabójstwo, zapis, reload i wznowienie zachowanego postępu.
- Screenshoty w docs/screenshots/: colorful-sample-desktop, classic-sample-desktop (ta sama scena), colorful-town-desktop/mobile, colorful-forest-mobile oraz colorful-moving-mobile. Oceniono scenę wzorcową i czytelność aktorów w docelowej skali. README i docs/TESTER.md opisują porównanie oraz uruchomienie.
- Pełny `npm run test:e2e`: 22 przypadki, 20 PASS / 1 SKIPPED / 1 FAIL (8,5 min). Jedyny FAIL: stare oczekiwanie dokładnie 42 MP po czarze; screenshot i kliknięcie przekroczyły granicę regeneracji, więc HUD poprawnie pokazywał 43 MP. Poprawiono trzy podobne sprawdzenia: po pierwszym czarze mana 42–43, dokładny koszt 8 MP nadal pokryty testem domeny. Ponowne `npm run test:e2e -- tests/e2e/client.spec.ts --grep 'menu, assets|simultaneous touch|safe courtyard'` — **5 PASS / 1 SKIPPED, exit 0** (1,5 min), także wcześniej nieudany desktopowy trening i mobilny wielodotyk. Wszystkie 21 wykonywanych scenariuszy mają wynik PASS po poprawce; pełnego przebiegu bez wcześniejszego FAIL nie powtarzano, pozostałe scenariusze przeszły w pełnej regresji. Pominięty wyłącznie desktopowy duplikat wielodotyku.
- Fizyczny telefon, FPS i ręczny wielodotyk — NIE WYKONANO. Następny krok: tester porównuje scenę i ocenia postać, kontury, teren, budynki, drzewa oraz widoczność potworów; potem dopracowanie wskazanych elementów.

## Animacje — 10 października 2026, wersja 0.1.2

- Polecenie testera: pozytywna ocena wyglądu i prośba o chodzące potwory, animacje miecza oraz czarów. T02 DONE dla bieżącego roboczego stylu; T11 nadal REVIEW na fizycznym urządzeniu.
- Atlas image_gen z własnymi referencjami i edytowalnym manifestem; trzy nowe spritesheety stworzeń (6 klatek 32×32). Ruch pościgu/powrotu interpolowany liniowo przez 400 ms, animacja nóg z przodu/boku i odbicie poziome na lewo. Wygląd klasyczny nadal działa z płynnym przesuwaniem i efektami, klatki nóg dotyczą zestawu kolorowego.
- Neutralne/dalsze stworzenia w lesie patrolują co 1600 ms w promieniu 2 kratek od spawnu. Spokojne cele blisko gracza nie spacerują; mapy treningowe nie zmieniają pozycji idle. Patrol sprawdza kolizje, zajęte kratki i sąsiedztwo bram, nie zmienia neutralności stworzeń. Patrol wznowiony po wczytaniu ustala nowy harmonogram; jego timer nie jest zapisywany.
- Symulacja emituje potwierdzone zdarzenia miecza, Iskry i ataku potwora z ID, mapą, stronami trafienia, pozycjami i obrażeniami. Bufor maksymalnie 16, kopiowane współrzędne, brak zdarzenia po odrzuconej akcji. Zapis v1 pozostaje zgodny i nie zawiera zdarzeń do ponownego odtworzenia.
- Klient: zwrot do celu/krótka poza, animowany miecz i ślad cięcia, pomarańczowy pocisk Iskry i rozbłysk, ślady ataku potwora, krótki tint i wynik obrażeń. Limit 32 przejściowych elementów efektów, usuwanie po zakończeniu, przy mapie/menu/restarcie, bez dodatkowych listenerów/timerów. Całkowity zoom i nearest zachowane.
- `npm run assets:import-colorful` — PASS; przywrócono identyczne wizualnie wcześniejsze PNG po porównaniu pikseli, aby nie commitować zmian samych metadanych dat. Źródła i prawa w ASSET_LICENSES.md. `npm run typecheck`, `npm run lint`, `npm test` — **51 PASS / 6 plików**, `npm run build` z validate:content — PASS, 4 mapy i wszystkie PNG. JS ok. 1,333 MB / 360 KB gzip; ostrzeżenie o rozmiarze chunka Phaser pozostaje.
- Nowe testy domeny: odrzucone komendy/cooldown bez fałszywego trafienia, zdarzenie także po zabójstwie, atak stworzenia i prawidłowe obrażenia, interleaving ID, niemutowalne współrzędne, limit bufora, zapis bez odtwarzania efektów, patrol zgodny z kolizjami i bez zajętych kratek/bram.
- Wstępny `npm run test:e2e -- tests/e2e/animation.spec.ts` — 2 PASS (desktop i mobilny poziomy): odrzucenie miecza z daleka, Iskra, podejście szczura, dobicie mieczem, wygaszenie efektów i restart bez powtórki. Bez błędów HTTP/konsoli; screenshoty oglądano. Pełny `npm run test:e2e`: **21 PASS / 1 SKIPPED / 2 FAIL**, 24 przypadki, 9,1 min. Oba FAIL dotyczyły wyłącznie startu opcjonalnego nagrywania w nowym teście: brak bundlowanego FFmpeg Playwrighta; jego instalacja w katalogu /tmp zakończyła się HTTP 403 (domeny CDN zabronione), bez obejścia ograniczenia. Oddzielono nagrywanie od regresji; scenariusz i wszystkie asercje animacji pozostały. Końcowe `npm run typecheck`, `npm run lint` — PASS; `npm run test:e2e -- tests/e2e/animation.spec.ts` — **2 PASS, exit 0**, 16,2 s. Wszystkie 23 wykonywane scenariusze mają wynik PASS po naprawie fixture; pełnego przebiegu nie powtarzano, pozostałe przeszły w pełnej regresji. SKIPPED to wyłącznie desktopowy duplikat wielodotyku.
- Media: docs/screenshots/animated-spark-desktop.png i animated-sword-mobile.png z końcowego testu; docs/videos/animated-combat-desktop.webm (3,566 s, 556 KB), 72 rzeczywiste klatki z Chromium przez CDP, zakodowane lokalnym systemowym FFmpeg, sprawdzone ffprobe i pełnym dekodowaniem. Nagranie pokazuje Iskrę, chód, otrzymane trafienie i miecz; bez zewnętrznego pobierania.
- Produkcyjny `Vite preview` — PASS: menu 0.1.2, nowe sprite’y i efekty bez błędów HTTP/konsoli, Iskra → pościg → miecz/zabójstwo → wygaszenie → nowa próba w klasycznym stylu bez odtwarzania trafień. Dist ok. 2 MB.
- Ograniczenia: animacja stworzeń przód/bok bez osobnej klatki tyłu; poza bohatera używa istniejących klatek wraz z animowanym mieczem, nie nowego pełnego zestawu uderzenia. Brak audio. Test fizycznego telefonu/FPS/15 minut — NIE WYKONANO. Następny krok: tester przechodzi trzy kroki animacji w docs/TESTER.md i zgłasza czytelność/płynność.

## Eksploracja — 10 października 2026, wersja 0.1.3

- Wybór testera: „Więcej zadań i eksploracji”. Dodano T09a w M2 z ukończonymi zależnościami T05/T06/T09/T10; T11 nadal REVIEW na fizycznym telefonie, T12 i online nie rozpoczęto.
- Mira oferuje niezależne „Ślady dawnego szlaku”. Trzy miejsca w istniejącym lesie: stary drogowskaz (32,52), opuszczony obóz (24,48), kamień pamięci (40,44). Autorskie opisy, proceduralne znaki w obu stylach, kierunek/odległość do następnego celu bez wybranego potwora, wyróżnienie interakcji w zasięgu, kronika odkryć w plecaku i podsumowanie u Miry. Cel eksploracji w głównym HUD, gdy quest walki nie jest aktywny. Nie dodano nowego regionu ani zmiany statystyk walki.
- Domena sprawdza przyjęcie i dystans ≤1, nie zlicza powtórnych badań. Nagroda 75 EXP, 25 złota i 2 mikstury tylko raz; pełny plecak pozostawia ją gotową. Zapis v1 rozszerzono o walidowany postęp; stare zapisy wczytują zadanie jako dostępne. Zapisy 0.1.3 wymagają klienta 0.1.3 lub nowszego. Przyjęcie i każde odkrycie wywołują autosave; odzyskanie/import zachowują postęp.
- `npm run typecheck`, `npm run lint`, `npm test` — PASS, **55 testów / 7 plików**. Nowe testy: osiągalność miejsc, zasięg/przyjęcie, powtórne badanie, trwałość, jednorazowa nagroda niezależna od pierwszego questa, pełny plecak → zwolnienie pola → wypłata, wadliwe/zdublowane odkrycia, zgodność starych zapisów. `npm run build` z validate:content — PASS: 4 mapy, PNG, spawny, portale i nowe miejsca odkryć; JS 1,339 MB / 362 KB gzip, dist ok. 2 MB. Pozostaje ostrzeżenie Vite o chunku Phaser >500 KB.
- Pierwszy scenariusz e2e zatrzymał się na próbie przejścia prosto przez drzewo i patrolującą postać (2 FAIL). Poprawiono trasę testu: BFS po kolizjach i omijanie zajętych pól przez rzeczywiste klawisze, bez teleportowania. Następny start testu: błąd importu JSON Node 24 (0 testów); dodano wymaganą deklarację typu JSON. Końcowy przebieg eksploracji: **2 PASS**, desktop i mobilny poziomy Chromium, 2,4 min. Cała realna wyprawa, powtórne badanie, reload po pierwszym odkryciu, kronika, nagroda i reload bez ponownej wypłaty. Dodano też sprawdzenie widoczności opisu po przewinięciu kroniki: mobilny przebieg PASS, desktop przekroczył 90 s przy końcowej kontroli przycisków, już po nagrodzie i reloadzie (1 PASS / 1 FAIL). Zmniejszono liczbę odczytów DOM w prowadzeniu postaci, zachowując kontrolę mapy po każdym kroku; limit całej wyprawy zwiększono do 120 s bez zmiany asercji funkcjonalnych. `npm run typecheck`, `npm run lint` — PASS; końcowy `npm run test:e2e -- tests/e2e/exploration.spec.ts --workers=1` — **2 PASS**, desktop/mobilny poziomy, 3,5 min. Zaliczone wszystkie kontrole, w tym rzeczywista widoczność ostatniego opisu po przewinięciu, nagroda/reload i przyciski plecaka ≥48 CSS px. Łącznie wszystkie 25 wykonywanych scenariuszy e2e mają PASS po poprawkach i ponowieniach (plus 1 jawny SKIPPED); nie jest to raport jednego pełnego zielonego przebiegu.
- Regresja dotychczasowych 24 przypadków (`npm run test:e2e -- tests/e2e/client.spec.ts tests/e2e/adventure.spec.ts tests/e2e/graphics.spec.ts tests/e2e/animation.spec.ts --workers=2`) — **21 PASS / 1 SKIPPED / 2 FAIL**, 7,3 min. FAIL na desktopie: test zakładał brak odrodzenia szczura przed wyborem wilka; drugi test 10 przejść treningowych przekroczył 90 s przy dwóch równoległych przeglądarkach. Poprawiono test wyboru wilka przez realny przycisk Cel (do trzech kliknięć, bez zmiany asercji trafień/nagrody), pozostawiono limit czasu. `npm run test:e2e -- tests/e2e/client.spec.ts --project=desktop --grep 'menu, assets|five return journeys' --workers=1` — **2 PASS**, 1,4 min; pięć podróży w obie strony 44,5 s. Wszystkie 23 wykonywane stare scenariusze mają wynik PASS po poprawce/ponowieniu; pełnego przebiegu bez wcześniejszych FAIL nie powtarzano. SKIPPED to wyłącznie desktopowy duplikat wielodotyku; mobilny wielodotyk zaliczony. Domyślna konfiguracja/CI nadal używa jednego workera.
- Produkcyjny Vite preview — PASS: realne przyjęcie i pierwsze odkrycie, zapis, import poprawnego przygotowanego stanu ready, czytelny opis kroniki po przewinięciu w mobilnym viewportcie, powrót po jedną nagrodę i reload bez ponownej wypłaty; brak błędów HTTP/konsoli. Importowany stan służył kontroli UI; nie traktujemy go jako drugiej kompletnej wyprawy.
- Screenshoty ocenione: docs/screenshots/old-trail-desktop.png, old-trail-mobile.png (realna wyprawa e2e), chronicle-mobile.png (produkcyjny smoke z importowanym stanem). Źródła/pochodzenie znaków i opisów w ASSET_LICENSES.md. Zaktualizowane README, ROADMAP, docs/TESTER i wersje manifestów/lockfile.
- Test fizycznego telefonu, FPS, ręczny wielodotyk i 15 minut stabilności — NIE WYKONANO. Audio wyłączone, brak nowego regionu, multiplayer i APK. Następny konkretny test: pięć kroków szlaku w docs/TESTER.md; zgłosić czytelność wskazówek/kroniki oraz czas wyprawy na własnym urządzeniu.

## Szablon raportu zadania
ID / status / zmienione pliki / wykonane komendy i wyniki / test manualny / ograniczenia / następny krok.

## Jak zgłaszać błędy
Wersja, urządzenie/przeglądarka, kroki, oczekiwany efekt, rzeczywisty efekt, screenshot jeśli pomocny. Tester może napisać to zwykłym językiem; Codex zamienia zgłoszenie w zadanie i scenariusz sprawdzenia.
