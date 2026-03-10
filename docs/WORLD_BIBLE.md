# Skateboard Sky — World Bible

> **Single Source of Truth** dla wyglądu, parametrów i zachowania każdego elementu świata gry.
> Nadrzędna referencja: film (`docs/ssstwitter.com_1772994588112.mp4`) + 34 klatki (`docs/frames/frame_001..034.png`) + 6 keyframe'ów (`docs/keyframe_001..006_*.png`).
> Aktualizuj ten dokument przy każdym nowym odkryciu lub zmianie parametrów.

---

## 1. Architektura sceny

### Kolejność renderowania (renderOrder)
| Order | Warstwa | Komponent |
|-------|---------|-----------|
| 0 | Sky Dome | `SkyDome` — odwrócona sfera r=900 |
| 1 | Back Clouds | `CloudLayer layer="back"` — 16 billboard cards |
| 2 | Planet + Ring | `Planet` — sfera r=700 + torus ring |
| 3 | Front Clouds | `CloudLayer layer="front"` — 35 billboard cards |
| 3 | Ocean | `OceanPlane` — płaski quad z shaderem fal |
| 3 | Coastline | `Coastline` — linia piany przy brzegu |
| 4 | Horizon layers | `MountainRidge` × 3, `CitySilhouette`, `HazeVeil` |
| 4 | Terrain | `Terrain` — 3 TerrainPlane (base + 2 slopes) |
| 5 | Road | `Road` — ribbon mesh wzdłuż spline |
| 5 | Vegetation | `TreeBillboard` — billboard quads z alpha test |
| 6 | Road Props | `UtilityPole`, `PowerLines`, `Guardrail`, `StreetLamp` |
| 7 | Sakura Petals | `SakuraPetals` — InstancedMesh 200 szt. |

### Hierarchia komponentów
```
<Canvas>
  <CameraSetup />
  <SkyDome />
  <CloudLayer layer="back" />
  <Planet />
  <CloudLayer layer="front" />
  <HorizonStack />
    ├── OceanPlane
    ├── MountainRidge × 3
    ├── CitySilhouette
    ├── Coastline
    └── HazeVeil
  <Terrain />
  <Vegetation />
  <Road />
  <RoadProps />
  <SakuraPetals />
  <PostProcessingStack />
    ├── Bloom
    ├── LensFlare
    ├── GodRays
    ├── AtmosphericHaze
    ├── ToneMapping (NEUTRAL)
    └── ColorGrading
  <ambientLight />
  <directionalLight />
</Canvas>
```

---

## 2. Niebo (Sky Dome)

### Referencja filmowa
- Niebo zajmuje **55-70% kadru** (zależy od klatki).
- Gradient: głęboki indygo u zenitu → bogaty niebieski → ciepły złoto-bursztynowy horyzont.
- Sun glow sprawia wrażenie "golden hour" — ~18° nad horyzontem.
- Ciepłe światło rozlewa się w dolnej 1/3 nieba blisko słońca.
- Referencyjne klatki: **frame_001** (pełna panorama), **frame_015** (jasne niebo).

### Implementacja: `src/sky/SkyDome.tsx` + `src/sky/ShinkaiSkyMaterial.ts`
- Odwrócona sfera (BackSide) r=900, 64×64 segmentów.
- Custom GLSL shader z 5-stopniowym gradientem + sun glow.

### Paleta kolorów nieba
| Strefa | Kolor | HEX | Pozycja (elevation) |
|--------|-------|-----|---------------------|
| Zenith | Ciemny indygo | `#1E3878` | 0.80+ |
| Upper | Królewski niebieski | `#244098` | 0.30–0.80 |
| Mid | Jasny nasycony niebieski | `#3570C0` | 0.08–0.35 |
| Horizon | Ciepły złocisty | `#D89048` | 0.02–0.10 |
| Haze | Bladozłoty | `#F0D8B0` | 0.00–0.015 |
| Sun | Ciepły biały HDR | `#FFF8E0` | — (procedural glow) |

### Parametry słońca
| Parametr | Wartość | Opis |
|----------|---------|------|
| `sunAzimuth` | `π × 0.9` (162°) | Prawo od centrum, widoczny w FOV |
| `sunElevation` | `π × 0.10` (~18°) | Golden hour, nisko nad horyzontem |
| `sunIntensity` (sky shader) | `1.8` | Kontrolowany — SunDisc mesh zapewnia główny glow |
| Sun disc power | `512.0` | Ostry, jasny dysk |
| Sun glow power | `128.0` | Ciasna poświata |
| Sun halo power | `20.0` | Subtelne halo |

