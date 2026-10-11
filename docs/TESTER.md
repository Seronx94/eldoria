# Eldoria 0.1.14 — wspólna sesja online

Grywalna przygoda offline: Vareon i Mroczny Las w jednym świecie 64×112, Knight/Archer/Mag, 12 stworzeń, trzej NPC, dwa zadania, sklep i zapis. Kolorowy pixel art jest autorskim zestawem roboczym; audio pozostaje wyłączone. Dostępny jest testowy multiplayer gościnny opisany w [ONLINE.md](ONLINE.md), bez kont i trwałego zapisu. Projekt Androida jest gotowy do lokalnego zbudowania APK; instrukcja: [ANDROID.md](ANDROID.md).

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

Otwórz na telefonie adres wypisany przez skrypt. Obróć telefon do poziomu. Komputer musi pozostać włączony, a zapora dopuszczać port 5173 w sieci lokalnej. Środowisko chmurowe nie jest urządzeniem w Twojej domowej sieci; sam adres z chmury nie daje publicznego dostępu. Po zbudowaniu i zainstalowaniu APK komputer i LAN nie są potrzebne — patrz [instrukcja Androida](ANDROID.md).

## Trzy kroki testu poprawionych nicków i pasków

1. Uruchom `npm run dev:online` i dołącz dwoma urządzeniami lub kartami jako różne profesje. Sprawdź czytelność obu nicków na tle kostki i trawy.
2. Przejdź obok drugiego gracza: jego mały pasek HP ma być nad głową, a nick nad paskiem. Podczas chodzenia oba elementy powinny podążać za postacią.
3. W menu przełącz własne paski na łuki. Inny gracz nadal ma tylko mały pasek HP; mana i łuki należą wyłącznie do Twojego widoku. Powtórz w poziomie na telefonie.

## Poprzednie trzy kroki testu 0.1.13

1. Sprawdź własny nick oraz HP i manę. W menu wybierz łuki: niebieska mana ma nadal występować tylko przy Twoim bohaterze. Zapisany wybór pozostaje po wznowieniu.
2. Zaznacz zdrowego potwora — dostanie mały pasek HP i zieloną nazwę. Zdejmij cel: etykieta zdrowego potwora znika. Zrań go: etykieta zostaje także bez zaznaczenia, ale nie pokazuje many ani bocznych łuków.
3. Podczas walki z wilkiem sprawdź kolory jego nazwy/HP: zielony powyżej połowy, żółty do połowy, czerwony przy jednej czwartej. Po pokonaniu nazwa i pasek znikają. To samo kolorowanie działa dla Twojego nicku i HP; pilnuj mikstur.

Gra pozostaje offline, bez kont i innych graczy. Widok publiczny działa teraz dla potworów; test prywatności danych między graczami będzie możliwy po uruchomieniu serwera. Testy chmurowe nie zastępują oceny czytelności/FPS na fizycznym telefonie.

## Pięć kroków testu 0.1.12

1. Archerem lub Magiem zaznacz potwora dotykiem. Strzała/pocisk i czar mają lecieć w niego. Odejdź poza zasięg: dostaniesz komunikat bez zużycia many. Ponowny dotyk usuwa cel; bez zaznaczenia działa automatyczny wybór.
2. Sprawdź nick, HP i manę nad postacią. W menu wybierz łuki, wróć do gry i ponownie uruchom stronę — wybór ma pozostać.
3. Pokonaj przeciwnika i przejdź obok łupu. W plecaku wyłącz zbieranie skóry lub chityny: materiał ma pozostać na ziemi, a złoto nadal się zbierać. Ręczne Łup pomija filtr.
4. W planie Vareon wybierz Depo i przejdź do gospody na południowym zachodzie. Podejdź do skrzynki, otwórz dotykiem/F, odłóż materiał i pobierz jedną sztukę. Zamknij, wznow grę i sprawdź stash. Market graczy będzie dopiero online.
5. U Borina sprawdź ikonę, nazwę i cenę. Kup miksturę i sprzedaj materiał; sprawdź saldo oraz czy wygodnie trafiasz w przyciski na telefonie.

Zgłoś model telefonu, problem i miejsce na mapie; dla utraty przedmiotu dołącz eksport zapisu. Testy Chromium emulują dotyk, ale nie zastępują fizycznego urządzenia ani pomiaru FPS.

## Poprzednie kroki testu 0.1.11


1. Przytrzymaj joystick i przejdź dłuższy odcinek ulicy. Postać ma płynnie przesuwać się między kratkami; sprawdź też zmianę kierunku, zatrzymanie i ruch przy ścianie. Podaj model telefonu, jeśli nadal widzisz szarpanie.
2. Otwórz **Plecak**. Kliknij broń w wyposażeniu, następnie jej ikonę w siatce i **Załóż**. Wybierz miksturę przy niepełnym HP i **Użyj mikstury**. Sprawdź licznik, pusty slot i opis materiału; ekwipunek pozostaje po wznowieniu.
3. Na poziomie 1 działa pierwszy czar własnej profesji. Dwie pozostałe ikony pokazują **POZ. 3** i **POZ. 5**. Spis czarów jest w **Profesja i cztery akcje**. Zdobywaj EXP przez walkę/zadania; po awansie czar odblokowuje się automatycznie. Nie używaj starego klienta do oceny nowych progów.
4. Po odblokowaniu sprawdź płomienie/krąg lodu Maga, wir/tarcze Knighta albo deszcz strzał/leczenie Archera. Porównaj czytelność celów podczas walki, sterowanie drugim palcem oraz odnowienia. Zapisz, odśwież i sprawdź zachowanie poziomu i przypisań.

