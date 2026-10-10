# Eldoria 0.1.2 — ruch potworów i animowana walka

Pierwsza przygoda offline: Vareon 48×48, Mroczny Las 64×64, 12 stworzeń, trzej NPC, quest, sklep i zapis. Nowy kolorowy pixel art jest autorskim zestawem do oceny, audio wyłączone. Brak multiplayer i APK. Kontrole przeglądarkowe nie zastępują Twojego testu na fizycznym telefonie.

## Uruchomienie na komputerze

Potrzebny Node.js 24.19.0 (również Node 22.13+; zalecana wersja 24.19) i npm. Z katalogu repozytorium:

```sh
git pull
npm ci
npm run dev
```

Otwórz adres wypisany przez Vite. Aby grać na telefonie podłączonym do **tej samej sieci Wi-Fi**:

```sh
npm run dev:lan
```

Otwórz na telefonie adres wypisany przez skrypt. Obróć telefon do poziomu. Komputer musi pozostać włączony, a zapora dopuszczać port 5173 w sieci lokalnej. Środowisko chmurowe nie jest urządzeniem w Twojej domowej sieci; sam adres z chmury nie daje publicznego dostępu. Ten etap nie wdraża gry na hosting i nie tworzy APK.

## Trzy kroki testu animacji

1. Wybierz **Kolorowy pixel art**, **Próba Wędrowca**, bez spaceru. Wybierz szczura przyciskiem **Cel** i użyj **Miecza** z daleka: powinien pojawić się komunikat o zasięgu, bez zamachu i trafienia.
2. Rzuć **Iskrę**. Sprawdź lot pomarańczowego pocisku, rozbłysk i liczbę obrażeń. Szczur zacznie podchodzić z animacją nóg. Kiedy stanie obok, dobij go **Mieczem**: postać zwraca się do celu, pokazuje zamach i ślad cięcia. Przy otrzymaniu obrażeń widać krótki błysk i czerwony wynik. Szybkie ponowne kliknięcie podczas cooldownu nie powinno tworzyć kolejnego trafienia.
3. Sprawdź żuka i wilka, następnie przygodę w lesie. Dalsze stworzenia spacerują blisko swoich spawnów; przy wejściu cele pozostają spokojne do nauki. Po walce efekty znikają; po menu, zmianie mapy i wznowieniu zapisu nie wracają stare trafienia. Oceń na telefonie czytelność i płynność przy jednoczesnym ruchu i czarze.

[Nagranie animowanej walki — Chromium desktop](videos/animated-combat-desktop.webm). To nagranie scenariusza walki w Chromium, nie z fizycznego telefonu. Potwory mają dwa ujęcia (przód/bok) i odbicie lewego boku; osobne ujęcie tyłu oraz dedykowane klatki uderzenia bohatera pozostają do dopracowania.

## Porównanie grafiki

1. W menu pozostaw **Kolorowy pixel art — do oceny**, wybierz **Próba Wędrowca** i zaznacz **Spacer bez potworów**. Podejdź pięć kratek na północ: dom i drzewo będą widoczne obok ścieżki.
2. Przejdź w czterech kierunkach. Oceń szczegóły postaci, kontury, ostrość terenu podczas ruchu kamery oraz to, czy tekstury nie męczą wzroku.
3. Wróć do menu, wybierz **Poprzednia grafika — porównanie**, rozpocznij ten sam spacer i podejdź pięć kratek na północ. Porównaj te same obiekty; wybór grafiki jest zapamiętywany.
4. Wybierz ponownie kolorowy styl, tryb Vareon i odznacz spacer. Zobacz Mirę, Orena i Borina, przejdź do lasu i sprawdź czytelność szczura, żuka i wilka podczas walki. Możesz też wznowić swoją przygodę w wybranym stylu.

Napisz, czy ten kierunek jest wystarczająco bliski oczekiwanemu klimatowi, i wskaż element do poprawy: postać, potwory, teren, drzewa lub domy. Nowe mapy na tym zestawie powstaną po Twojej ocenie.

## Pięć kroków testu

