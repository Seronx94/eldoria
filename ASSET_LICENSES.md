# Assety Eldorii

Poprzedni zestaw PNG i wszystkie mapy to **autorskie placeholdery**, wygenerowane na potrzeby tego repozytorium przez `scripts/generate-assets.py`. Nie pobrano cudzych grafik, muzyki ani fontów. Autor: wkład Codex dla projektu Eldoria. Właściciel projektu może je zmieniać i używać w projekcie, również komercyjnie. Nie są kopią assetów innych gier.

| Plik | Źródło | Przeznaczenie |
|---|---|---|
| tiles.png | generator, płótno 128×32 | 4 kafelki 32×32 |
| wanderer.png | generator, płótno 96×192 | 4 kierunki × 3 klatki 32×48 |
| tree.png | generator, płótno 64×96 | drzewo i korona |
| house.png | generator, płótno 128×128 | dom |
| rat.png | generator, płótno 32×32 | roboczy szczur |
| beetle.png | generator, płótno 32×32 | roboczy żuk |
| wolf.png | generator, płótno 32×32 | roboczy wilk |
| vareon.tmj, forest.tmj | edytowalne JSON Tiled | Vareon 48×48, las 64×64 |
| NPC Mira/Oren/Borin | wanderer.png z odrębnymi tintami w kliencie | robocze postacie NPC |
| courtyard.tmj, grove.tmj | edytowalne JSON Tiled | wyłącznie małe mapy wzorcowe |

Źródła: `assets/source/`; eksport: `apps/client/public/assets/`. PNG można edytować niezależnie od generatora; ponowne generowanie nadpisuje te pliki. Audio wyłączone — brak zaakceptowanych nagrań. Brak fontów zewnętrznych: interfejs używa fontów systemowych.

Tester polecił dalszą budowę przygody z obecnym zestawem. Zgoda na użycie roboczego stylu nie oznacza akceptacji finalnej grafiki; assety nadal są placeholderami.

## Kolorowy pixel art — podgląd 0.1.1

Oryginalne atlasy `assets/design/colorful-world-atlas.png` i `colorful-actors-atlas.png` wygenerowano narzędziem OpenAI image_gen na potrzeby Eldorii. Polecenia opisywały zielony świat fantasy, wyraźne kontury, dachówki i autorskie postacie; nie użyto grafik, map, postaci ani logo Kakele lub innych gier. Inspiracja dotyczy ogólnego kierunku wizualnego. To materiały do oceny, a nie zatwierdzona finalna oprawa. Nie zakupiono zasobów.

Wkład wygenerowany dla właściciela projektu, do edycji i wykorzystania w Eldorii, również komercyjnie, zgodnie z warunkami usługi OpenAI. Nie przypisujemy mu cudzej licencji ani nie deklarujemy wyłączności na stylistykę. Atlasy źródłowe oraz współrzędne wycięć w `assets/design/colorful-atlas.json` pozostają w repozytorium.

| Eksport w styles/colorful/ | Format / użycie |
|---|---|
| tiles.png | 512×32, cztery warianty każdego z czterech terenów; klatki 32×32 |
| wanderer.png | 96×192, cztery kierunki × trzy klatki 32×48 |
| mira.png, oren.png, borin.png | 32×48, odrębne stroje NPC |
| house.png, tree.png, pine.png, well.png, barrel.png | dom, dwa gatunki drzew, studnia i beczka |
| rat.png, beetle.png, wolf.png | stworzenia 32×32 |
| loot.png, flowers.png, rocks.png, sign.png | dodatkowe elementy atlasu; rezerwa do późniejszej aranżacji |

Źródła eksportów: `assets/source/styles/colorful/`; identyczne pliki runtime: `apps/client/public/assets/styles/colorful/`. `npm run assets:import-colorful` wymaga ImageMagick 7 (`magick`) i mechanicznie wycina atlas, normalizuje alfa progiem 50%, dopasowuje nearest-neighbour do natywnych klatek i pakuje PNG bez wygładzania. Nie potrzeba ImageMagick do zwykłego uruchamiania ani budowania gry — eksporty są zapisane w repozytorium. `npm run assets:generate` odtwarza tylko poprzedni zestaw i mapy.

## Animacje 0.1.2

`assets/design/colorful-monsters-atlas.png` — oryginalny atlas chodzących szczurów, żuków i wilków, wygenerowany przez image_gen z trzema wcześniejszymi autorskimi sprite’ami Eldorii jako referencjami. To samo pochodzenie i warunki użycia co powyżej; bez zewnętrznych grafik. Współrzędne w `monsterWalk` w colorful-atlas.json. Importer wycina i pakuje `rat-walk.png`, `beetle-walk.png`, `wolf-walk.png` w obu katalogach source/runtime: 192×32, sześć klatek 32×32 (trzy ujęcia chodu z przodu i trzy z boku). Lewy bok to odbicie prawego; oddzielne ujęcie tyłu pozostaje do dopracowania. Starsze pojedyncze PNG zachowano jako materiały źródłowe.

Miecz, ślad cięcia, pocisk/rozbłysk Iskry i ślady ataku potwora są autorskimi efektami rysowanymi przez Phaser w `apps/client/src/combat-effects.ts`; nie potrzebują zewnętrznych tekstur ani licencji. Krótka poza ataku bohatera korzysta z istniejących klatek postaci wraz z animowanym mieczem; nie jest osobnym nowym spritesheetem uderzenia. Efekty są roboczą animacją do testów. Audio pozostaje wyłączone.

## Oznaczenia szlaku 0.1.3

Trzy oznaczenia miejsc odkryć są autorską prostą grafiką proceduralną w `apps/client/src/main.ts` (Phaser Graphics, natywne piksele). Nazwy i opisy historii napisano dla Eldorii w `packages/content/src/adventure.ts`. Bez zewnętrznych assetów, zakupów i kopiowania cudzych materiałów; grafika oznaczeń pozostaje robocza.