### Znane odchylenia od filmu
- ~~Gradient zenith-to-upper za jasny~~ → **NAPRAWIONO** (v8): widoczny deep indigo-blue po post-processing.
- **Sun warm bleed** wzmocniony (pow 3, extends to 45% elevation), ale mógłby być bardziej złocisty.
- **Sun bloom** wciąż ~2x większy niż w filmie — wymaga dalszej redukcji lub anisotropowego bloom.

---

## 3. Słońce (Sun Disc)

### Referencja filmowa
- Jasna, wyraźna tarcza słoneczna po prawej stronie kadru.
- Generuje intensywny bloom i anamorficzny lens flare.
- W filmie słońce jest częściowo przysłaniane chmurami (okluzja zmienia się w czasie).

### Implementacja: zintegrowane w `ShinkaiSkyMaterial` (sun glow) + `src/sky/SunDisc.tsx` (mesh)
| Parametr | Wartość |
|----------|---------|
| Kolor | `#FFF8E7` |
| Emission intensity | `2.2` (HDR, tight bloom) |
| Radius | `7` |
| Color | `#FFF0D0` (ciepły złocisty) |
| Distance | `450` (na surface sky dome) |

---

## 4. Planeta

### Referencja filmowa
- **Gigantyczny łuk** w górnej 1/3 kadru — widoczne ~25% sfery (dolna krawędź).
- Kolor ciała: ciemny teal/morski z subtelną teksturą powierzchni.
- Jaskrawa cyan atmosfera (rim glow) — bardzo cienka, wyraźna krawędź.
- Cienki pierścień planetarny (lekko przechylony), bladocyan, additive blending.
- Planeta siedzi **MIĘDZY warstwami chmur**: back clouds → planet → front clouds.
- Referencyjne klatki: **frame_001**, **frame_005**, **frame_010** (wyraźny łuk).

### Implementacja: `src/sky/Planet.tsx` + `src/sky/PlanetMaterial.ts`
| Parametr | Wartość | Opis |
|----------|---------|------|
| Position | `[30, 1050, -750]` | Bardzo wysoko — widoczny tylko dolny łuk |
| Radius | `650` | Duży ale pozycja sprawia że widać ~15% sfery |
| Body color | `#1A4060` | Ciemny teal |
| Atmosphere color | `#70D8FF` | Żywy cyan |
| Atmosphere intensity | `1.2` | Subtile rim glow (film: bardzo cienki) |
| Atmosphere scale | `1.025` | Bardzo cienka warstwa |
| Ring color | `#90E0FF` | Bladocyan |
| Ring intensity | `1.5` | HDR |
| Ring torus radius | `radius × 1.25` | Poza ciałem planety |
| Ring rotation | `[0.3, 0.1, 0.15]` | Lekko przechylony |

### Znane odchylenia
- ~~Rim glow za jasny/grubby~~ → **NAPRAWIONO** (v8): rimGlow pow(10), softGlow pow(4), intensity 1.2.
- ~~Planet body zbyt ciemna masa~~ → **NAPRAWIONO** (v8): repositioned [30,1050,-750] r=650, body `#1A3858`.
- Pierścień opacity zmniejszony do 0.35 (z 0.7) — bliżej filmu.

---

## 5. Chmury (Cloud System)

### Referencja filmowa
- **15-20+ indywidualnych chmur** cumulus na różnych głębokościach.
- Silne oświetlenie kierunkowe — lewa strona ciemna (cień `#616A9F`), prawa jasna (słoneczna).
- Chmury hero (masywne) dominują środek i prawą stronę kadru.
- Back clouds: mgiełkowe, rozmyte, bluish haze.
- Front clouds: żywe, ostre krawędzie, jasno białe.
- Krawędzie chmur podświetlone złotym backlightem od słońca.
- Chmury powoli dryfują i zmieniają kształt (morphing krawędzi).
- Dolne partie chmur ciemniejsze, płaskie (cumulonimbus base).
- Referencyjne klatki: **frame_001** (pełna panorama), **frame_020** (intensywne chmury), **frame_034** (sakura + chmury).

### Back Cloud Layer
| Parametr | Wartość |
|----------|---------|
| Count | `16` |
| Distance range | `500–750` |
| Scale range | `50–120` |
| Elevation range | `0.04–0.25` rad |
| Azimuth spread | `π × 0.35` (±63°) |
| Tint | `#C0D8F0` (jasnobłękitno-biały) |
| Opacity | `0.5` |
| Backlight strength | `0.5` |
| Drift multiplier | `0.4` (wolniejszy = głębokość) |