1. Wybierz **Vareon — Niepokój za bramą**, pozostaw spacer odznaczony i rozpocznij. Stoisz obok **Miry**. Kliknij ją lub użyj **Rozmowa / Przejdź (F)**, a potem **Przyjmij zadanie**. Ruch, atak i czar pod dialogiem mają być zablokowane. Zamknij rozmowę. WASD/strzałki oraz D-pad poruszają postacią; Caps Lock działa.
2. Idź na północ do świecącej bramy. Podejdź na sąsiednią kratkę i kliknij ją lub naciśnij **F**. W lesie szczur jest blisko na północy po prawej; żuk dalej na prawo. Wybierz **Cel (T)** albo dotknij stworzenia. **Iskra (E)** działa do 4 kratek, kosztuje 8 many i odnawia się przez 1,5 s; **Miecz (Spacja)** działa z sąsiedniej kratki co 0,8 s. Wilki głębiej w lesie atakują same; szczury i żuki dopiero po zaczepieniu. Potwory odradzają się po 20 s. Pokonaj pięć — licznik zadania rośnie tylko po jego przyjęciu.
3. Podejdź obok każdej sakiewki i wybierz **Łup (R)**. Sprawdź materiały i złoto w **Plecaku (I)**. **Mikstura (Q)** przywraca do 40 HP co 3 s, pełne HP jej nie zużywa. Można zdjąć i założyć miecz/tunikę. Śmierć wraca do Vareon z pełnym HP/maną i zachowanymi zdobyczami. Brama powrotna jest na południe od wejścia do lasu; samo podejście nie teleportuje.
4. Wróć do Miry i odbierz **50 EXP, 20 złota i 2 mikstury**. Nagroda musi być wypłacona tylko raz. Gdy nie mieści się w plecaku, pozostaje do odebrania. **Oren** dwa pola na zachód od miejsca startu leczy za darmo. **Borin** stoi trzy pola na wschód i dwa na południe: sprzedaje mikstury po 5 złota i kupuje skóry/chitynę po 2. Rozmowa działa wyłącznie obok NPC.
5. Użyj **Zapisz**, odśwież stronę i wybierz **Wznów przygodę**. Pozycja, poziom, wyposażenie, zasoby i odebrana nagroda powinny pozostać. W menu wyeksportuj zapis do pliku, a następnie zaimportuj go. Jest też **Odzyskaj kopię zapisu** — wraca do poprzedniego checkpointu, więc część ostatniego postępu może cofnąć się. Sprawdź pięć podróży między mapami, obrót telefonu, ostrość kamery oraz jednoczesny ruch i czar.

## Zapis i tryby

Zapis przygody znajduje się lokalnie w tej przeglądarce, oddzielnie od przyszłego online. Inny telefon, przeglądarka lub adres gry nie współdzieli go — przenieś plik eksportu. Tryb prywatny i usuwanie danych strony mogą usuwać zapis; eksportuj ważny postęp. Przycisk **Rozpocznij** tworzy nową przygodę, a **Wznów przygodę** zachowuje istniejącą.

Uszkodzenie lub nieobsługiwana wersja pokazują komunikat i pozostawiają dane. Wybierz odzyskanie kopii lub import poprawnego pliku. Jeśli pamięć jest pełna lub zablokowana, gra zgłasza błąd zapisu; można wrócić do menu i wyeksportować aktywną przygodę. Import wadliwego pliku nie zmienia bieżącego zapisu. Zegar walki i odrodzenia jest wstrzymany podczas wyłączenia gry; wznowienie nie resetuje cooldownów.

**Próba Wędrowca — trening walki** zaczyna się bezpośrednio przy szczurze i żuku w starym zagajniku i kończy po pokonaniu trzech typów. **Spacer bez potworów** umożliwia oglądanie scen wzorcowych. Te tryby nie zapisują postępu.

## Widoki

Nowy styl 0.1.1: [scena wzorcowa — desktop](screenshots/colorful-sample-desktop.png) · [poprzedni styl — ta sama scena](screenshots/classic-sample-desktop.png) · [Vareon — desktop](screenshots/colorful-town-desktop.png) · [Vareon — mobilny](screenshots/colorful-town-mobile.png) · [las — mobilny](screenshots/colorful-forest-mobile.png) · [postać w ruchu — mobilny](screenshots/colorful-moving-mobile.png). Zrzuty z Chromium, nie z fizycznego telefonu.

Poprzedni styl 0.1.0:
[Vareon — desktop](screenshots/vareon-desktop.png) · [Vareon — mobilny](screenshots/vareon-mobile.png) · [las — desktop](screenshots/forest-desktop.png) · [nagroda Miry — mobilny](screenshots/reward-mobile.png). Zrzuty z testów przeglądarkowych, z grafiką roboczą.

## Co zgłosić

Podaj model telefonu, przeglądarkę, Androida i wersję gry. Sprawdź wygodę przycisków, widoczność potworów, dialogów i komunikatów zapisu. Napisz, czy quest da się ukończyć bez instrukcji i ile trwała przygoda; 10–15 minut jest celem, a nie potwierdzonym pomiarem. Uwagi o postaciach, drzewach, domach i kolorach nadal są potrzebne. Nie trzeba pisać kodu.

FPS, ręczny wielodotyk i stabilność 15-minutowej sesji na konkretnym Androidzie pozostają do sprawdzenia na fizycznym urządzeniu.

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
