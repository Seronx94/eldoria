# Eldoria — specyfikacja projektu

Status implementacji: **0.1.6 — jeden ciągły świat: miasto i las**. Vareon, Mroczny Las, NPC, zadanie, handel i zapis lokalny są zaimplementowane. Grafika pozostaje robocza; nie jest to jeszcze wersja online ani APK. Specyfikacja poniżej pozostaje docelowym wymaganiem (wersja 1.0, 9 października 2026).

## Zagraj w bieżącą wersję

W katalogu repozytorium, z Node.js 24.19.0:

```sh
npm ci
npm run dev
```

Telefon w tej samej sieci: `npm run dev:lan`. [Instrukcja testera](docs/TESTER.md) opisuje pięć kroków przygody, sterowanie i zapis. Domyślnie zaczynasz w Vareon obok Miry: rozmowa i quest → brama na północy → pięć zabójstw w lesie → łup → powrót po nagrodę → handel i wznowienie. **Próba Wędrowca** w menu pozostaje treningiem walki zaczynającym się od razu przy potworach. **Spacer bez potworów** pokazuje stare sceny wzorcowe. Trening i spacer nie są zapisywane.

Wersja **0.1.6** łączy Vareon i Mroczny Las w jedną mapę **64×112 kratek**. Z wartowni idź na północ i dalej drogą przez bramę; nie używasz F ani przycisku przejścia. Kamera podąża za postacią, potwory i łup pozostają w tym samym świecie. Powrót do miasta odbywa się tą samą drogą na południe. Vareon jest strefą bezpieczną: nie można z niego atakować lasu, potwory nie przekraczają granicy i przerywają pościg. F / **Rozmowa** służy NPC i odkryciom. Trening i stare sceny wzorcowe nadal są oddzielnymi demonstracjami w menu.

Stare poprawne zapisy Vareon/lasu są automatycznie sprawdzane i przenoszone do wspólnych współrzędnych. Zasoby, questy, wyposażenie, łup, stan potworów i pozostałe cooldowny są zachowane; las zachowuje współrzędne, miasto przesuwa się o 8 kratek na wschód i 64 na południe. Nowe zapisy używają mapId `eldoria` i wymagają klienta 0.1.6 lub nowszego. Nie usuwaj zapisu przy aktualizacji; eksport w menu pozwala zachować własną kopię. Źródłem świata jest edytowalny `assets/source/eldoria.tmj`; `node scripts/generate-world.mjs` odtwarza go z zachowanych map lokalnych, a `npm run maps:generate-town` odtwarza miasto i wspólny świat.

W wersji 0.1.2 potwory animują chód podczas pościgu i powrotu. Dalsze stworzenia w lesie spacerują w promieniu dwóch kratek od miejsca odrodzenia co 1,6 s; blisko gracza i wejścia zachowano spokojne cele do nauki walki. Miecz ma zamach i ślad cięcia, Iskra lecący pocisk i rozbłysk, trafienia krótki błysk oraz liczbę obrażeń. Efekty wynikają z potwierdzonych zdarzeń symulacji, respektują zasięg i cooldown oraz nie są odtwarzane ponownie po wznowieniu.

Wersja 0.1.3 dodaje niezależne zadanie Miry **Ślady dawnego szlaku**: przyjmij je, zbadaj (F) stary drogowskaz, opuszczony obóz i kamień pamięci, potem wróć po 75 EXP, 25 złota i 2 mikstury. Wskazówka nad mapą pokazuje kierunek i odległość, gdy nie masz wybranego celu walki. **Plecak → Kronika** przechowuje opisy odkryć. Odkrycia liczą się po przyjęciu zadania, nagroda jest jednorazowa i czeka przy pełnym plecaku. Dotychczasowe zapisy v1 są wczytywane z nowym zadaniem do przyjęcia; zapisy utworzone przez 0.1.3 wymagają klienta 0.1.3 lub nowszego.

Wersja 0.1.5 dodaje na telefonie gałkę po lewej stronie oraz autorskie ikony akcji po prawej: cel, miecz, Iskra, mikstura, łup i rozmowa/przejście. Przeciągnij gałkę w kierunku ruchu; postać nadal chodzi po jednej kratce, bez przyspieszenia po przekątnej. Puszczenie palca centruje gałkę i zatrzymuje ruch. Drugi palec może używać akcji. Obrót ekranu, utrata fokusu i otwarcie dialogu zerują sterowanie. Na komputerze pozostają strzałki i WASD. Nie dodano nowych czarów ani zmian zapisu — Iskra jest obecnie jedynym czarem.

