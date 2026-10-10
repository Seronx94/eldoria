# Eldoria jako APK na Windowsie

Repozytorium zawiera projekt Androida (`android/`) oparty o Capacitor **8.5.3**. Pakuje obecną przygodę offline razem z grafiką; po instalacji nie potrzeba komputera, Wi-Fi ani `dev:lan`. To APK testowe, bez multiplayer i publikacji w sklepie. W chmurze sprawdzono build klienta i synchronizację projektu; nie skompilowano APK, ponieważ brak Android SDK. Natywny eksport zapisu i działanie na urządzeniu wymagają poniższego testu.

## Najłatwiej: Android Studio

1. Pobierz aktualny ZIP gałęzi **main**, rozpakuj i zainstaluj Node.js 24 oraz aktualne [Android Studio](https://developer.android.com/studio).
2. W Android Studio otwórz **SDK Manager**. Zainstaluj **Android SDK Platform 36**, **Android SDK Build-Tools 36.0.0** oraz **Android SDK Platform-Tools**. Zaakceptuj licencje w instalatorze. Gradle wymaga **JDK 21**; wybierz JDK dołączony do Android Studio w ustawieniach Gradle JDK (jeśli ma co najmniej wersję 21).
3. W terminalu w głównym katalogu `eldoria-main` uruchom:

   ```bat
   npm ci
   npm run android:open
   ```

   Komenda buduje klienta, synchronizuje pliki/pluginy i otwiera projekt Androida. Nie trzeba uruchamiać serwera Vite. Jeśli Android Studio nie otworzy się automatycznie, wybierz **Open** i wskaż katalog `eldoria-main\android`.
4. Poczekaj na zakończenie **Gradle Sync**. Pierwszy raz potrzeba Internetu do pobrania zależności. Wybierz **Build → Generate App Bundles or APKs → Generate APKs** (w innych wersjach menu: **Build APK(s)**). Wariant powinien być **debug**. Nie wybieraj APK produkcyjnego z podpisem na tym etapie.
5. Gotowy plik znajdziesz tutaj:

   ```text
   eldoria-main\android\app\build\outputs\apk\debug\app-debug.apk
   ```

   Przenieś go na telefon i otwórz. Android poprosi o zezwolenie na instalowanie aplikacji z użytej aplikacji Pliki/przeglądarki. Minimalnie Android 7 (API 24); najlepiej testować na aktualnym urządzeniu. Gra otwiera się poziomo.

## Alternatywnie: jedna komenda budująca APK

Po instalacji powyższych narzędzi, w **PowerShell** (domyślne lokalizacje Android Studio i SDK):

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
java -version
npm ci
npm run android:apk
```

Jeżeli SDK/JDK instalowano gdzie indziej, użyj ścieżek widocznych w SDK Manager/ustawieniach Gradle JDK. Skrypt sprawdza dostępność SDK i Java 21+, synchronizuje aktualny build i uruchamia `assembleDebug` przez dołączony Gradle Wrapper 8.14.3. Nie wymaga globalnej instalacji Gradle. Brak SDK kończy się czytelnym komunikatem, zamiast deklaracji wygenerowanego pliku.

## Aktualizacja gry i przeniesienie zapisu

Po każdej zmianie klienta uruchom `npm run android:open` lub `npm run android:apk`. Samo skopiowanie starych plików `android/` nie odświeża gry — robi to `android:sync`. Aplikacja ma stałe ID `com.seronx94.eldoria` i nie zawiera adresu serwera LAN.

Przeglądarka i APK mają osobne zapisy. W przeglądarce wybierz **Menu → Eksport zapisu**, przenieś JSON na telefon i w APK użyj **Import zapisu**. Eksport w aplikacji otwiera systemowe udostępnianie pliku (np. zapisz przez wybraną aplikację plików/chmury); używa prywatnego katalogu cache bez uprawnień do całej pamięci telefonu. Dostępne miejsca zapisu zależą od zainstalowanych aplikacji.

Aktualizacja APK z tym samym ID i kluczem podpisu powinna zachować zapis. Debug używa lokalnego klucza Android Studio; APK z innego komputera może mieć inny podpis. Przed odinstalowaniem zrób eksport — odinstalowanie usuwa lokalny postęp.

## Test na telefonie

1. Zainstaluj APK, wyłącz Wi-Fi/dane i rozpocznij przygodę. Sprawdź mapę, grafiki wszystkich profesji, NPC i walkę.
2. Jednym palcem trzymaj lewy joystick, drugim użyj czterech prawych przycisków. Sprawdź kolory w plecaku i zapamiętanie po ponownym uruchomieniu.
3. Przełącz do innej aplikacji i wróć: ruch/atak mają pozostać zatrzymane do ponownego dotyku. Sprawdź przyciski przy wycięciu ekranu i paskach systemowych.
4. Wyeksportuj JSON przez systemowe udostępnianie, następnie zaimportuj plik i porównaj profesję, kolory, zadania oraz zasoby. Eksport przeglądarkowy ma test automatyczny; natywny wymaga urządzenia.
5. Zagraj około 15 minut, w tym pięć przejść miasto–las–miasto. Zgłoś model telefonu, wersję Androida, płynność, temperaturę i ewentualny błąd. FPS na fizycznym telefonie nie był mierzony w chmurze.

Ikona i splash są na razie roboczym szablonem Capacitor. Wydanie do sklepu wymaga osobnego podpisanego builda, własnej oprawy startowej i testów urządzenia. Kluczy podpisu nie zapisuj w repozytorium; publikacja nie jest częścią tego etapu.