Poziomy 1/3/5 są pierwszym balansem do oceny. Gra nadal jest offline; drzewka rozwoju i nowe sloty sprzętu będą osobnym etapem. Testy Chromium nie zastępują pomiaru płynności na fizycznym telefonie.

Podglądy **0.1.11**: [nowy plecak](screenshots/backpack-rpg-mobile.png), [Lodowy krąg](screenshots/spell-frost-mobile.png), [Żelazna osłona](screenshots/spell-guard-mobile.png). Rzeczywiste zrzuty produkcji w emulacji Chromium. Plecak pokazuje poprawny import testowy z kilkoma stosami dla porównania ikon; zrzutów nie edytowano.

## Cztery kroki testu wyglądu 0.1.10

1. Wyeksportuj ważną przygodę. W nowych przygodach porównaj profesje: Knight zachowuje wygląd, Archer ma łuk/kołczan i zieleń, Mag niebieski kapelusz/szatę oraz różdżkę. Przejdź w cztery strony i użyj broni/czarów w lesie.
2. W **Plecak → Wygląd i kolory postaci** zmień każdy z czterech kolorów. Podgląd pokazuje cztery kierunki. Sprawdź czy włosy, strój, dół i buty zmieniają się bez barwienia twarzy/obrysu; zamknij plecak i obejrzyj postać w ruchu.
3. Odśwież i wznów: profesja, kolory, wyposażenie i zadania mają zostać. Wybór innej profesji w menu nie zmienia wznowionej postaci. Przywróć **Domyślne kolory profesji** i porównaj oryginalny wygląd.
4. Na telefonie sprawdź dostęp do wyboru kolorów i chodzenie z rzucaniem czaru drugim palcem. Jeśli budujesz APK, wykonaj także [pięć kroków testu natywnego](ANDROID.md#test-na-telefonie).

Podglądy strojów **0.1.10**: [Knight](screenshots/outfit-knight-mobile.png), [Archer](screenshots/outfit-archer-mobile.png), [Mag](screenshots/outfit-mage-mobile.png), [zmienione kolory Archera](screenshots/outfit-colors-archer-mobile.png), [Archer w mieście](screenshots/outfit-archer-world-mobile.png). Zrzuty z emulacji Chromium, bez edycji obrazów.

## Pięć kroków testu profesji

1. W menu wyeksportuj swój ważny zapis, potem wybierz **Knight**, **Archer** lub **Mag** i rozpocznij nową przygodę. Wznawianie starej przygody zachowuje jej profesję; starszy zapis otrzymuje Knighta. Każda profesja zaczyna z odpowiednią bronią i trzema własnymi umiejętnościami.
2. Wyjdź północną bramą do lasu. Przytrzymaj miecz/łuk/różdżkę, bez zaznaczania potwora: Knight uderza obok, Archer do pięciu kratek, Mag do czterech. Broń nie zużywa many; ściany blokują strzały. Sprawdź zatrzymanie po puszczeniu i po powrocie do miasta.
3. Dotknij każdego z trzech czarów. Knight ma falę ostrza, wir i czterosekundową osłonę; Archer precyzyjny strzał, deszcz strzał i leczenie; Mag Iskrę, kulę ognia i lodowy krąg. Pierwszy czar działa od poziomu 1, drugi od 3, trzeci od 5. Obserwuj odrębne animacje, koszty i odnowienia. Leczenie przy pełnym HP nie zużywa many; lód na razie nie spowalnia. Czary w mieście są zablokowane.
4. Otwórz **Plecak → Profesja i cztery akcje** i zmień kolejność albo przypisz miksturę. Po lewej na telefonie trzymaj joystick, drugim palcem użyj jednej z czterech ikon po prawej (2×2). Przypisz broń również do czwartego miejsca i przytrzymaj. Po puszczeniu, obrocie lub otwarciu plecaka ruch i atak mają się zatrzymać. Na komputerze: 1–4 odpowiadają pozycjom, Spacja zawsze używa broni, E pierwszego czaru.
5. Zapisz, odśwież i wznów: profesja, broń, ustawienie przycisków oraz pozostałe odnowienia powinny zostać. Sprawdź każdą profesję jako osobną nową postać; eksport pozwala potem przywrócić wcześniejszą. Zgłoś wygodę pod kciukiem, czytelność efektów, model telefonu i zbyt silne/słabe czary.

Profesje mają osobne stroje w 0.1.10. Drzewka rozwoju pozostają dalszym etapem. Testy przeglądarkowe nie mierzą FPS na Twoim telefonie; natywnego APK nie skompilowano w chmurze bez SDK.

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