### Front Cloud Layer
| Parametr | Wartość |
|----------|---------|
| Count | `35` |
| Distance range | `200–550` |
| Scale range | `60–220` (hero clouds do 220!) |
| Elevation range | `-0.03–0.30` rad |
| Azimuth spread | `π × 0.45` (±81°) |
| Tint | `#FFFFFF` (czysty biały) |
| Opacity | `0.92` |
| Backlight strength | `1.2` |
| Drift multiplier | `1.0` |

### Shader chmur (CloudCardMaterial)
- 5-oktawowy FBM noise z domain warping.
- Time-based shape evolution: `uTime * 0.008` offset dodawany do noise coords.
- Variable density: cienkie części półprzezroczyste.
- Edge wisps: high-freq noise na granicach kształtu chmury.
- Cień chmury: `vec3(0.38, 0.42, 0.62)` — ciemny niebieskoszary.
- Oświetlona strona: `vec3(1.0, 1.0, 1.0)` — czysta biel.
- Warm horizon bounce: `vec3(0.15, 0.08, 0.02)` na dolnych partiach.
- Sun backlight: `#FFE8C0` na krawędziach.

### Animacja
| Efekt | Speed | Opis |
|-------|-------|------|
| Drift (pozycja) | `0.02 × multiplier` | Sinusoida, unikalna faza per cloud |
| Shape morph | `uTime * 0.008` | Powolna ewolucja krawędzi FBM |
| Drift X amplitude | `scale × 0.3` | Większe chmury dryfują dalej |
| Drift Y amplitude | `scale × 0.08` | Subtelny ruch pionowy |

### Znane odchylenia
- Chmury mogą nie mieć wystarczająco kontrastowych cieni (film ma bardzo ciemne spody).
- Brakuje "god-ray-like" promieni przebijających między chmurami (częściowo GodRays effect pokrywa to).
- Hero clouds mogą potrzebować indywidualnego tuning'u pozycji — w filmie konkretne chmury tworzą dramatyczną kompozycję.

---

## 6. Horizon Stack

### Referencja filmowa
- Widoczne warstwy głębi od bliskiej do dalekiej: zielone wzgórza → miasto w dolinie → ocean/zatoka → grzbiety gór → mgła horyzontalna.
- Atmosferyczna perspektywa: dalsze warstwy bardziej blade i niebieskie.
- Miasto jest ciepłe/bursztynowe (warm haze) — nie chłodne.
- Ocean lśni od słońca — shimmer na powierzchni wody.
- Linia brzegowa: cienka biała piana.
- Referencyjne klatki: **frame_001**, **frame_005** (pełna głębia).

### 6.1 Ocean (OceanPlane)
| Parametr | Wartość |
|----------|---------|
| Position | `[0, -18, -160]` |
| Rotation | `[-π/2, 0, 0]` (płaski, lying) |
| Size | `900 × 550` |
| Shallow color | `#30A8C0` |
| Deep color | `#105878` |
| Haze color | `#80AAC0` |
| Wave shimmer | 2 warstwy noise (speed 0.3 i 0.2) |
| Sun specular | `pow(noise, 3.0) × 0.12` |
| Distance haze | `exp(-dist × 0.0008)`, 70% mix |

### 6.2 Mountain Ridges (×3)
| # | Position | Scale | Color | Haze |
|---|----------|-------|-------|------|
| 1 (near) | `[-40, -8, -220]` | `[500, 85, 1]` | `#162E45` | 0.20 |
| 2 (mid) | `[30, -6, -290]` | `[550, 70, 1]` | `#223E58` | 0.35 |
| 3 (far) | `[-15, -9, -370]` | `[650, 55, 1]` | `#305068` | 0.50 |

- Kształt: proceduralny noise (3 oktawy) generuje sylwetkę grzbietu.
- Haze color: `#B8D0E0` (chłodny niebieskawy).
- Edge fade: smoothstep na krawędziach (0–0.1 i 0.9–1.0).

### 6.3 City Silhouette
| Parametr | Wartość |
|----------|---------|
| Position | `[-5, -9, -170]` |
| Scale | `[420, 50, 1]` |
| Building color | `#3A3828` (ciepły ciemnobrązowy) |
| Haze color | `#A09878` (ciepły beżowy) |
| Haze mix | `0.35` |
| Columns | `floor(vUv.x × 80)` = 80 kolumn budynków |
| Tall buildings | 20% szansa, +0.25 wysokości |
| Window brightness | `0.08` luminancja, 60% szansa na zapalenie |
| Cluster gaps | `hash(floor(col/5) × 7.77)` > 0.3 |
| Edge fade | Wide: 0–0.2 i 0.8–1.0 |

