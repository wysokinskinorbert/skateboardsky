# Film Pixel Analysis — Skateboard Sky

Precyzyjna analiza wizualna 6 keyframe'ów do 1:1 replikacji.
Film: portrait 9:16 (~540×960px logicznych).

---

## 1. FRAME COMPOSITION (proporcje kadru)

### Podział pionowy kadru (keyframe_001, % od góry):

| Zone | Y% od góry | Zawartość |
|------|-----------|-----------|
| Zenith | 0-3% | Prawie czarny indigo sky |
| Planet | 3-14% | Łuk planety z cyan atmosferą |
| Upper sky | 14-22% | CZYSTY głęboki niebieski — BEZ chmur! |
| Cloud band | 22-38% | Pasmo 5-8 chmur cumulus z lukami niebieskiego |
| Horizon/landscape | 38-48% | Daleki krajobraz: miasto, ocean, zielone wzgórza |
| Road mid | 48-65% | Droga biegnąca w dół, barierki, słupy |
| Character | 60-78% | Dziewczyna na deskorolce |
| Near road | 78-100% | Bliski asfalt, trawa, krawędź drogi |

### Kluczowe proporcje:
- **Niebo (sky dome + planeta + chmury):** ~38% kadru
- **Krajobraz daleki:** ~10% kadru
- **Droga + postać:** ~52% kadru
- **Chmury pokrywają:** ~30-40% powierzchni nieba (NIE 100%!)
- **Czyste niebieskie niebo widoczne:** ~60-70% powierzchni nieba

### Film vs nasz render — KRYTYCZNE różnice:
- Film: **PORTRAIT 9:16** — niebo w górnym 38%
- Nasz render: **LANDSCAPE 16:9** — zupełnie inna kompozycja!
- Film: 5-8 odrębnych chmur w paśmie
- Nasz render: 65 chmur rozsianych po całym niebie

---

## 2. SKY GRADIENT — próbki kolorów z filmu

Próbki pobrane z czyistych fragmentów nieba (bez chmur/planety).
Lokalizacja: lewą strona kadru gdzie nie ma chmur.

| Lokalizacja | Y% od góry | Kolor filmowy (szacowany) | Opis |
|-------------|-----------|--------------------------|------|
| Zenith | 1% | #080E35 | Prawie czarny z odcieniem indigo |
| Nad planetą | 4% | #0C1540 | Bardzo ciemny granatowy |
| Obok planety | 10% | #102060 | Ciemny niebieski |
| Nad chmurami | 18% | #1840A0 | Żywy nasycony niebieski (KLUCZOWY!) |
| Między chmurami | 28% | #2050B8 | Jasno-niebieski, nasycony |
| Pod chmurami | 36% | #4080C0 | Jasny niebieski z delikatnym ciepłem |
| Horyzont | 40% | #90A8B0 | Szaro-niebieski (SZYBKIE przejście!) |
| Haze line | 42% | #C8A878 | Ciepły złoto-beżowy |

