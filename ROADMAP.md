# Eldoria — plan rozwoju

Każdy etap kończy się grywalnym wynikiem i sprawdzeniem kryteriów. Brak dat i gwarancji pojemności serwera przed implementacją oraz pomiarami. Kolejność wynika z zależności; uwagi testera o sterowaniu i czytelności mają pierwszeństwo przed dodawaniem zawartości.

| Etap | Wynik | Kryterium przejścia |
|---|---|---|
| M0: fundament i wygląd | Projekt startuje; wzorcowa scena i sterowanie | Kontrole kodu przechodzą; scena czytelna na telefonie; tester akceptuje styl lub podaje konkretne poprawki |
| M1: eksploracja | Vareon, las, NPC, portale | Brak przejścia przez ściany; ruch 4 kierunki; dialogi; 5 przejść bez wycieku listenerów i awarii |
| M2: wersja 0.1 offline | Walka, łup, sklep, quest, zapis | Pełny ciąg: quest → 5 zabójstw → nagroda → zapis → wznowienie; śmierć nie blokuje gry; wypłata tylko raz |
| M3: zamknięta alfa online | Dwie osoby w jednym świecie; konta i trwały zapis | Serwer rozstrzyga grę; reconnect i restart; walidacja oszustw; brak duplikacji wypłat; test 2 urządzeń |
| M4: Android alfa | Instalowalny testowy APK | Uruchomienie na fizycznym telefonie, multitouch, safe-area, tło/powrót, reconnect, pomiary FPS |
| M5: mała beta | Profesje, loch, boss, moderacja | Balans sprawdzony przez testerów; backup odtworzony; load test w ustalonym profilu; aktualna instrukcja operacyjna |
| M6: przygotowanie publikacji | Podpisany build i plan utrzymania | Prywatność/konta/płatności zgodne z aktualnymi wymogami; brak krytycznych błędów; właściciel zleca publikację |

## M0
T01–T03. Wzorzec obejmuje środowisko, postać i UI z tego samego stylu. Jeśli tester nie zaakceptuje grafiki, poprawiamy ją przed rozbudową mapy. Domena i automatyczne testy mogą rozwijać się równolegle z oceną.

## M1
T04–T06. Logiczną siatkę i portale stosujemy od początku, aby online nie wymagało zmiany sposobu ruchu. Brak pustej demonstracji: spacer po mieście, dialog i wyjście do lasu mają działać z telefonu.

## M2
T07–T11, z dodatkowym T09a wybranym przez testera: eksploracyjne „Ślady dawnego szlaku” i kronika odkryć w 0.1.3. Wersja 0.1 ma dawać około 10–15 minut sensownej gry. Tester ocenia: ostrość, wygodę sterowania, wybór celu, czytelność obrażeń i tempo walki. Nie blokujemy wydania brakiem muzyki, jeśli została jawnie wyłączona.

## M3
T12–T16. Najpierw jeden serwer i dwie osoby, potem poprawność ekonomii, rozłączeń i regionów. Offline pozostaje osobnym trybem z osobnym zapisem. Brak importu walut offline. Wyniki load testu zapisują sprzęt, liczbę symulowanych graczy, aktywnych potworów, czas i latency; syntetyczne połączenia bez akcji nie dowodzą pojemności MMORPG.

## M4
T17–T18. Capacitor pakuje klienta, nie uruchamia serwera MMORPG na telefonie. SDK/JDK i podpisywanie trzeba sprawdzić dla wybranej wersji. Jeśli środowisko Codexa nie ma Android SDK, klient i konfiguracja mogą być przygotowane, ale APK nie oznaczamy jako wykonany.

## M5–M6
T19–T21. Testy obciążeniowe: stopniowo 10/25/50 aktywnych klientów przez co najmniej 15 minut przy ruchu i walce, z jasnym opisem sprzętu. Docelowy limit dobieramy do wyników. Płatności i publiczny hosting są osobnymi decyzjami; bez wcześniejszej publikacji przez automatyzację.

## Poza pierwszym wydaniem
Otwarty PvP, domki, aukcje, gildie, crafting, rozbudowane drzewka, dziesiątki map, tysiące graczy i migracja starej Eldorii Django. Nie dodawać ich kosztem jakości podstawowej pętli.
