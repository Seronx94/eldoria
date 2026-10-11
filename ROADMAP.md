# Eldoria — plan rozwoju

Każdy etap kończy się grywalnym wynikiem i sprawdzeniem kryteriów. Brak dat i gwarancji pojemności serwera przed implementacją oraz pomiarami. Kolejność wynika z zależności; uwagi testera o sterowaniu i czytelności mają pierwszeństwo przed dodawaniem zawartości.

| Etap | Wynik | Kryterium przejścia |
|---|---|---|
| M0: fundament i wygląd | Projekt startuje; wzorcowa scena i sterowanie | Kontrole kodu przechodzą; scena czytelna na telefonie; tester akceptuje styl lub podaje konkretne poprawki |
| M1: eksploracja | Vareon, las, NPC, ciągły świat | Brak przejścia przez ściany; ruch 4 kierunki; dialogi; 5 spacerów przez bramę bez wycieku listenerów i awarii |
| M2: wersja 0.1 offline | Walka, łup, sklep, quest, zapis | Pełny ciąg: quest → 5 zabójstw → nagroda → zapis → wznowienie; śmierć nie blokuje gry; wypłata tylko raz |
| M3: zamknięta alfa online | Dwie osoby w jednym świecie; konta i trwały zapis | Serwer rozstrzyga grę; reconnect i restart; walidacja oszustw; brak duplikacji wypłat; test 2 urządzeń |
| M4: Android alfa | Instalowalny testowy APK | Uruchomienie na fizycznym telefonie, multitouch, safe-area, tło/powrót, reconnect, pomiary FPS |
| M5: mała beta | Profesje, loch, boss, moderacja | Balans sprawdzony przez testerów; backup odtworzony; load test w ustalonym profilu; aktualna instrukcja operacyjna |
| M6: przygotowanie publikacji | Podpisany build i plan utrzymania | Prywatność/konta/płatności zgodne z aktualnymi wymogami; brak krytycznych błędów; właściciel zleca publikację |

## M0
T01–T03. Wzorzec obejmuje środowisko, postać i UI z tego samego stylu. Jeśli tester nie zaakceptuje grafiki, poprawiamy ją przed rozbudową mapy. Domena i automatyczne testy mogą rozwijać się równolegle z oceną.

## M1
T04–T06 oraz T05a: przebudowa Vareon w 0.1.4 na polecenie testera — rynek, siedem wnętrz, NPC w budynkach usług i plan miasta. Nowa aranżacja czeka na ocenę. Aktualizacja 0.1.6 na polecenie testera łączy miasto i las w jeden świat 64×112: spacer przez bramę, bez przycisku i teleportu. Strefa miasta chroni przed walką i pościgiem; stare zapisy migrują po walidacji. Brak pustej demonstracji: spacer po mieście, dialog i wyjście do lasu mają działać z telefonu.

## M2
T07–T11; aktualizacja T11 w 0.1.5 dodaje gałkę mobilną i ikony akcji na polecenie testera. Z dodatkowym T09a wybranym przez testera: eksploracyjne „Ślady dawnego szlaku” i kronika odkryć w 0.1.3. Wersja 0.1 ma dawać około 10–15 minut sensownej gry. Aktualizacja 0.1.7: opcjonalny cel, przytrzymywany miecz, wykrywanie i pościg wszystkich gatunków, efekty rzucania Iskry oraz dopracowanie dachów. Tester ocenia: ostrość, wygodę sterowania, automatyczny cel, czytelność obrażeń i tempo walki. Nie blokujemy wydania brakiem muzyki, jeśli została jawnie wyłączona.

## M3
T12–T16. Najpierw jeden serwer i dwie osoby, potem poprawność ekonomii, rozłączeń i regionów. Offline pozostaje osobnym trybem z osobnym zapisem. Brak importu walut offline. Wyniki load testu zapisują sprzęt, liczbę symulowanych graczy, aktywnych potworów, czas i latency; syntetyczne połączenia bez akcji nie dowodzą pojemności MMORPG.

## M4
T17–T18. Capacitor pakuje klienta, nie uruchamia serwera MMORPG na telefonie. SDK/JDK i podpisywanie trzeba sprawdzić dla wybranej wersji. Jeśli środowisko Codexa nie ma Android SDK, klient i konfiguracja mogą być przygotowane, ale APK nie oznaczamy jako wykonany.

## M5–M6
T19–T21. Testy obciążeniowe: stopniowo 10/25/50 aktywnych klientów przez co najmniej 15 minut przy ruchu i walce, z jasnym opisem sprzętu. Docelowy limit dobieramy do wyników. Płatności i publiczny hosting są osobnymi decyzjami; bez wcześniejszej publikacji przez automatyzację.

## Poza pierwszym wydaniem
Otwarty PvP, domki, aukcje, gildie, crafting, rozbudowane drzewka, dziesiątki map, tysiące graczy i migracja starej Eldorii Django. Nie dodawać ich kosztem jakości podstawowej pętli.

## Wybór testera — profesje wcześniej w offline