Wersja 0.1.4 przebudowuje Vareon w autorskie miasto klasycznego RPG: brukowany rynek z fontanną i straganami, mury, wartownia, świątynia, sklep, gospoda, warsztat i dwa domy. Mira stoi w wartowni przy północnej bramie; Oren w Świątyni Świtu na zachód od rynku; Borin w sklepie na wschód. Wejdź południowymi drzwiami, aby odsłonić dach i zobaczyć wnętrze. Wartownia ma również północne przejście do bramy. **Plecak → Plan Vareon** pokazuje budynki, pozycję i wybór wskazówki do NPC; gracz idzie sam. Gospoda, warsztat i domy są dostępne do zwiedzania, bez nowych usług NPC. Miasto wykorzystuje oryginalne materiały Eldorii; nie jest kopią Thais.

Zapis v1 ma teraz `cityRevision: 2`. Poprawna pozycja ze starego Vareon, którą zajęła nowa ściana lub NPC, przenosi gracza do wartowni z zachowaniem zasobów i zadań. Poprawne pozycje nadal dostępne pozostają na miejscu. Migracja nie dopuszcza pozycji ze starych ścian ani wadliwych zapisów; las pozostaje bez zmiany układu. Zapisy z 0.1.4 wymagają klienta 0.1.4 lub nowszego.

Przygoda zapisuje się w tej przeglądarce przy zmianie regionu, odkryciu miejsca, przyjęciu zadania, nagrodzie, handlu, powrocie do menu, ukryciu strony i co 30 sekund po zmianie stanu. Dostępne są przycisk Zapisz, wznowienie, eksport/import JSON oraz odzyskanie poprzedniego poprawnego zapisu. Uszkodzenie nie usuwa danych automatycznie; brak miejsca jest pokazany w dzienniku. Rozpoczęcie nowej przygody zastępuje bieżący zapis, zachowując poprzedni w kopii. Zapis jest wyłącznie offline i nie przeniesie się do przyszłej ekonomii online.

W menu wybierz **Kolorowy pixel art — do oceny** (domyślny) lub **Poprzednia grafika — porównanie**. Nowy zestaw ma zielony teren, dachówki, drzewa liściaste i iglaste, odrębne stroje NPC oraz postać z animacją czterech kierunków. Do porównania wybierz trening i **Spacer bez potworów**. Zmiana grafiki działa również przy wznowieniu zapisu.

Sprite’y i mapy są autorskimi materiałami roboczymi; źródła i opis w [ASSET_LICENSES.md](ASSET_LICENSES.md). Tester wybrał kolorowy pixel art z wyraźnymi konturami. Tester ocenił wygląd 0.1.1 pozytywnie i polecił dodanie animacji. Bieżący zestaw służy dalszej budowie; nowe animacje 0.1.2 czekają na ocenę podczas gry. Weryfikacja i kolejka: [TASKS.md](TASKS.md).

## Cel i sposób pracy
Eldoria to autorska gra RPG 2D z docelowym wspólnym światem online, inspirowana sposobem eksploracji Kakele/Tibii. Nie kopiujemy ich map, nazw zaklęć, grafik ani dźwięków. Codex implementuje i weryfikuje kolejne wersje; właściciel projektu testuje na telefonie i ocenia wygląd oraz rozgrywkę. Nie wymaga się od testera pisania kodu.

Pierwsza wersja 0.1 to zamknięty, grywalny fragment offline: Vareon, Mroczny Las, walka i pierwszy quest. To prototyp RPG, nie ukończone MMORPG. Współdzielona symulacja powstaje od początku; serwer dołączamy po sprawdzeniu podstaw. Nie przenosimy lokalnych zapisów ani złota do gospodarki online.

## Ustalone decyzje
| Obszar | Decyzja |
|---|---|
| Klient | Phaser 3, TypeScript strict, Vite |
| Platforma | Android; przeglądarka jako środowisko testowe |
| Ekran | Poziomy; w pionie czytelna prośba o obrót, bez utraty stanu |
| Grafika | Ostry, spójny pixel art, top-down |
| Mapa | Tiled, ortogonalna siatka 32×32, JSON |
| Ruch | Cztery kierunki, logicznie po kafelkach, animowany między nimi |
| Sterowanie | Joystick/D-pad, wybór celu dotykiem, atak, czar, interakcja |
| Online | Node.js + TypeScript, Colyseus, serwer autorytatywny |
| Dane online | PostgreSQL; Redis dopiero gdy potrzebne współdzielenie obecności/cache |
| Opakowanie Android | Capacitor po ukończeniu stabilnej wersji przeglądarkowej |
| Testy | Vitest dla symulacji; Playwright dla przepływów klienta |