### 6.4 Coastline
| Parametr | Wartość |
|----------|---------|
| Position | `[0, -16.5, -120]` |
| Rotation | `[-π/2, 0, 0]` |
| Size | `600 × 15` |
| Foam color | `#E0E8F0` |
| Shore color | `#80A0B0` |
| Foam alpha | `0.6` max |

### 6.5 Haze Veil
| Parametr | Wartość |
|----------|---------|
| Position | `[0, -6, -520]` |
| Size | `1400 × 80` |
| Warm color | `#D0A068` (złocisty) |
| Cool color | `#6888A8` (chłodny niebieski) |
| Max alpha | `0.45` |
| Gradient | Ciepły dół → chłodna góra |

---

## 7. Teren (Terrain)

### Referencja filmowa
- Zielone, bujne wzgórza opadające od drogi w dół do doliny.
- Trawa w 2 odcieniach: jasna (`#40A835`) i ciemna (`#2A7A22`).
- Cienie chmur przesuwają się po wzgórzach (duże, miękkie plamy).
- Perspektywa atmosferyczna: dalszy teren blaknie do chłodnego niebieskiego.
- Referencyjne klatki: **frame_004** (wyraźna zieleń), **frame_015** (zbocza).

### Implementacja: `src/world/Terrain.tsx`
| Element | Position | Rotation | Size | Fade |
|---------|----------|----------|------|------|
| Base ground | `[0, 21, 0]` | `[-π/2, 0, 0]` | `50 × 70` | edges |
| Left hillside | `[-42, 2, -50]` | `[-π/2, 0, -0.52]` | `80 × 280` | right |
| Right hillside | `[42, 2, -50]` | `[-π/2, 0, 0.52]` | `80 × 280` | left |

### Shader terenu
| Efekt | Parametry |
|-------|-----------|
| Grass noise | 2 warstwy: `worldUv × 3.0` (macro) + `× 9.0` (detail) |
| Cloud shadows | 2 warstwy noise: `worldPos × 0.008 + time` |
| Shadow darkness | `color × 0.65 × vec3(0.90, 0.95, 1.0)` |
| Sun-facing boost | `+vec3(0.04, 0.02, 0.0)` |
| Distance haze | smoothstep 80–450, `vec3(0.45, 0.58, 0.68)`, 50% mix |
| Slope angle | `0.52` rad (~30°) |

### Znane odchylenia
- Teren jest płaski (planeGeometry) — brak 3D undulacji jak w filmie.
- W filmie widoczne pojedyncze krzewy i trawa na zboczach — brak drobnej roślinności.
- Granica terenu z oceanem nie jest wystarczająco naturalna.

---

## 8. Droga (Road)

### Referencja filmowa
- Szary asfalt z żółtą linią środkową (dashed).
- Kręta serpentyna biegnąca z góry w dół zbocza.
- Bankowanie w zakrętach (road tilt).
- Cień postaci pada na drogę.
- Dalsza część drogi blaknie w atmosferycznej mgle.
- Referencyjne klatki: **frame_001** (pełna serpentyna), **frame_010** (bliższy widok).

### Implementacja: `src/world/Road.tsx` + `src/world/RoadMaterial.ts`
| Parametr | Wartość |
|----------|---------|
| Width | `10` units |
| Segments | `200` |
| Cross-segments | `4` |
| Bank angle max | `~8°` (0.14 rad) |
| Y offset | `+0.15` (nad terenem) |
| Polygon offset | `-2` (zapobiega z-fighting) |

### Spline Control Points
```
[ 0,  28,   5]   ← start (pod kamerą)
[ 0,  27, -10]   ← prosta na wjazd
[-15, 22, -40]   ← zakręt w lewo, zjazd
[-22, 15, -70]   ← stromy zjazd do pierwszej doliny
[ 6,  22, -95]   ← switchback w prawo — WZNIESIENIE +7
[22,  14,-125]   ← kontynuacja w prawo, zjazd
[-3,  10,-155]   ← przejście
[-18,  5,-190]   ← zakręt w lewo, niski punkt
[-10,  9,-220]   ← lekkie WZNIESIENIE (drugi grzbiet)
[10,   2,-255]   ← węższy switchback w prawo
[-5,  -2,-295]   ← łagodny zakręt w lewo
[ 0,  -8,-340]   ← koniec — zanika w mgle
```

### Shader drogi
- Kolor asfaltu: ciemnoszary z noise'em (rysy, plamy).
- Żółta linia: dashed center line (UV-based).
- Krawędzie drogi: białe linie lub fade.
- Atmosferyczna perspektywa: dalsze odcinki blakną.

