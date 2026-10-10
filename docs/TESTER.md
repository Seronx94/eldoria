# Eldoria 0.1.9 — profesje i cztery akcje

Grywalna przygoda offline: Vareon i Mroczny Las w jednym świecie 64×112, Knight/Archer/Mag, 12 stworzeń, trzej NPC, dwa zadania, sklep i zapis. Kolorowy pixel art jest autorskim zestawem roboczym; audio pozostaje wyłączone. Nie ma multiplayer ani APK.

## Uruchomienie na komputerze

Potrzebny Node.js 24.19.0 (również Node 22.13+; zalecana wersja 24.19) i npm. Z katalogu repozytorium:

```sh
git pull
npm ci
npm run dev
```

Jeśli projekt pobrano jako ZIP (`eldoria-main`), pomiń `git pull`. Aktualizację uzyskasz, pobierając nowy ZIP z gałęzi main; po rozpakowaniu uruchom `npm ci`.

Otwórz adres wypisany przez Vite. Aby grać na telefonie podłączonym do **tej samej sieci Wi-Fi**:

```sh
npm run dev:lan
```

Na Windowsie `dev:lan` uruchamia Vite bezpośrednio przez bieżący Node. W starszym ZIP błąd `spawn npm ENOENT` oznacza wadliwy launcher; można uruchomić tę samą grę bez niego:

