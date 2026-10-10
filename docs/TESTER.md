# Eldoria 0.0.1 — pierwsza próba gry

To grywalny prototyp offline M0 i niezależnych mechanik T07/T08, **nie pełna wersja 0.1**. Obie mapy 28×22 to sceny wzorcowe. Pełne Vareon 48×48, las 64×64, NPC, sklep, quest i zapis pozostają przed nami. Grafika jest autorskim placeholderem, audio celowo wyłączone. Odświeżenie strony lub rozpoczęcie nowej próby zeruje postęp.

## Uruchomienie na komputerze

Potrzebny Node.js 24.19.0 (również Node 22.13+; zalecana wersja 24.19) i npm. Z katalogu repozytorium:

```sh
npm ci
npm run dev
```

Otwórz adres wypisany przez Vite. Aby grać na telefonie podłączonym do **tej samej sieci Wi-Fi**:

```sh
npm run dev:lan
```

Otwórz na telefonie adres wypisany przez skrypt. Obróć telefon do poziomu. Komputer musi pozostać włączony, a zapora dopuszczać port 5173 w sieci lokalnej. Środowisko chmurowe nie jest urządzeniem w Twojej domowej sieci; sam adres z chmury nie daje publicznego dostępu. Ten etap nie wdraża gry na hosting i nie tworzy APK.

## Pięć kroków testu

1. Wpisz imię i rozpocznij. Strzałkami/WASD lub D-padem idź w górę do świecącej bramy. Stojąc na niej lub obok, wybierz **Przejdź** (F). Samo podejście nie teleportuje. Na dziedzińcu nie ma walki.
2. W zagajniku dotknij szczura albo wybierz **Cel** (T). Iskra (E) trafia do 4 kratek, kosztuje 8 many i odnawia się przez 1,5 s. Miecz (Spacja) działa z sąsiedniej kratki co 0,8 s. Powtórz walkę z żukiem; wilka szukaj głębiej na południowym wschodzie. Wskaźnik celu pokazuje kierunek i odległość. Wilk atakuje sam; pozostałe stworzenia dopiero po zaczepieniu.
3. Gdy HP spadnie, użyj **Mikstury** (Q). Masz trzy, każda leczy do 40 HP, z przerwą 3 s. Pełne HP nie zużywa mikstury. Po pokonaniu stworzenia podejdź do sakiewki i wybierz **Łup** (R), osobno dla każdej sakiewki. EXP jest przyznawane za pokonanie; złoto i materiały dopiero po podniesieniu.
4. Otwórz **Plecak** (I). Sprawdź złoto, chitynę/skórę, mikstury i wyposażenie. Zdejmij i załóż miecz/tunikę. Ruch pod otwartym oknem ma być zablokowany. Pokonanie każdego z trzech typów kończy próbę. Zamknij komunikat przyciskiem „Zbierz pozostały łup”, jeśli chcesz jeszcze zwiedzać. Śmierć przywraca HP/manę na bezpiecznym dziedzińcu bez utraty EXP/łupu.
5. W menu można zaznaczyć **Spacer bez potworów**, aby ocenić wygląd bez walki. Zrób pięć podróży przez bramę w obie strony, sprawdź ściany/podstawy drzew, ostrość podczas ruchu, obrót telefonu i jednoczesny ruch + atak/czar. Potem rozpocznij nową próbę — postęp powinien się wyzerować, bo zapis z T10 nie jest jeszcze zaimplementowany.

## Scena do oceny

[Widok desktopowy](screenshots/scene-desktop.png) · [widok mobilny](screenshots/scene-mobile.png) · [ukończona próba](screenshots/trial-mobile.png). To zrzuty z końcowych testów, z placeholderami.

## Co zgłosić

Napisz model telefonu, przeglądarkę, wersję Androida oraz czy przyciski są wygodne i nie zasłaniają celu. Najważniejsza decyzja przed T05: czy kierunek grafiki sceny wzorcowej jest akceptowalny, czy wymaga zmian (postacie, drzewa, dom, kolory, ostrość). Nie trzeba pisać kodu. Błąd opisz krokami, oczekiwanym i rzeczywistym zachowaniem; screenshot pomaga.

Testy mobilnego viewportu i emulowanego wielodotyku nie zastępują fizycznego telefonu. Nie zmierzono jeszcze FPS ani stabilności 15-minutowej sesji na konkretnym Androidzie.

## Kontrole dla programisty / Codexa

```sh
npm run typecheck
npm run lint
npm test
npm run validate:content
npm run build
npm run test:e2e
```

Playwright automatycznie używa `/usr/bin/chromium`, jeśli istnieje, lub swojej zainstalowanej przeglądarki. Na własnym komputerze bez Chromium najpierw `npx playwright install chromium`. Opcjonalnie ustaw `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` na pełną ścieżkę do Chromium. Testy wymagają wolnego portu 5173. Szczegóły i aktualne wyniki znajdują się w `TASKS.md`; CI jest przygotowane, lecz wynik na GitHub będzie znany dopiero po zapisaniu zmian.