0.1.9 realizuje T07b: Knight, Archer, Mag, broń, trzy umiejętności każdego i cztery przypisywane akcje. T07c pozostaje kolejnym etapem po ocenie: drzewka profesji, punkty rozwoju, zależności od poziomu i balans. Obecne stabilne ID oraz właściciel i poziom umiejętności służą przyszłej rozbudowie. Nie dodano punktów ani drzewa. W online serwer będzie sprawdzał profesję, rozwój, obrażenia i nagrody; lokalny postęp nie zostanie przeniesiony do ekonomii online.

## Wygląd i przygotowanie Androida 0.1.10

Na polecenie właściciela T07d dodaje własne stroje Archera i Maga, zachowuje Knighta oraz wprowadza kosmetyczne kolory z podglądem/zapisem. T17a przygotowuje wcześniej wrapper offline Capacitor 8 i instrukcję APK, bez wymagania ukończenia online. Nie zastępuje T17/M4: kompilacja Android SDK, fizyczna instalacja, tło/powrót, safe-area, udostępnianie zapisu i profilowanie wymagają oddzielnej weryfikacji na telefonie. SDK nie jest dostępne w środowisku chmurowym; binarnego APK nie deklarujemy jako wykonanego. Drzewka T07c i cały etap online pozostają przyszłą pracą.

## Sterowanie, plecak i poziomy czarów 0.1.11

Na życzenie testera w M2: odczyt ruchu z klatkami gry, ikonowy plecak i osobne sloty broni/pancerza oraz dodatkowe warstwy dziewięciu animacji. Każda profesja automatycznie odblokowuje czary na poziomach 1, 3 i 5; progi waliduje domena także po wznowieniu starszego zapisu. T07e czeka na ocenę płynności/wyglądu i balansu na telefonie; T07c (drzewka) i online pozostają kolejnymi etapami.

## Cel, łup i depo 0.1.12

T07f realizuje wybór testera: celowanie broni/czarów w zasięgu, nick i dwa warianty pasków, autołup z filtrem, depo w gospodzie, stash i ikonowy handel NPC. Market ma być rynkiem między graczami, zgodnie z odpowiedzią właściciela; pozostaje na etap M3, po serwerze, kontach i trwałej gospodarce. Nie dodajemy lokalnego sklepu pod nazwą marketu. Stash jest obecnie zapisem offline; danych i waluty offline nie przenosimy do rynku online.

## Widoczność zdrowia 0.1.13

W ramach T07f pełne HP/mana i łuki pozostają widokiem właściciela. Osobny widok publiczny przyjmuje tylko nazwę/HP; teraz obsługuje potwory, z kolorami zdrowia i etykietami po zaznaczeniu lub zranieniu. Dla M3 wymagana będzie także kontrola danych po stronie serwera: prywatne zasoby właściciela i publiczne HP innych graczy. Sam podział renderowania offline nie jest kontrolą dostępu ani testem kont online.

## Pierwsza sesja online 0.1.14 — stan historyczny

Właściciel zaakceptował T11 („T11 jest okay”). T12 dodaje Node/Colyseus 0.18, OnlineGateway i jeden wspólny świat gościnny do testów LAN. Dane i waluta offline nie są importowane. Pełne zasoby postaci trafiają do właściciela sesji; inne postacie otrzymują publiczne HP, bez many czy plecaka. Limit testowy 8 osób nie jest testem obciążenia. Następna zależność to T13: konta, jedna aktywna sesja i PostgreSQL; potem T14 trwała gospodarka i T15 reconnect. Wyjście lub utrata połączenia kończy bieżącą postać testową. Market graczy nadal czeka na trwałą gospodarkę. M3 jako całość nie jest ukończone.


## Konta i zapis postaci 0.1.15

T13 dodaje konta email/hasło, PostgreSQL, trzy postacie bezpłatne/pięć premium, wybór profesji, trwały checkpoint postaci i skilli, blokadę wylogowania w walce i piętnastominutową bezczynność. Mobilna góra to plecak i ustawienia; inni gracze pokazują nick, lvl i publiczny HP. Market graczy czeka nadal na T14 — transakcje i trwałą gospodarkę. T15 obejmie reconnect i regiony. Drzewka rozwoju profesji, reset hasła, weryfikacja emaila i płatności wymagają dalszych etapów. M3 jako całość pozostaje nieukończone.

## Rozszerzenie świata na polecenie testera — 0.1.18

Port na wschodzie Vareon, pierwsza zimowa wyspa Nivora, katakumby w lesie i schody do piętra sklepu. Główna mapa miasta i lasu pozostaje ciągła. Nowe piętra i wyspa mają własne kolizje, spawny, potwory oraz powroty; zapisy offline i konta przechowują pozycję. Grafika i aranżacja czekają na ocenę testera w T05c REVIEW. To pierwszy odcinek podróży; kolejne wyspy, boss, nowe zadania i finalny balans nie są ukończone. T14/T15 pozostają kolejnymi etapami infrastruktury online.