```bat
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

Otwórz na telefonie adres wypisany przez skrypt. Obróć telefon do poziomu. Komputer musi pozostać włączony, a zapora dopuszczać port 5173 w sieci lokalnej. Środowisko chmurowe nie jest urządzeniem w Twojej domowej sieci; sam adres z chmury nie daje publicznego dostępu. Ten etap nie wdraża gry na hosting i nie tworzy APK.

## Pięć kroków testu profesji

1. W menu wyeksportuj swój ważny zapis, potem wybierz **Knight**, **Archer** lub **Mag** i rozpocznij nową przygodę. Wznawianie starej przygody zachowuje jej profesję; starszy zapis otrzymuje Knighta. Każda profesja zaczyna z odpowiednią bronią i trzema własnymi umiejętnościami.
2. Wyjdź północną bramą do lasu. Przytrzymaj miecz/łuk/różdżkę, bez zaznaczania potwora: Knight uderza obok, Archer do pięciu kratek, Mag do czterech. Broń nie zużywa many; ściany blokują strzały. Sprawdź zatrzymanie po puszczeniu i po powrocie do miasta.
3. Dotknij każdego z trzech czarów. Knight ma falę ostrza, wir i czterosekundową osłonę; Archer precyzyjny strzał, deszcz strzał i leczenie; Mag Iskrę, kulę ognia i lodowy krąg. Obserwuj odrębne animacje, koszty i odnowienia. Leczenie przy pełnym HP nie zużywa many; lód na razie nie spowalnia. Czary w mieście są zablokowane.
4. Otwórz **Plecak → Profesja i cztery akcje** i zmień kolejność albo przypisz miksturę. Po lewej na telefonie trzymaj joystick, drugim palcem użyj jednej z czterech ikon po prawej (2×2). Przypisz broń również do czwartego miejsca i przytrzymaj. Po puszczeniu, obrocie lub otwarciu plecaka ruch i atak mają się zatrzymać. Na komputerze: 1–4 odpowiadają pozycjom, Spacja zawsze używa broni, E pierwszego czaru.
5. Zapisz, odśwież i wznów: profesja, broń, ustawienie przycisków oraz pozostałe odnowienia powinny zostać. Sprawdź każdą profesję jako osobną nową postać; eksport pozwala potem przywrócić wcześniejszą. Zgłoś wygodę pod kciukiem, czytelność efektów, model telefonu i zbyt silne/słabe czary.

Profesje mają na razie wspólny strój bohatera. Drzewka rozwoju i osobne stroje będą dalszym etapem. To grywalne offline, bez online i APK; testy przeglądarkowe nie mierzą FPS na Twoim telefonie.

Podglądy początku animacji w produkcji **0.1.9**: [Knight — wir](screenshots/profession-knight-mobile.png), [Archer — strzał](screenshots/profession-archer-mobile.png), [Mag — kula ognia](screenshots/profession-mage-mobile.png). Emulacja mobilnego Chromium; efekty są animowane w grze.

## Pięć kroków przygody

1. Rozpocznij w Vareon obok Miry, w wartowni północnej bramy. Rozmowa / F otwiera dialog tylko z sąsiedztwa. Przyjmij **Niepokój za bramą** (pięć zabójstw) oraz, jeśli chcesz, niezależne **Ślady dawnego szlaku**. Zamknij dialog przed ruchem i walką.
2. Idź na północ przez zwykłą bramę do lasu, bez przycisku przejścia. Potwory zauważają Cię do sześciu kratek przy niezasłoniętym widoku i ścigają. Walcz bronią swojej profesji oraz czarami. Cel / T jest opcjonalny. Mikstura / Q przywraca do 40 HP co 3 s; przy pełnym HP jej nie zużywasz. Zwycięstwa liczą się do zadania po jego przyjęciu.
3. Podejdź do sakiewki i wybierz **Łup / R**. Plecak / I pokazuje zasoby, broń, tunikę, zadania, kronikę i plan miasta. Podstawowy atak wymaga założonej broni swojej profesji. Stworzenia odradzają się po 20 s; omdlenie wraca do wartowni z pełnym HP/maną i zachowanymi zdobyczami.
4. Wróć na południe do Miry po **50 EXP, 20 złota i 2 mikstury**. Nagroda jest jednorazowa, a przy pełnym plecaku pozostaje do odebrania. W **Plecak → Plan Vareon** wybierz wskazówkę do Orena: stoi w Świątyni Świtu na zachód od rynku i leczy za darmo. Borin w sklepie po wschodniej stronie sprzedaje mikstury po 5 złota, kupuje skóry/chitynę po 2.
5. Zapisz, odśwież i wznów. Sprawdź zachowane zasoby oraz brak drugiej wypłaty. Zadanie eksploracji prowadzi do starego drogowskazu, obozu i kamienia pamięci: podejdź i użyj F, przeczytaj kronikę. Odkryj trzy różne miejsca i wróć do Miry po **75 EXP, 25 złota i 2 mikstury**; powtórne odkrycie nie zwiększa licznika.

## Miasto, grafika i sterowanie

- Dach odsłania wnętrze i NPC już do dwóch kratek od najbliższej ściany, również z boku; oddalenie go przywraca. Ściany pozostają przeszkodami, rozmowa wymaga sąsiedztwa. Sprawdź wartownię, świątynię i sklep. Pozostałe domy, warsztat i gospoda są na razie do zwiedzania, bez usług.
- Na rynku kamienna fontanna stoi na bruku, woda mieści się w misie. Obejdź ją: misa blokuje, bruk obok jest dostępny.
- Szczur, żuk i wilk mają kolorowy chód z przodu, od tyłu oraz z obu boków. Po zatrzymaniu zachowują kierunek. Starszy prosty styl porównawczy ma statyczne placeholdery.
- Joystick: środek zatrzymuje, przesunięcie wybiera jeden z czterech kierunków, puszczenie centruje. Sprawdź chodzenie z drugim palcem rzucającym czar i przytrzymującym broń. Obrót do pionu, blur i dialog zerują wejście; po powrocie trzeba ponownie dotknąć gałki. Na komputerze WASD/strzałki i D-pad.
- Przejdź drogą miasto–las i wróć pięć razy: nazwa regionu zmienia się bez teleportacji, potwory i łup zostają. Miasto jest bezpieczne, zatrzymuje pościg i blokuje ataki/czary przez granicę.

Podglądy grafiki z **0.1.8**: [fontanna](screenshots/fountain-paving-mobile.png), [wilk od tyłu](screenshots/wolf-north-mobile.png), [dach z daleka](screenshots/exterior-roofs-mobile.png), [podejście przed wejściem](screenshots/approaching-roof-mobile.png). Układ akcji w tych starszych zrzutach jest wcześniejszy. Zrzuty Chromium są emulacją mobilną, nie kontrolą fizycznego telefonu.

## Zapis i tryby

Zapis przygody znajduje się lokalnie w tej przeglądarce, oddzielnie od przyszłego online. Inny telefon, przeglądarka lub adres gry nie współdzieli go — przenieś plik eksportu. Tryb prywatny i usuwanie danych strony mogą usuwać zapis; eksportuj ważny postęp. Przycisk **Rozpocznij** tworzy nową przygodę, a **Wznów przygodę** zachowuje istniejącą.

Uszkodzenie lub nieobsługiwana wersja pokazują komunikat i pozostawiają dane. Wybierz odzyskanie kopii lub import poprawnego pliku. Jeśli pamięć jest pełna lub zablokowana, gra zgłasza błąd zapisu; można wrócić do menu i wyeksportować aktywną przygodę. Import wadliwego pliku nie zmienia bieżącego zapisu. Zegar walki i odrodzenia jest wstrzymany podczas wyłączenia gry; wznowienie nie resetuje cooldownów.

**Próba Wędrowca — trening walki** zaczyna się bezpośrednio przy szczurze i żuku w starym zagajniku i kończy po pokonaniu trzech typów. **Spacer bez potworów** umożliwia oglądanie scen wzorcowych. Te tryby nie zapisują postępu.

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