Wersje zależności należy sprawdzić przed instalacją, przypiąć i zapisać w lockfile. Trzymamy Phaser 3; aktualizacja major wymaga uzasadnienia. Nie obiecujemy konkretnej liczby graczy bez pomiarów. To nowy projekt; wcześniejszy prototyp Django nie jest wymaganą zależnością ani źródłem danych.

## Pierwsza przygoda
Vareon, „Miasto, które pamięta”, ma rynek, fontannę, kuźnię, punkt leczenia i bramę do lasu. Strażniczka Mira zleca pokonanie pięciu leśnych szkodników. Gracz wychodzi za bramę, wybiera cel, walczy, zbiera łup i wraca po nagrodę. Pętla zajmuje orientacyjnie 10–15 minut.

### Zawartość 0.1
- Jedna postać: Wędrowiec. Wybór imienia 3–16 znaków; trim, brak pustego imienia, tekst zawsze renderowany bez interpretowania HTML.
- Vareon: 48×48 kafelków. Las: 64×64. Przejścia przez oznaczone portale, bez przypadkowego teleportowania przy zbliżeniu.
- NPC: Mira (quest), Oren (leczenie), Borin (sklep). Dialog otwierany tylko obok NPC; w dialogu sterowanie ruchem wstrzymane.
- Potwory: szczur, żuk, wilk. Szczury/żuki neutralne, wilki agresywne; maksymalnie 12 aktywnych stworzeń w lesie.
- Ekwipunek: 20 pól, stosy maksymalnie 99 dla materiałów i mikstur. Sloty: broń, pancerz. Brak ciężaru i trwałości w 0.1.
- Przedmioty: miecz treningowy, tunika, mikstura HP, skóra wilka, chityna, złoto. Łup odbierany przyciskiem w sąsiedztwie.
- Quest „Niepokój za bramą”: zabij dowolne 5 stworzeń w lesie po przyjęciu zadania; nagroda 50 EXP, 20 złota, 2 mikstury. Tylko jedna wypłata. Pełny plecak nie niszczy nagrody: pozostaje do odebrania.
- Zapis lokalny wersjonowany, z kopią poprzedniego poprawnego zapisu. Zapis przy zmianie mapy, nagrodzie, zakupie i co 30 sekund, jeśli stan się zmienił. Import sprawdza schemat; uszkodzenie pokazuje opcję odzyskania, nie kasuje danych automatycznie.

### Parametry startowe do testów balansu
| Parametr | Wartość |
|---|---|
| Poziom / HP / mana | 1 / 100 / 50 |
| Złoto / mikstury | 0 / 3 |
| Krok | 200 ms; jeden krok naraz; brak diagonalnego przyspieszenia |
| Atak mieczem | 12 obrażeń bazowych, odstęp 800 ms, cel sąsiedni |
| Iskra | 18 obrażeń, 8 many, odstęp 1500 ms, zasięg 4 kratki, linia widzenia |
| Mikstura | +40 HP, maksymalnie do maxHP, odstęp 3 s |
| Regeneracja many | +1 co 2 s; HP tylko leczenie/mikstura |
| EXP na następny poziom | 100 × bieżący poziom; nadmiar przechodzi dalej |
| Awans | +10 maxHP, +5 maxMana; pełne HP/mana |
| Śmierć | Powrót do Vareon, pełne HP/mana; bez utraty EXP/łupu w 0.1 |

Obrażenia = max(1, obrażenia bazowe − obrona). Bez krytyków w 0.1. Gracz ma obronę 2, tunika dodaje 1. Szczur: HP 30, atak 4, obrona 0, EXP 10; żuk: 45/6/1/15; wilk: 70/10/2/25. Potwory atakują co 1200 ms z sąsiedztwa. Wilk widzi do 6 kratek, wraca po przekroczeniu 10 od spawnu, odradza się po 20 s; powrót przywraca HP i nie daje EXP. Bez walki w mieście. Jeden przyznany EXP/łup na śmierć stworzenia.

Miecz startowy daje wskazane 12 obrażeń; bez mnożenia ich drugi raz przez statystykę. Sklep sprzedaje mikstury po 5 złota; skóry/chityna skupowane po 2. Szczur zostawia 1 złota, żuk 2 złota + chitynę, wilk 3 złota + skórę. Dane w katalogach, nie w scenach.

