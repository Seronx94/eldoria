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

## Zestaw miejski 0.1.4

`assets/design/town-atlas.png` — oryginalny atlas wygenerowany przez OpenAI image_gen dla Eldorii z własnym `colorful-world-atlas.png` jako referencją. Bruk, posadzki, ściany, dachówki, drzwi, meble, stragany i fontanna; nie wykorzystano map, sprite’ów ani innych materiałów Tibii/Thais. Te same warunki użycia co kolorowego zestawu powyżej: materiał dla właściciela projektu, do edycji i wykorzystania w Eldorii zgodnie z warunkami OpenAI, bez deklaracji wyłączności i bez zakupów. Oprawa miejska jest robocza, do oceny testera.

Manifest wycięć i natywnych rozmiarów: `assets/design/town-atlas.json`. `npm run assets:import-town` wymaga ImageMagick 7; mechaniczne wycięcia, próg alfa 50%, nearest-neighbour i usunięcie metadanych. Eksporty `assets/source/town/*.png` oraz identyczne `apps/client/public/assets/town/*.png` są zapisane w repozytorium; uruchomienie i build nie wymagają ImageMagick. Kafelki 32×32, meble i dekoracje w natywnych wielokrotnościach pikseli, skalowanie świata całkowite.

Układ Vareon, nazwy budynków i plan SVG napisano dla Eldorii. Edytowalne źródło Tiled: `assets/source/vareon.tmj`, odtwarzalne polecenie `npm run maps:generate-town`. Warstwy CityGround/CityWalls mają osadzone kolekcje tilesetów; Buildings opisuje bryły i wejścia, TownProps — meble i ich footprint. Generator podstawowych assetów również odtwarza nowy układ miasta; nie generuje atlasu image_gen.

## Ikony akcji 0.1.5

Autorskie sześć ikon SVG na siatce 32×32 w `apps/client/src/action-icons.ts`: cel, miecz, płomień Iskry, flakon mikstury, sakiewka łupu i przejście. Narysowane z prostych ścieżek dla Eldorii; bez zewnętrznych assetów, zakupów lub kopiowania ikon Kakele/Tibii. Renderowane bez filtrowania tekstur, z shape-rendering crispEdges; podpisy przycisków pozostają dostępne. Gałka jest oryginalną grafiką CSS w style.css. Materiały robocze do oceny testera, na tych samych zasadach wkładu Codexa dla projektu jak powyżej.

## Ciągły świat 0.1.6

`assets/source/eldoria.tmj` i identyczny eksport `apps/client/public/assets/eldoria.json` — autorski układ 64×112, łączący własne Vareon i las drogą przez północną bramę. `scripts/generate-world.mjs` odtwarza połączenie ze źródeł lokalnych; Regions opisuje miasto i las oraz ochronę miasta. Wszystkie obrazy pozostają z istniejących własnych atlasów. Nie skopiowano mapy Tibii ani żadnych zewnętrznych materiałów; nowy układ pozostaje do oceny testera.

## Efekty i dachy 0.1.7

Krąg rzucania Iskry, orbitujące iskry, kalenice i cieniowanie połaci są autorskimi rysunkami proceduralnymi w `combat-effects.ts` oraz `town-view.ts`, korzystającymi z istniejących materiałów Eldorii. Nie importowano zewnętrznych assetów ani materiałów Tibii/Kakele. Na tych samych zasadach wkładu Codexa dla projektu; oprawa czeka na ocenę testera.
