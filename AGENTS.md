# Instrukcje pracy Codexa — Eldoria

## Misja
Buduj projekt zgodnie z README.md, ROADMAP.md i TASKS.md. Użytkownik jest testerem, nie programistą. Samodzielnie rozwiązuj rutynowe decyzje, pisz pełny kod, uruchamiaj wymagane kontrole, naprawiaj błędy i przygotowuj grywalny rezultat. Nie kończ etapu samym planem ani listą rzeczy, które użytkownik ma zaprogramować.

## Początek sesji
1. Przeczytaj dokumentację i najnowsze uwagi testera w TASKS.md.
2. Sprawdź aktualny kod, status git i dostępne polecenia. Nie nadpisuj cudzych zmian.
3. Wybierz pierwsze zadanie bez blokujących zależności. Jeśli projekt pusty, rozpocznij T01.
4. Podaj krótko, jaki grywalny efekt powstanie. Ustalony stack nie wymaga ponownego pytania.

## Wykonanie
- Działaj w małych pionowych fragmentach: wejście → reguła domeny → prezentacja → sprawdzenie.
- Kontynuuj kolejne gotowe zadania w sesji, dopóki można je rzetelnie ukończyć. Nie deklaruj pracy w tle po zakończeniu sesji.
- Jeśli brak sieci/SDK/przeglądarki blokuje część pracy, wykonaj niezależną część i zapisz dokładny blocker. Nie udawaj testu ani wygenerowanego APK.
- Nie zmieniaj silnika, stylistyki ani ekonomii online bez uzasadnienia. Zakup assetów, publiczne wdrożenie i publikacja wymagają oddzielnej instrukcji właściciela.
- Pytaj tylko przy decyzjach, które istotnie zmieniają produkt lub blokują dalszą pracę. Zwykłe nazwy plików, refaktoryzacje i naprawy wykonuj sam.

## Kod i granice
TypeScript strict; brak any bez opisanego powodu. Domena bez Phaser/DOM, Phaser jako widok. Parametry mechanik w packages/content. Losowość/zegar wstrzykiwane. Komendy i zapisy walidowane na granicy. UI nie ustala nagród, obrażeń ani salda. Online nie ufa localStorage. Nie dodawaj nieużywanej infrastruktury; zachowaj prosty LocalGateway i kontrakt do online.

Używaj stabilnych ID, względnych ścieżek assetów, lockfile i .env.example bez sekretów. Nie commituj kluczy, haseł, dumpów kont ani nieedytowalnych map jako jedynego źródła. Nie kopiuj cudzych gier. Każdy asset ma źródło i licencję. W razie braków oznacz placeholder i zgłoś je zamiast sugerować, że wygląd jest gotowy.

## Kontrole
Przed oznaczeniem zadania jako DONE uruchom adekwatne testy i kryteria zadania. Przed wersją grywalną: typecheck, lint, test, validate:content, build i dostępne e2e. Testuj reguły: kolizje, cooldown, pojedyncza wypłata, pełny plecak, śmierć, zapis. Nie twórz testów wyłącznie sprawdzających implementacyjne szczegóły ani nie wyciszaj niepowodzeń, by uzyskać zielony wynik.

W UI sprawdź uruchomienie, konsolę, ładowanie assetów, co najmniej jeden viewport mobilny poziomy, zmianę rozmiaru, dotyk wieloma palcami i 5 powtórzeń przejścia między mapami. Zapisy i gospodarka wymagają również testów błędnych i powtórzonych operacji. Test myszą nie zastępuje testu dotyku na prawdziwym telefonie; jasno rozdziel te wyniki.

## Grafika/audio
Nie akceptuj rozmytej mapy jako finalnej. Sprawdź screenshot sceny wzorcowej i ruch kamery. UI minimum 48 CSS px dla przycisków. Brak przypadkowego mieszania tilesetów, rozciągania ułamkowego, ostrych pisków i zapętlonego dźwięku po zmianie sceny. Assety robocze oznacz w raporcie. Do akceptacji stylistyki przez testera nie rozwijaj całego świata na niesprawdzonym zestawie; możesz pracować nad domeną i testami.

## Koniec sesji i wznowienie
Aktualizuj TASKS.md: statusy, wyniki, blockery, następne konkretne działanie i uwagi testera. DONE to ukończona implementacja z dowodem; REVIEW to efekt czekający na ocenę właściciela; nie myl ich. Zapisywać polecenie, wynik i ewentualny brak możliwości testowania. Nigdy nie zaznaczaj etapu DONE tylko na podstawie własnego opisu.

Raport dla użytkownika: co można teraz zagrać, jak uruchomić (krótkie gotowe polecenia), 3–5 kroków testu, znane ograniczenia. Przy kodzie do ręcznego uruchomienia w Termux dawaj pełne pliki w poleceniu cat > ŚCIEŻKA <<'EOF', bez wymagania edycji fragmentów. Domyślnie zmieniaj repozytorium bezpośrednio. Nie obiecuj samoczynnego przechodzenia między sesjami; po nowej sesji wznawiaj z dokumentacji.

## Definicja wersji gotowej do testów
Uruchamia się opisanym sposobem; brak blockerów startu; wymagane kontrole mają odnotowany wynik; aktualne dane i assety; co najmniej jedna kompletna pętla gry; czytelne zgłoszone ograniczenia. Nie nazywaj prototypu offline MMORPG gotowym do publikacji.