## Grafika i dźwięk — bramka jakości
Przed budowaniem pełnej mapy powstaje scena wzorcowa: teren, ścieżka, dom, drzewo, postać i interfejs na telefonie. Jeden zgodny stylistycznie zestaw assetów, źródła/licencje w ASSET_LICENSES.md. Preferuj legalne darmowe zasoby dopuszczające komercyjne użycie; nie kupuj bez upoważnienia. Jeśli nie ma wystarczających assetów, przygotuj jawnie opisany placeholder i zgłoś konkretny brak. Placeholder nie oznacza zatwierdzenia finalnej grafiki.

Kafelki natywnie 32×32; postać w klatce 32×48, kotwica przy stopach, footprint jednej kratki. Jeśli wybrany zestaw jest 16×16, jednorazowy nearest-neighbor ×2 jest dopuszczalny po pokazaniu próbki; nie mieszać różnych gęstości pikseli. Postać: 4 kierunki × 3 klatki chodu i idle. Budynki/drzewa mogą zajmować wiele kratek. Kolizje dotyczą podstawy, korony/dachy przykrywają postacie; sortowanie po współrzędnej stóp Y.

Włączyć pixelArt, wyłączyć antialiasing, nearest filtering, roundPixels, CSS image-rendering: pixelated. Samo CSS nie naprawi filtrowania tekstur. Świat ma całkowity zoom; render rozmiaru dopasowanego do viewportu, zamiast rozciągania całego canvasu skalą ułamkową. UI skaluje się niezależnie i pozostaje czytelne przy różnych DPR. Sprawdzić paski/safe-area, brak rozmycia przy ruchu kamery i brak zbyt małego pola widzenia. Przycisk dotykowy co najmniej 48 CSS px; UI nie zakrywa celu walki.

Muzyka osobno od efektów, regulacja głośności i mute zapamiętywane. Audio aktywowane po geście użytkownika. Brak ostrych syntetycznych pisków jako finalnego dźwięku, ograniczenie jednoczesnych efektów, brak przesterowania. Do czasu zdobycia dobrych plików cisza jest akceptowalna i jawnie oznaczona. Nie włączać automatycznie dźwięku po powrocie aplikacji z tła.

## Architektura
```text
apps/client/       Phaser: sceny, render, dotyk, audio, UI, adaptery
apps/server/       Serwer realtime i HTTP; implementacja od etapu online
packages/domain/   Symulacja niezależna od Phaser/DOM: ruch, walka, AI, questy
packages/protocol/ Komendy, snapshoty, walidacja, wersja protokołu
packages/content/ Katalogi przedmiotów/NPC/potworów i dane map
assets/source/    Źródła PNG/Tiled; nie tylko zbudowane atlasy
apps/client/public/assets/ Eksport dla klienta
scripts/          Walidatory map, assetów i skrypty uruchamiania
```

Sceny: Boot, Preload, Menu, World, UI. Sceny nie zawierają reguł gospodarki. Domenę zasilają komendy Move/Attack/Cast/Interact/UseItem/AcceptQuest/ClaimReward/Buy/Sell. GameGateway ma wspólny kontrakt: connect, send(command), subscribe(snapshot/events), disconnect. LocalGateway uruchamia domenę w procesie klienta; OnlineGateway wysyła intencje do serwera. Offline i online to rozłączne tryby; po zerwaniu połączenia nie przechodzimy automatycznie na lokalną symulację.

Symulacja tick 20 Hz, rendering niezależny. Ruch jest po siatce, klient animuje zatwierdzone kroki. Domena dostaje zegar i generator losowy jako zależności, nie korzysta bezpośrednio z Date.now/Math.random. Stałe ID bytów i zawartości; eventy mają identyfikator do deduplikacji. Kolizje ruchu współdzielone z serwerem. NPC i potwory korzystają z ograniczonego A*; po braku ścieżki nie teleportują się.

Tiled: warstwy Ground, Details, Collision, Above; warstwy obiektów Spawns, Portals, NPCs. Właściwości: mapId, targetMapId, targetSpawnId, npcId, monsterId. Eksport skończonych map orthogonal JSON z osadzonymi definicjami tilesetów i względnymi ścieżkami PNG. Walidator odrzuca brakujące ID, portal do nieistniejącego spawnu, spawn w ścianie oraz nieobsługiwane transformacje kafelków. Źródła .tmj/.tsx pozostają edytowalne.