### Znane odchylenia
- Brakuje wyraźnych białych linii krawędziowych (w filmie widoczne).
- Asfalt może być zbyt jednolity — film ma wyraźne plamy i teksturę.

---

## 9. Elementy drogowe (Road Props)

### Referencja filmowa
- **Słupy telegraficzne/energetyczne**: drewniane, z belką poprzeczną i izolatorami, po prawej stronie drogi.
- **Linie energetyczne**: 4 druty biegnące między słupami, z catenarynym ugięciem.
- **Barierki**: metalowe W-beam po zewnętrznej stronie zakrętów.
- **Lampy uliczne**: po lewej stronie drogi, z ramieniem nad jezdnią.
- Widoczne od **frame_015** (słupy), **frame_025** (wyraźne druty).

### 9.1 Utility Poles
| Parametr | Wartość |
|----------|---------|
| Spacing | co `35m` wzdłuż drogi |
| Side | prawa strona, offset `ROAD.width × 0.7` |
| Post height | `10` (cylinder r=0.12/0.15) |
| Post color | `#3A2A1A` (ciemne drewno) |
| Cross-arm | `3.5 × 0.12 × 0.12`, kolor `#4A3828` |
| Insulators | 4 szt., r=0.06, kolor `#C0C8C0` |

### 9.2 Power Lines
| Parametr | Wartość |
|----------|---------|
| Wire count | 4 (offsets: -1.4, -0.5, 0.5, 1.4) |
| Wire radius | `0.025` (TubeGeometry) |
| Catenary sag | `-1.2` units w punkcie środkowym |
| Color | `#1A1A1A`, metalness 0.6 |

### 9.3 Guardrails (W-beam)
| Parametr | Wartość |
|----------|---------|
| Trigger | curvature > `2.5` |
| Side | zewnętrzna strona zakrętu |
| Beam height | `0.65` |
| Beam thickness | `0.03` (TubeGeometry radius) |
| Beam color | `#A0A8A8`, metalness 0.8 |
| Post spacing | `3.0m` |
| Post size | `0.06 × 0.7 × 0.06` |
| Post color | `#707878`, metalness 0.6 |

### 9.4 Street Lamps
| Parametr | Wartość |
|----------|---------|
| Spacing | co `55m` |
| Side | lewa strona, offset `ROAD.width × 0.6` |
| Pole height | `5` (cylinder r=0.06/0.08) |
| Color | `#505858`, metalness 0.6 |
| Lamp housing | `0.3 × 0.12 × 0.18`, emissive `#C8B888` |

---

## 10. Roślinność (Vegetation)

### Referencja filmowa
- **Drzewa zielone**: liściaste, po obu stronach drogi, bujne okrągłe korony.
- **Drzewa sakura (wiśnia)**: różowe kwitnące, pojawiają się od ~frame_025 (8.3s).
- Proporcja: ~40% sakura, ~60% zielone w strefie sakura.
- Drzewa tymczasowo blokują widok (parallax).
- Billboard (always face camera).
- Referencyjne klatki: **frame_025–034** (sakura wyraźnie widoczne).

### Hero Sakura Trees (ręcznie ustawione)
| # | Position | Scale |
|---|----------|-------|
| 1 | `[-14, 20, -6]` | `6.0` |
| 2 | `[16, 19.5, -12]` | `5.5` |
| 3 | `[-20, 17, -28]` | `7.0` |
| 4 | `[22, 15, -42]` | `5.0` |
| 5 | `[-12, 13, -58]` | `6.5` |
| 6 | `[18, 11, -75]` | `6.0` |

### Generated Trees
| Parametr | Wartość |
|----------|---------|
| Spacing | `6–14m` pseudo-random |
| Side offset | `ROAD.width × (0.8 + hash × 1.5)` |
| Base scale | `4 + hash × 5` |
| Height variation | `0.7–1.3×` |
| Billboard aspect | `[scale, scale × 1.3, 1]` |

### Kolory liści
| Typ | Primary | Secondary |
|-----|---------|-----------|
| Green | `#2A5828` (ciemna zieleń) | `#3A7838` (jasna zieleń) |
| Sakura | `#D8A0A8` (pastelowy róż) | `#F0C8D0` (jasny róż) |
| Trunk | `#5A4030` (brąz) | — |

### Shader drzew
- Foliage: proceduralny blob (noise na krawędziach).
- Trunk: cienka pionowa linia (width 0.035).
- Sakura: więcej noise (0.35) na krawędziach = "petal clusters".
- Green: mniej noise (0.25) = gładsze korony.
- Sunlit side: `+0.15` brightness po prawej stronie.
- Internal shadow: `0.85 + smoothstep × 0.2`.
- Distance haze: `exp(-dist × 0.002)`, 50% mix, `vec3(0.55, 0.65, 0.75)`.