### Kluczowe obserwacje:
1. **Niebo jest INTENSYWNIE niebieskie** od ~15% do ~36% kadru
2. **Przejście blue→warm jest EKSTREMALNIE szybkie** — 2-3% wysokości kadru
3. **Brak "bladej" strefy** — nie ma pasa kremowego/białego w środku nieba!
4. **Zenith jest BARDZO ciemny** — prawie czarny (#080E35)
5. Niebieskie niebo widoczne przez LUKI między chmurami = ten sam odcień

---

## 3. CHMURY — dokładna analiza

### Ilość i rozmieszczenie (keyframe_001):

| Chmura # | Pozycja X% | Pozycja Y% | Szerokość% | Wysokość% | Typ |
|-----------|-----------|-----------|------------|-----------|-----|
| 1 (HERO) | 15-50% | 20-33% | ~35% | ~13% | Duży cumulus, biały, płaski dół |
| 2 (HERO) | 50-80% | 22-35% | ~30% | ~13% | Duży cumulus, jaśniejszy od słońca |
| 3 | 0-15% | 25-32% | ~15% | ~7% | Mniejszy cumulus, lekko niebieskawy |
| 4 | 80-95% | 28-36% | ~15% | ~8% | Mniejszy, cieplejszy (blisko słońca) |
| 5 | 30-50% | 35-40% | ~20% | ~5% | Niższy, bardziej płaski, haze-affected |
| 6-8 | rozproszone | 30-38% | ~5-10% | ~3-5% | Małe wisps/fragmenty |

### Kluczowe cechy chmur filmowych:
- **5-8 odrębnych chmur** (NIE 65!)
- Skoncentrowane w **paśmie Y: 20-38%** kadru (elevation: ~10°-25°)
- **2 duże hero clouds** zajmujące ~30% szerokości każda
- **Wyraźne luki niebieskiego nieba** między chmurami
- Kształt: **cumulus z płaskim dołem i kopulastą górą**
- Oświetlenie: sun-side jaśniejszy, shadow-side głęboki niebieski-szary
- Spód chmur: ciepły złoto-pomarańczowy (sunset bounce light)
- **NIE MA chmur** powyżej 20% ani poniżej 40% kadru (nad planetą i przy horyzoncie — czysto!)

### Kolory chmur:
- Sunlit top: #F0F0F0 (jasny biały)
- Shadow side: #4060A0 (niebieski-szary)
- Bottom: #A08040 → #806030 (ciepły złoty/pomarańczowy)
- Edge wisps: #C0D8F0 (jasnoniebiesko-biały)

---

## 4. PLANETA — precyzyjne parametry

| Parametr | Wartość filmowa |
|----------|----------------|
| Pozycja Y | Łuk widoczny od 3% do 14% kadru |
| Pozycja X | Wyśrodkowana ~50%, lekko w prawo |
| Widoczna część | Dolny ~20% łuku (cała reszta poza kadrem) |
| Rozmiar łuku | Rozciąga się na ~80% szerokości kadru |
| Kolor ciała | Ciemny granatowo-zielony #1A3858 |
| Atmosfera (rim) | Jasny cyan #60D0FF, BARDZO cienki (1-2px) |
| Przezroczystość | Ciało widoczne ale delikatnie przejrzyste na krawędziach |
| Linia pierścienia | Widoczna cienka linia na ~5% kadru |

---

## 5. SŁOŃCE + LENS FLARE

| Parametr | Wartość filmowa |
|----------|----------------|
| Pozycja | keyframe_001: prawy-dolny (X:85%, Y:42%) |
| Pozycja | keyframe_004-006: lewy (X:10-15%, Y:45%) |
| Rozmiar dysku | Bardzo mały, ~1% kadru |
| Kolor | Jasny ciepły biały → żółty |
| Bloom | Kontrolowany, ~5% kadru wokół słońca |
| Anamorphic streak | Cienka pozioma linia, ~40% szerokości kadru |
| Ghost flares | 3-4 małe kolorowe kółka (blue-violet) |
| Wpływ na niebo | Minimmalny — niebo OBOK słońca jest nadal NIEBIESKIE |

---

## 6. KRAJOBRAZ (horizon stack)

| Element | Y% od góry | Kolor | Uwagi |
|---------|-----------|-------|-------|
| Daleki ocean/bay | 38-42% | #186878 → #082840 | Ciemny turkusowy |
| Miasto w dolinie | 40-44% | #3A3828, drobne sylwetki | Małe, nie dominujące |
| Zielone wzgórza | 42-52% | #2E6028 → #3C8835 | Jasna zieleń, nasycona |
| Droga serpentyna | 44-100% | #585858 szary asfalt | Kręta, żółta linia |

---

## 7. CRITICAL DELTAS: NASZ RENDER vs FILM

| Element | Film | Nasz render | Priorytet fix |
|---------|------|-------------|---------------|
| Ilość chmur | 5-8 | 65 (45+20) | **KRYTYCZNY** |
| Rozmieszczenie chmur | Pasmo 20-38% Y | Cały sky dome | **KRYTYCZNY** |
| Pokrycie chmurami | ~35% nieba | ~85%+ nieba | **KRYTYCZNY** |
| Czyste niebieskie niebo | 65% nieba | ~15% nieba | **KRYTYCZNY** |
| Orientacja kadru | Portrait 9:16 | Landscape 16:9 | WYSOKI |
| Niebieskie niebo kolor | #1840A0 vivid | Washed/pale | WYSOKI |
| Ciepła strefa horyzontu | 2-3% kadru | ~15% kadru | WYSOKI |
| Bloom słońca | Mały, ~5% kadru | Duży, ~20% kadru | ŚREDNI |
| Lens flare | Cienki streak | Ciut za szeroki | ŚREDNI |