## Docelowy multiplayer
Serwer ustala pozycje, HP, manę, trafienia, łup, EXP, złoto i przedmioty. Klient nigdy nie zgłasza „dostałem 100 złota”. Komendy mają sequence i typ; serwer kontroluje schemat, częstotliwość, zasięg, kolizje, stan postaci i duplikaty. Snapshoty początkowo 10 Hz, tylko zainteresowany obszar mapy. Interpolacja innych graczy; lokalna predykcja dopiero po zmierzeniu opóźnienia i wdrożeniu korekty.

Colyseus room oznacza region mapy, nie prywatny świat każdego gracza. Migracja między regionami wymaga jednego właściciela postaci, tokenu transferu i odporności na ponowienie; przed przekazaniem postać blokowana dla nowych akcji. Trwałe konto ma najwyżej jedną aktywną sesję danej postaci. Pojedynczy proces serwera na start; sharding i wiele workerów dopiero po testach.

PostgreSQL: accounts, characters, inventory, quest_progress, region_position, economy_ledger. Unikalne identyfikatory wypłat/transakcji, ograniczenia ilości i złota, atomowe zakupy/handel i nagrody. Zapisy nie wymagają zapisu pozycji 20 razy/s; checkpointy i zapis przy bezpiecznym transferze/wylogowaniu. Restart przywraca ostatni zatwierdzony checkpoint. Zmiany ekonomiczne muszą być utrwalone przed potwierdzeniem klientowi. Migracje i regularnie sprawdzane odtwarzanie backupów.

Konta: sprawdzona biblioteka haszowania haseł, krótkotrwałe tokeny sesji, WSS/HTTPS, ograniczenie prób logowania. Sekrety wyłącznie na serwerze. Rozłączenie zatrzymuje sterowanie; postać w walce może pozostać 10 s, potem bezpieczne wyjście. Reconnect reautoryzuje i pobiera pełny snapshot; nie nalicza nagród ponownie. Rejestr zdarzeń administracyjnych, role moderatora, metryki tick/lag/CPU/RAM. PvP, handel między graczami, gildie i płatności dopiero w późniejszym etapie.

## Android i wydajność
Najpierw pomiary w mobilnej przeglądarce, potem Capacitor i test fizycznego APK. Joystick oraz przyciski działają jednocześnie; pointercancel/utrata fokusu zeruje sterowanie. Menu i klawiatura ekranowa nie powodują ruchu postaci. Cel 60 FPS, minimum stabilne 30 na uzgodnionym urządzeniu; zapisać model, DPR, rozdzielczość, czas próby, liczbę bytów i percentyle czasu klatki. Budżet pierwszego pobrania do 15 MB jako cel do zmierzenia. Ograniczone pule efektów, atlas, ładowanie map na żądanie; brak nieograniczonego przyrostu listenerów po zmianach scen.

## Polecenia, które implementacja musi dostarczyć
```sh
npm ci
npm run dev
npm run dev:lan
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run validate:content
npm run build
```
Wszystkie powyższe polecenia są dostępne w wersji 0.1.5. Testy e2e wymagają Chromium (instrukcja w docs/TESTER.md). dev:lan ma drukować adres do testów w tej samej sieci; nie wystawiać serwera automatycznie do Internetu. Etap online dodaje compose dla PostgreSQL i komendę dev:online. Etap Android dodaje komendy sync/build oraz opis SDK/JDK zgodny z wybraną wersją Capacitor. Bez podpisywania kluczem produkcyjnym ani publikowania w sklepie bez polecenia właściciela.

## Zakres późniejszych wersji
Cztery autorskie profesje (wojownik, łucznik, mag ognia, opiekun natury), lochy, questy fabularne i bossowie. Po stabilizacji: handel, PvP na oznaczonych terenach, gildie, moderacja. Monetyzacja dopiero po weryfikacji gry i wymogów platformy; preferowane kosmetyki, brak sprzedaży przewagi w pierwszej wersji.

## Dokumenty i źródła techniczne
AGENTS.md określa pracę, ROADMAP.md bramki wydania, TASKS.md kolejkę. Parametry w tym README są punktem wyjścia, nie sprawdzonym balansem.
- Phaser: https://docs.phaser.io/phaser/concepts/cameras oraz https://docs.phaser.io/api-documentation/typedef/types-core
- Colyseus: https://docs.colyseus.io/ oraz https://docs.colyseus.io/server
- Capacitor: https://capacitorjs.com/docs oraz https://capacitorjs.com/docs/getting-started/environment-setup
Dokumentacja sprawdzona podczas przygotowania specyfikacji; API wybranych wersji trzeba ponownie sprawdzić podczas implementacji.