### Znane odchylenia
- Drzewa są flat billboard — w filmie mają objętość i cienie.
- Sakura w filmie ma wyraźne pojedyncze płatki na krawędziach — obecny shader jest zbyt gładki.
- Brakuje stref biome'owych: sakura pojawia się dopiero w dalszej części trasy (frame_025+).

---

## 11. Płatki sakury (Sakura Petals)

### Referencja filmowa
- Różowe płatki unoszące się w powietrzu, opóźnione spadanie.
- Widoczne głównie w strefie sakura (frame_025+).
- Delikatne, niewielkie — efekt poetycki, nie dominujący.
- Referencyjne klatki: **frame_030–034** (wyraźne płatki).

### Implementacja: `src/world/SakuraPetals.tsx`
| Parametr | Wartość |
|----------|---------|
| Count | `200` (InstancedMesh, 1 draw call) |
| Spread | `[-80, 80] × [0, 30] × [-50, -150]` |
| Fall speed | `0.6–1.4` (random per petal) |
| Drift | sinusoida, amplitude `3–6`, freq `0.5` |
| Rotation | `sin(time × rotSpeed)` |
| Petal size | `0.15–0.35` |
| Color gradient | `#E8A0B0` → `#F8D0D8` |
| Distance fade | `80–160` units |
| Y wrap | pętla: gdy y < -5, reset na y+35 |

### Znane odchylenia
- Płatki powinny reagować na "wiatr" od prędkości postaci (brak fizyki postaci).
- W filmie płatki mają wyraźniejszy kształt (5-listkowy) — obecne to elipsy.

---

## 12. Post-Processing

### Referencja filmowa
- Silny bloom na słońcu i jasnych krawędziach chmur.
- Anamorficzny lens flare: pozioma smuga przez słońce + ghost flares.
- God rays: promienie przebijające przez chmury.
- Ciepłe kolory, nasycone barwy, kinematyczny kontrast.
- Delikatna winieta na krawędziach kadru.

### 12.1 Bloom
| Parametr | Wartość |
|----------|---------|
| Intensity | `0.6` |
| Threshold | `1.8` (tight — only strong HDR) |
| Smoothing | `0.3` |
| Radius | `0.5` |
| Mipmap blur | `true` |

### 12.2 Lens Flare (`LensFlare.tsx`)
- Screen-space effect, sun position projected per frame.
- **Anamorphic streak**: horizontal, `exp(-deltaY² × 12000)` vertical, `exp(-deltaX² × 1.8)` horizontal.
- Streak color: gold center `vec3(1.0, 0.88, 0.55)` → blue edges `vec3(0.45, 0.55, 0.9)`.
- **Sun halo**: slightly anamorphic `vec2(1.5, 1.0)`, `exp(-dist² × 25)`.
- **Ghost flares**: 4 szt., mirrored through screen center.
- Ghost colors: blue `vec3(0.3, 0.45, 1.0)` → purple `vec3(0.6, 0.3, 0.85)`.
- **Cloud occlusion**: `0.3 + 0.7 × smoothstep(sin(t × 0.12) + sin(t × 0.07))`.
- **Edge fade**: marginesy 15% na krawędziach ekranu.

### 12.3 God Rays (`GodRays.tsx`)
| Parametr | Wartość |
|----------|---------|
| Samples | `32` |
| Decay | `0.97` |
| Weight | `0.15` |
| Luminance threshold | `0.5` |
| Color | `vec3(1.0, 0.88, 0.60)` (złocisty) |
| Intensity | `0.25` (gdy słońce widoczne) |

### 12.4 Atmospheric Haze (`AtmosphericHaze.tsx`)
- Depth-based fog z color grading.
- Chłodny niebieski w cieniach, ciepły w highlights.

### 12.5 Tone Mapping
| Mode | `NEUTRAL` (postprocessing) |
|------|---------------------------|
| Renderer | `NoToneMapping` (wyłączony) |
| Exposure | `1.0` |

### 12.6 Color Grading (`ColorGrading.tsx`)
| Parametr | Wartość |
|----------|---------|
| Brightness | `+0.03` |
| Contrast | `+0.22` (reduced to preserve dark blues at zenith) |
| Saturation | `+0.45` |
| Vignette offset | `0.30` |
| Vignette darkness | `0.35` (gentle — film has subtle vignette) |

---

## 13. Oświetlenie

### Ambient Light
| Parametr | Wartość |
|----------|---------|
| Intensity | `0.4` |
| Color | `#8090C0` (chłodny niebieski) |

### Directional Light (słońce)
| Parametr | Wartość |
|----------|---------|
| Intensity | `1.2` |
| Color | `#FFE0B0` (ciepły złoty) |
| Direction | obliczone z `SKY.sunAzimuth` + `SKY.sunElevation` |

---

## 14. Kamera

### Referencja filmowa
- Za plecami postaci, lekko powyżej.
- ~55% nieba, ~45% ziemi w kadrze.
- FOV dość szeroki (~72°) — panoramiczny efekt.
- Kamera lekko podąża za postacią (future: Cinemachine-like follow).

### Implementacja: `src/game/CameraSetup.tsx`
| Parametr | Wartość |
|----------|---------|
| FOV | `72°` |
| Near | `0.1` |
| Far | `2000` |
| Position | `[0, 33, 8]` |
| LookAt | `[0, 27, -30]` |

---

## 15. Postać (Character) — DO ZAIMPLEMENTOWANIA

### Referencja filmowa
- Młoda dziewczyna w stylu anime.
- Biała bluzka, ciemna spódniczka/szorty, plecak.
- Ciemne, długie włosy powiewające na wietrze.
- Stoi na deskorolce.

### Stany animacji (z analizy klatek)
| Klatki | Stan | Opis |
|--------|------|------|
| 1–5 | idle/start | Stoi prosto, dopiero rusza |
| 6–12 | crouch | Przysiad, niski środek ciężkości |
| 13–20 | normal ride | Wyprostowana, stabilna jazda |
| 21–28 | arms_spread | Ramiona rozłożone na boki (wolność) |
| 29–32 | transition | Przejście do triumfu |
| 33–34 | triumph | Ręka uniesiona w górę |

### Fizyka (przyszłość)
- Grawitacja na zboczu: `F = mg × sin(θ)`
- Tarcie: współczynnik × normal force
- Max speed: ~40-50 km/h (drag = gravity plateau)
- Zakręty: centripetal force + lean

---

## 16. Strefy biome'owe (wzdłuż road spline)

Na podstawie analizy klatek — świat zmienia się wzdłuż trasy:

| Strefa | Road t | Klatki | Roślinność | Props |
|--------|--------|--------|------------|-------|
| Start (grzbiet) | 0.0–0.15 | 1–5 | Niska trawa | Mało |
| Zielone wzgórza | 0.15–0.45 | 5–15 | Zielone drzewa, trawa | Słupy, barierki |
| Transition | 0.45–0.65 | 15–25 | Mix zielone + sakura | Słupy, lampy |
| Sakura valley | 0.65–0.90 | 25–32 | Sakura dominuje, płatki | Barierki, lampy |
| Haze fadeout | 0.90–1.0 | 32–34 | Zanika w mgle | Brak |

**WAŻNE**: Sakura NIE pojawia się na początku trasy! Tylko od ~frame_025 (t ≈ 0.65).

---

## 17. Paleta kolorów — Master Reference

### Niebo
| Element | HEX | Uwagi |
|---------|-----|-------|
| Zenith | `#1E3570` | Ciemny granat, prawie czarny w filmie |
| Upper sky | `#203888` | Królewski niebieski |
| Mid sky | `#2860A8` | Nasycony niebieski |
| Horizon | `#C07838` | Ciepły bursztyn/złoty |
| Haze | `#F0D8B0` | Bladozłoty, ciepły |
| Sun disc | `#FFF8E0` | HDR biały-złoty |
| Sun backlight | `#FFE8C0` | Ciepły złoty na chmurach |

### Chmury
| Element | HEX |
|---------|-----|
| Lit side | `#FFFFFF` |
| Shadow side | `#616A9F` (shader: `0.38, 0.42, 0.62`) |
| Back layer tint | `#C0D8F0` |
| Warm bounce | `rgb(0.15, 0.08, 0.02)` added |

### Planeta
| Element | HEX |
|---------|-----|
| Body | `#1A4060` |
| Atmosphere rim | `#70D8FF` |
| Ring | `#90E0FF` |

### Teren i roślinność
| Element | HEX |
|---------|-----|
| Grass (light) | `#40A835` |
| Grass (dark) | `#2A7A22` |
| Terrain haze | `rgb(0.45, 0.58, 0.68)` |
| Green tree primary | `#2A5828` |
| Green tree secondary | `#3A7838` |
| Sakura primary | `#D8A0A8` |
| Sakura secondary | `#F0C8D0` |
| Tree trunk | `#5A4030` |
| Sakura petal | `#E8A0B0` → `#F8D0D8` |

### Ocean i brzeg
| Element | HEX |
|---------|-----|
| Shallow water | `#30A8C0` |
| Deep water | `#105878` |
| Water haze | `#80AAC0` |
| Coastline foam | `#E0E8F0` |
| Shore color | `#80A0B0` |

### Horizon
| Element | HEX |
|---------|-----|
| Mountain ridge near | `#162E45` |
| Mountain ridge mid | `#223E58` |
| Mountain ridge far | `#305068` |
| Ridge haze | `#B8D0E0` |
| City buildings | `#3A3828` |
| City haze | `#A09878` |
| Warm haze veil | `#D0A068` |
| Cool haze veil | `#6888A8` |

### Droga
| Element | HEX |
|---------|-----|
| Asphalt (base) | ~`#4A4A50` (z noise) |
| Center line | żółty |
| Utility pole wood | `#3A2A1A` |
| Guardrail metal | `#A0A8A8` |

### Oświetlenie
| Element | HEX |
|---------|-----|
| Ambient fill | `#8090C0` |
| Directional sun | `#FFE0B0` |
| Shadow color (split tone) | `#2A4080` |
| Highlight color (split tone) | `#F0C060` |

---

## 18. Znane problemy i kolejne kroki (pixel-perfect)

### Krytyczne odchylenia od filmu
1. ~~Zenith nieba za ciemny/brązowy~~ → **NAPRAWIONO** (v8): planet repositioned + sky colors brightened.
2. **Chmury za jednolite** — film ma wyraźne hero clouds w specyficznych pozycjach tworzących kompozycję.
3. ~~Brak stref biome'owych~~ → **NAPRAWIONO** (v8): sakura only from t > 0.60.
4. **Teren zbyt prosty** — flat planes zamiast 3D undulacji.
5. **Brakuje drobnej roślinności** — krzewy, trawa, mchy na zboczach.
6. ~~Planet rim glow za grubby~~ → **NAPRAWIONO** (v8): thinner rim, reduced intensity.
7. **Droga bez tekstury** — brakuje rys, plam, białych linii krawędziowych.
8. **Sun bloom za duży** — ~2x larger than film reference. Needs anisotropic or tighter bloom.

### Średnie odchylenia
8. Cienie chmur na terenie mogą potrzebować ostrzejszych krawędzi.
9. Coastline zbyt subtelna — w filmie wyraźniejsza biała linia.
10. City silhouette może być za mała/za daleko.
11. Ocean specular za słaby — w filmie woda mocno lśni.
12. Barierki mogą być za cienkie do zobaczenia z kamery.

### Do dodania (elementy obecne w filmie, brak w implementacji)
- [ ] **Postać** (dziewczyna na deskorolce)
- [ ] **Deskorolka** (osobny mesh z kółkami)
- [ ] **Cień postaci** na drodze
- [ ] **Biome zones** (sakura tylko w dalszej części)
- [ ] **Drobna roślinność** (krzewy, trawa na zboczach)
- [ ] **Ptaki/mewa** w oddali (opcjonalnie)
- [ ] **Dynamiczna kamera** (follow + slight movement)

---

## 19. Wytyczne proceduralnego generowania

### Elementy proceduralne (80% świata)
- Niebo: gradient shader, 100% proceduralny.
- Chmury: FBM noise + domain warping, 100% proceduralne.
- Teren: noise-based grass + cloud shadows, 100% proceduralny.
- Droga: spline extrusion, 100% proceduralna.
- Drzewa: billboard shader z noise, 100% proceduralne.
- Sakura petals: InstancedMesh z random params, 100% proceduralne.
- Ocean: gradient + noise shimmer, 100% proceduralny.
- Mountains: noise silhouette, 100% proceduralne.
- City: hash-based building heights, 100% proceduralna.
- God rays: screen-space effect, 100% proceduralny.

### Elementy wymagające assetu (20%)
- Postać 3D (VRM model).
- Deskorolka mesh.
- Tekstura planety (detail map).
- Cloud atlas (opcjonalnie, jako upgrade proceduralnych).
- Dźwięki (wiatr, kółka, ambient).
- Muzyka (lofi/ambient).
- UI/HUD elementy.

### Architektura chunk-based (przyszłość)
Dla dynamicznego świata przy jeździe:
- **Spline-driven chunks**: road spline podzielony na segmenty ~50-100m.
- **Stationary player**: postać stoi w origin, świat scrolluje się do niej.
- **Ring buffer**: 3-5 aktywnych chunków, recykling gdy miną kamerę.
- **InstancedMesh pools**: chmury/drzewa/props jako shared pool, nie indywidualne meshe.
- **Budget mobile**: <50 draw calls, <100k triangles, DPR max 1.5.
