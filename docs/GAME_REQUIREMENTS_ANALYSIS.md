# Analiza Wymagań: Gra "Skateboard Sky" na Android

> **Cel dokumentu:** Kompletna analiza wymagań — framework, biblioteki, assety, narzędzia i konfiguracje potrzebne do stworzenia produkcyjnej gry przez Claude Code.
>
> **Źródło:** Film referencyjny (~10s animacja anime) + opis w `VIDEO_DESCRIPTION.md` + analiza 6 keyframe'ów
>
> **Data:** 2026-03-09 (v2 — zmiana stacku na Three.js WebGPU)
>
> **Podejście:** Produkcyjne od pierwszego dnia. Brak prototypów, placeholderów i fallbacków.
>
> **Testowanie:** Android emulator (Pixel 8 Pro, API 34+, WebGPU ON), NIE fizyczny tablet.

---

## A. FRAMEWORK — Three.js + WebGPU + React Three Fiber

### Dlaczego Three.js zamiast Unity

Decyzja oparta na research porównawczym (Unity 6 URP vs Three.js WebGPU vs Godot 4 vs Babylon.js):

| Kryterium | Unity 6 | Three.js WebGPU | Wynik |
|-----------|---------|-----------------|-------|
| Claude Code widzi grę w real-time | ❌ Ślepy (build→deploy→ADB screenshot) | ✅ Chrome DevTools MCP — widzi każdy piksel | Three.js |
| Cykl iteracji wizualnej | ~3-5 min na zmianę | ~2-5 sec (hot reload) | Three.js (50×) |
| Tuning 30 parametrów nieba | 30 × 4 min = 2 godziny | 30 × 5 sec = 2.5 min | Three.js |
| AI training data (vibe coding 2025) | Dobre | Najlepsze (2.7M npm/tydzień) | Three.js |
| Anime cel-shading ekosystem | Anime Shading Plus (Asset Store) | VRM + MToon + custom GLSL | Unity |
| Cloud system gotowy | Sky Clouds URP + Anime Clouds | procedural-clouds-threejs (WebGPU raymarching) | Remis |
| Natywna wydajność ARM | IL2CPP + Vulkan | WebGPU (2-3× szybszy od WebGL) | Unity |
| Wymagany edytor GUI | Tak (Unity Editor) | Nie (100% code-only) | Three.js |
| Deploy na Android emulator | Build APK → install | Capacitor/TWA → APK (Chrome engine) | Remis |

**Kluczowy argument:** Scena jest wizualnie zdominowana przez niebo (50-70% ekranu) z ~30+ parametrami do strojenia (gradient 4 kolory, 15+ chmur, planeta, haze, bloom, lens flare, color grading). Różnica **50× w prędkości iteracji** oznacza **godziny zamiast dni** pracy wizualnej.

**Emulator z Pixel 8 Pro (Android 14+)** ma pełne WebGPU — eliminuje ograniczenia starego hardware.

### Stack technologiczny

```
RENDERING:      Three.js r171+ z WebGPURenderer (auto fallback WebGL2)
FRAMEWORK:      React Three Fiber (R3F) — deklaratywny, komponentowy React
FIZYKA:         Rapier (WASM) via @react-three/rapier
POSTAĆ:         VRM format + @pixiv/three-vrm (spring bones, MToon material)
NIEBO:          @takram/three-atmosphere (Rayleigh/Mie scattering)
CHMURY:         procedural-clouds-threejs (WebGPU raymarching, 10 typów chmur)
PLANETA:        THRASTRO shaders (planety z atmosferą i pierścieniami)
LENS FLARE:     R3F-Ultimate-Lens-Flare (anamorphic mode)
POST-PROCESS:   @react-three/postprocessing (bloom, color grading, depth haze)
DEPLOY:         Capacitor → Android APK (TWA = pełny Chrome engine)
PREVIEW:        Chrome na PC + Chrome DevTools MCP (Claude widzi wszystko)
TEST:           Android emulator (Pixel 8 Pro, API 34, WebGPU ON)
BUILD:          Vite + TypeScript
```

### Wymagane pakiety npm

| Pakiet | Cel |
|--------|-----|
| `three` (r171+) | Silnik renderujący (WebGPURenderer) |
| `@react-three/fiber` | React renderer dla Three.js |
| `@react-three/drei` | Helpers (Sky, Environment, useGLTF, useAnimations) |
| `@react-three/postprocessing` | Bloom, color grading, vignette, depth of field |
| `@react-three/rapier` | Rapier 3D physics (WASM) |
| `@pixiv/three-vrm` | Ładowanie VRM anime modeli + spring bones + MToon |
| `@takram/three-atmosphere` | Fizycznie poprawne rozpraszanie atmosferyczne |
| `r3f-ultimate-lens-flare` | Anamorficzny lens flare z ghost flares |
| `@capacitor/core` + `@capacitor/android` | Wrap web app → Android APK |
| `vite` | Build tool z HMR (Hot Module Replacement) |
| `typescript` | Type safety |

---

## B. SZCZEGÓŁOWA ANALIZA WIZUALNA FILMU

Analiza oparta na bezpośrednim przeglądzie **wszystkich 6 keyframe'ów** (t=0s, 2s, 4s, 6s, 8s, 10s) i opisu ruchu między nimi.

### B1. System nieba — Sky Dome + Atmospheric Scattering (KRYTYCZNY — 50-70% ekranu)

**Obserwacje z filmu:**
- Gradient minimum 4-stopniowy: głęboki granat u góry → błękit → jasnoniebieski → kremowa mgła przy horyzoncie
- Gradient NIE jest liniowy — przejścia są miękkie, z "kolanem" między mid-blue a horizon
- Słońce pozycja: ~prawy-dolny kwadrant nieba (~godzina 2-3)
- Światło słoneczne jest INTENSYWNIE ciepłe (złote) — silnie podbarwia chmury i horizon

**Implementacja:**
- **Pakiet:** `@takram/three-atmosphere` — fizycznie poprawne Rayleigh/Mie scattering
- **Technika:** 4D LUT pakowany w 3D teksturę z parametrami:
  - View height, kąt view→zenith, kąt sun→zenith, kąt view→sun
- **Paleta gradientu (z keyframe'ów):**
  - Zenith: `#1A1A4E` (głęboki indygo/granat)
  - Upper mid: `#2A4A8E` (królewski niebieski)
  - Lower mid: `#5A8ABE` (jasny niebieski)
  - Horizon: `#E8C88A` (ciepły kremowo-złoty)
  - Haze: `#F0D8B0` (mglisty jasny)
- **Sun Disc:** Mesh z HDR emission (wartość > 1.0) → triggering bloom
- **Dodatkowy efekt:** Ciepły "golden hour" wash na dolnej 30% nieba

### B2. Gigantyczna planeta/pierścień (KRYTYCZNY — dominuje scenę)

**Obserwacje z filmu (szczegółowa analiza 6 klatek):**
- Planeta to OGROMNY półprzezroczysty turkusowy łuk zajmujący ~30-40% łuku nieba
- Ma **widoczną teksturę powierzchni** — kratery/teren/bump (NIE gładka sfera)
- Krawędź ma **atmosferyczny Fresnel rim** — jaśniejsza niebiesko-biała obwódka
- Jest **częściowo przezroczysta** — niebo/gradient widoczny przez nią
- Kluczowe: **niektóre chmury są PRZED planetą, inne ZA nią** — planeta siedzi MIĘDZY warstwami chmur
- Kolor: turkusowy/teal `#2DD4BF` z jaśniejszą krawędzią `#7EEEDD`
- Ma delikatne **glow** (emission → bloom)

**Implementacja:**
- **Pakiet:** `THRASTRO shaders` (thrastro-shaders) — planety z atmosferą i pierścieniami
- **Geometria:** Sfera (r=400) lub billboard quad z custom shader
- **Shader GLSL:**
  - Base color: gradient `#1A8A7A` (ciemna strona) → `#2DD4BF` (oświetlona)
  - Bump map: proceduralna 3D noise (Perlin/Worley) symulująca teren planety
  - Fresnel rim: `pow(1.0 - dot(normal, viewDir), 3.0) * rimColor`
  - Alpha: ~0.6-0.7 (częściowo przezroczysta)
  - Emission: ~0.2 (glow → bloom)
- **Warstwa renderowania:** Między back clouds (dalsze) a front clouds (bliższe)
- **Sortowanie:** Ręczne renderOrder aby chmury poprawnie przesłaniały planetę

### B3. System chmur — Volumetric Cumulus (KRYTYCZNY)

**Obserwacje z filmu:**
- **15+ indywidualnych chmur cumulus** na różnych głębokościach
- Jaskrawo białe po stronie słońca (prawa), głębokie niebiesko-fioletowe cienie (lewa)
- **Miękkie krawędzie** — nie ostre billboardy, raczej volumetric feel
- **Wewnętrzna luminescencja** — światło przechodzi przez cieńsze części
- Chmury na WIELU warstwach głębokości (bliskie = duże, dalekie = małe)
- Subtelna animacja drift (przesunięcie ~2-5px między klatkami)
- Chmury mają wyraźne **flat base** (typowe dla cumulus) i **fluffy top**

**Implementacja:**
- **Pakiet:** `procedural-clouds-threejs`
- **Tryb renderowania:** WebGPU raymarching (najwyższa jakość)
- **Model oświetlenia:**
  - Henyey-Greenstein phase function (forward/backward scatter)
  - Beer-Lambert + powder effect (bright thin edges, dark dense centers)
  - Silver linings (rim glow gdy słońce za chmurą)
  - Self-shadowing (inner light marching)
- **Typ chmur:** Cumulus (low altitude, cotton-like, flat base)
- **Ilość:** 15-20 instancji na różnych głębokościach
- **Warstwa renderowania:** Dwie grupy:
  - `backClouds` (renderOrder < planeta) — chmury ZA planetą
  - `frontClouds` (renderOrder > planeta) — chmury PRZED planetą
- **Animacja:** Drift (wiatr) + breathe (pulsacja skali), zero alokacji
- **God rays:** Wbudowany post-processing radial blur z pakietu

### B4. Lens Flare + Bloom (WYSOKI — definiuje kinematyczny charakter)

**Obserwacje z filmu:**
- **Masywny anamorficzny lens flare** — poziomy streak przechodzący przez większość kadru
- **4-5 ghost flare** — heksagonalne (typowe dla obiektywów kinowych)
- **Intensywność zmienia się** między klatkami — zależy od kąta camera→sun
- Klatka 4 (t=6s) ma NAJSILNIEJSZY flare — słońce najbardziej bezpośrednie
- Flare ma ciepły złoty + chłodny niebieski tint (chromatic aberration)

**Implementacja:**
- **Pakiet:** `R3F-Ultimate-Lens-Flare` (r3f-ultimate-lens-flare)
- **Tryb:** Anamorphic mode ON
- **Parametry:**
  - `anamorphic: true` — poziomy streak
  - `ghosts: 5` — heksagonalne ghost flares
  - `intensity: 1.5-2.0` — silny efekt
  - `colorGain: [1.0, 0.9, 0.7]` — ciepły gold tint
- **Bloom:** `@react-three/postprocessing` EffectComposer
  - `luminanceThreshold: 0.8` — tylko HDR emission triggeruje bloom
  - `intensity: 1.2`
  - `radius: 0.7` — szeroki, miękki bloom

### B5. Horizon Stack — 5 warstw głębi krajobrazu (WYSOKI)

**Obserwacje z filmu (warstwa po warstwie):**

| Warstwa | Co widać w filmie | Głębokość | Technika |
|---------|-------------------|-----------|----------|
| **1. Teren bliski** | Zielone wzgórza, trawa, krzewy bezpośrednio przy drodze. Sakury (różowe klastry) po lewej (klatki 2-3). Bujne, nasycone kolory. | 0-200m | Mesh z displacement map + instanced vegetation |
| **2. Droga serpentyna** | Widoczna droga wijąca się w dół poniżej gracza — kontynuacja trasy | 50-500m | Spline-extruded mesh z teksturą asfaltu |
| **3. Miasto/zabudowa** | Miasto w dolinie — budynki jako sylwetka, dość szczegółowe (nie flat card) | 1-5km | Alpha-textured billboard cards (2-3 szt) z progressive haze |
| **4. Zatoka/ocean** | Rozległy akwen, turkusowo-niebieski, połyskujący od słońca (shimmer) | 3-10km | Flat quad z gradient shader + UV-scrolling shimmer |
| **5. Góry daleke + haze** | Pasmo gór prawie całkowicie zatopione w atmosferycznej mgle | 10-30km | Ridge cards z strong depth haze (prawie niewidoczne) |

**Implementacja:**
- Każda warstwa jako osobna grupa meshes z rosnącym depth haze
- Parallax: warstwy dalsze przesuwają się wolniej przy ruchu kamery
- Depth haze: `mixColor = lerp(objectColor, hazeColor, hazeFactor)` gdzie `hazeFactor = 1 - exp(-decay * depth)`
- Kolor haze: gradient od ciepłego złotego (dół) do chłodnego niebieskiego (góra)

### B6. Atmospheric Haze — Depth-Based Fog (WYSOKI)

**Obserwacje z filmu:**
- Progresywna mgła od przodu do horyzontu
- Obiekty dalsze stają się coraz bardziej niebiesko-białe
- Miasto (3-5km) widoczne ale mocno zhazowane
- Góry (10-30km) prawie niewidoczne — niemal wtapiają się w niebo
- Haze ma **ciepły ton** przy horyzoncie (golden hour influence)

**Implementacja:**
- **Technika:** Post-processing depth fog z `@react-three/postprocessing`
- **Formuła:** `hazeFactor = 1.0 - exp(-decay * linearDepth)`
- **Parametry:**
  - `decay: 0.0008` (powolne narastanie)
  - `hazeColorNear: #B8C8E0` (chłodny niebiesko-szary)
  - `hazeColorFar: #E8D0A0` (ciepły złoty przy horyzoncie)
- **Blending:** Lerp między depth fog a horizon gradient

### B7. Color Grading — Kinematyczna kolorystyka Shinkai (WYSOKI)

**Obserwacje z filmu:**
- **Nasycone, żywe kolory** — trawa jest INTENSYWNIE zielona, niebo GŁĘBOKO niebieskie
- **Ciepłe światła** (złoto/amber) kontra **chłodne cienie** (niebieski/fiolet)
- **Kontrast:** Wysoki — jasne partie BARDZO jasne, cienie GŁĘBOKIE
- Ogólny ton: "golden hour" — ciepły, ale z zachowaniem niebieskiego nieba

**Implementacja:** Post-processing chain w `EffectComposer`:
1. **ToneMapping:** ACES Filmic (kinematyczny roll-off)
2. **Brightness/Contrast:** contrast +0.15
3. **Hue/Saturation:** saturation +0.2 (nasycone kolory Shinkai)
4. **Color Balance:**
   - Shadows: cool blue `#2A4080` (shift +0.1 blue)
   - Highlights: warm gold `#F0C060` (shift +0.15 warm)
5. **Vignette:** Delikatna (~0.3 intensity) — skupia wzrok na centrum

### B8. Droga — Serpentyna z teksturą (WYSOKI)

**Obserwacje z filmu:**
- Asfalt z widoczną teksturą/ziarnem
- **Jasna żółta przerywana linia środkowa** — wyraźna, kontrastowa
- **Metalowe barierki** na zewnętrznych zakrętach (klatki 1-4)
- Droga ma **lekki specularny refleks** tam gdzie pada słońce
- Kręta serpentyna zjeżdżająca w dół zbocza — co najmniej 3-4 widoczne zakręty
- Szerokość: ~dwupasmowa (wystarczająca na 2 auta)
- Cień postaci na drodze — ostry, konsekwentny z pozycją słońca

**Implementacja:**
- **Ścieżka:** CatmullRom spline (3D) definiujący serpentynę
- **Mesh:** ExtrudeGeometry wzdłuż spline z UV mapping
- **Tekstura:** Asphalt diffuse + normal map + roughness
- **Linia środkowa:** Drugi mesh (thin strip) nałożony na drogę, żółty `#FFD700`
- **Barierki:** Instanced mesh (powtarzalny segment) na zewnętrznych krzywych
- **Słupy telegraficzne:** Instanced mesh, widoczne od t=8s (klatka 5)

---

## C. FIZYKA DESKOROLKI (analiza RUCHU z filmu)

### Analiza ruchu klatka po klatce

| Klatka | Czas | Poza postaci | Szacowana prędkość | Implikacja fizyczna |
|--------|------|-------------|---------------------|---------------------|
| 1 | 0.0s | Statyczna, stoi prosto na deskorolce | ~0 km/h | Zero velocity, start na szczycie |
| 2 | 2.0s | Lekki przysiad, nachylenie do przodu | ~10-15 km/h | Grawitacja rozpoczyna przyspieszanie, CoG shift w dół |
| 3 | 4.0s | Dynamiczny lean, pewna postawa | ~25-35 km/h | Nabieranie prędkości, tarcie < siła grawitacji |
| 4 | 6.0s | **Ramiona rozłożone na boki** — poza wolności | ~40-50 km/h | Pełna prędkość, air resistance ≈ gravity component |
| 5 | 8.0s | Stabilna jazda, niżej na zboczu | ~40-50 km/h | Terminal velocity osiągnięte (drag = gravity) |
| 6 | 10.0s | **Ręka w górze — gest triumfu** | ~40-50 km/h | Emocjonalny peak, stała prędkość |

**Kluczowe wnioski fizyczne:**
- Prędkość osiąga plateau (~40-50 km/h) w okolicy klatki 4 — air resistance równoważy grawitację
- Postać NIE popycha się — czysty zjazd grawitacyjny
- Poza zmienia się w zależności od prędkości (animacja state machine)
- Włosy reagują na prędkość — powiewają mocniej w klatkach 3-6

### Systemy fizyki

| Element | Implementacja | Pakiet | Priorytet |
|---------|---------------|--------|-----------|
| Grawitacja na zboczu | `F = mg * sin(θ)` — siła proporcjonalna do nachylenia spline | Custom + Rapier | KRYTYCZNY |
| Tarcie kinetyczne | `Ff = μk * N` — spowalnia proporcjonalnie do normal force | Custom | KRYTYCZNY |
| Air resistance (drag) | `Fd = 0.5 * Cd * ρ * A * v²` — limituje max speed do ~50 km/h | Custom | KRYTYCZNY |
| Momentum/pęd | Zachowanie energii kinetycznej przez zmianę nachylenia | Custom | KRYTYCZNY |
| Skręcanie | Lean angle + centripetal force na zakrętach serpentyny | Custom + spline tangent | WYSOKI |
| Balans rąk | Animacja arms_spread/lean wyzwalana prędkością i zakrętem | Animation blending | WYSOKI |
| Fizyka włosów | Spring bone chain — siła wiatru proporcjonalna do prędkości | @pixiv/three-vrm SpringBone | WYSOKI |
| Fizyka plecaka | Lekki spring bone — drobne kołysanie | @pixiv/three-vrm SpringBone | ŚREDNI |
| Kółka deskorolki | Obrót proporcjonalny do prędkości `ω = v / r_wheel` | Custom rotation | NISKI |

### Podejście do fizyki

- **Spline follower** — postać jedzie po CatmullRom spline (ścieżka drogi)
- **Offset boczny** — gracz kontroluje pozycję lewo/prawo na drodze (swipe/tilt)
- **Nachylenie spline** — slope angle obliczany z tangent wektora spline → siła grawitacji
- **Terminal velocity** — drag v² equalizes z grawitacją przy ~50 km/h
- **Rapier (WASM)** — dla kolizji z barierkami i ewentualnych przeszkód

### Sterowanie

| Metoda | Opis | Implementacja |
|--------|------|---------------|
| Przechylanie telefonu | Akcelerometr → lean angle → offset boczny | DeviceOrientationEvent API |
| Swipe lewo/prawo | Alternatywa touch dla stabilności | Touch events + lerp |
| Tap / hold | Hamowanie (zwiększa tarcie) | Touch event → friction multiplier |
| Double-tap | Przysiad (zmniejsza drag, przyspieszenie) | Touch event → crouch state |

---

## D. POSTAĆ ANIME — VRM + Spring Bones (KRYTYCZNY)

### Obserwacje z filmu

- **Proporcje anime:** Lekko większa głowa, smukłe ciało, duże oczy
- **Ubiór:** Biała bluzka z krótkimi rękawami, ciemna (granatowa?) spódniczka
- **Plecak:** Niebieski/ciemny, na plecach
- **Włosy:** Ciemnobrązowe/czarne, długie, powiewające na wietrze — intensywność rośnie z prędkością
- **Cel shading:** Wyraźne anime — flat colors, ostre przejście cień/światło, brak smooth gradientu
- **Cień postaci:** Ostry cień na drodze, konsekwentny z pozycją słońca (pada w lewo)

### Implementacja

- **Format:** VRM (standardowy format anime avatarów)
- **Loader:** `@pixiv/three-vrm` z `GLTFLoader` + `VRMLoaderPlugin`
- **Material:** MToonNodeMaterial (WebGPU compatible od three-vrm v3)
  - Cel-shading z ostrym shade boundary
  - Outline rendering (czarny kontur sylwetki)
  - Rim lighting (opcjonalnie, dla głębi)
- **Spring Bones (secondary motion):**
  - Włosy: 3-4 łańcuchy spring bone, gravity + wind force proporcjonalny do `velocity`
  - Plecak: 1 łańcuch spring bone, lekkie kołysanie
  - Spódniczka: 2-3 łańcuchy spring bone, reaguje na ruch
- **Animacje (state machine):**

| Stan | Trigger | Blend |
|------|---------|-------|
| `idle` | `speed < 2 km/h` | Default |
| `ride_crouch` | `speed 2-20 km/h` | Lerp od idle |
| `ride_normal` | `speed 20-35 km/h` | Lerp od crouch |
| `ride_arms_spread` | `speed > 35 km/h` | Lerp od normal |
| `ride_triumph` | `speed > 40 km/h + time > 8s` | Additive layer |
| `lean_left` | `lateralOffset < -threshold` | Additive blend |
| `lean_right` | `lateralOffset > +threshold` | Additive blend |

### Źródło modelu VRM

| Opcja | Opis | Jakość |
|-------|------|--------|
| **VRoid Studio** (Pixiv) | Darmowy kreator anime postaci → export VRM | ✅ Produkcyjna |
| **VRoid Hub** / **Booth.pm** | Gotowe modele VRM (darmowe/płatne) | ✅ Produkcyjna |
| **Blender 5.0 + VRM addon** | Ręczne modelowanie + export VRM | ✅✅ Najlepsza kontrola |
| **Meshy AI → VRM** | AI text-to-3D + konwersja | ⚠️ Wymaga retopologii |

---

## E. ASSETY GRAFICZNE — co trzeba stworzyć/pozyskać

### E1. Postać i deskorolka

| Element | Źródło | Specyfikacja |
|---------|--------|-------------|
| Model VRM (dziewczyna) | VRoid Studio / VRoid Hub / Blender | 10-20K triangles, anime proportions, MToon material |
| Spring bones setup | VRoid Studio / UniVRM | Włosy (3-4 chains), spódniczka (2-3), plecak (1) |
| Animacje | Blender / Mixamo → retarget na VRM | 6 stanów: idle, crouch, normal, arms_spread, triumph, lean |
| Deskorolka | Blender 5.0 | ~500 triangles, osobny mesh, obracające się kółka |

### E2. Środowisko

| Element | Źródło | Specyfikacja |
|---------|--------|-------------|
| Droga (serpentyna) | Procedural: CatmullRom spline + ExtrudeGeometry | ~8-12 segmentów zakrętów, UV mapped |
| Tekstura asfaltu | AI generacja / textures.com | Diffuse + normal + roughness, tileable |
| Żółta linia | Procedural strip mesh na drodze | `#FFD700`, dashed pattern |
| Barierki metalowe | Blender (prosty segment) → instanced | ~200 tri/segment, powtarzalny |
| Słupy telegraficzne | Blender (prosty mesh) → instanced | ~300 tri, z drutami (line geometry) |
| Teren (wzgórza) | Procedural: plane + displacement (Perlin noise) | 2-3 shelves po bokach drogi |
| Trawa/krzewy | Instanced billboardy + GPU wind animation | Setki instancji, LOD fade |
| Drzewa (zielone) | Blender / gotowe GLTF | 3-4 warianty, instanced, LOD |
| Sakury (kwitnące) | Billboard trees + particle płatki | Różowe `#F9A8D4` koronki + falling petals |
| Płatki sakury | GPU particle system | Wind-driven, 50-100 jednocześnie |

### E3. Niebo i tło

| Element | Źródło | Specyfikacja |
|---------|--------|-------------|
| Sky dome | `@takram/three-atmosphere` + custom gradient | Rayleigh/Mie scattering (§B1) |
| Planeta | Custom GLSL shader / THRASTRO | Sfera z Fresnel rim + bump + alpha (§B2) |
| Chmury | `procedural-clouds-threejs` | WebGPU raymarching, 15-20 cumulus (§B3) |
| Sun disc | Mesh z HDR emission | Triggering bloom, pozycja ~2-3h |
| Miasto (sylwetka) | AI-generated alpha texture / hand-drawn | 2-3 billboard cards w dolinie |
| Ocean/zatoka | Flat quad + gradient shader | `#2DD4BF` → `#1A6B8A` + shimmer UV scroll |
| Góry daleke | 1-2 ridge billboard cards | Z silnym depth haze overlay |

### E4. Audio

| Element | Źródło | Specyfikacja |
|---------|--------|-------------|
| Wiatr (ambient) | Freesound.org / AI gen | Loop, pitch/volume ~ prędkość |
| Kółka na asfalcie | Freesound.org | Loop, pitch ~ prędkość (doppler feel) |
| Zakręt (screech) | Freesound.org | One-shot, trigger przy ostrym lean |
| Muzyka (ambient) | Suno AI / royalty-free | Chill/atmospheric, lo-fi anime OST style |
| UI sounds | Freesound.org | Click, swoosh, score popup |

---

## F. NARZĘDZIA DEWELOPERSKIE

### F1. Już dostępne (zainstalowane)

| Narzędzie | Status | Zastosowanie |
|-----------|--------|-------------|
| **Node.js / npm** | ✅ (sprawdzić wersję) | Runtime + package manager |
| **Android SDK** (build-tools do 36.0.0) | ✅ Zainstalowany | `%LOCALAPPDATA%\Android\Sdk` |
| **Android Emulator** | ✅ (sprawdzić AVD z WebGPU) | Pixel 8 Pro, API 34+ |
| **JDK 21** | ✅ Zainstalowany | Dla Capacitor Android build |
| **Blender 5.0** | ✅ Zainstalowany | Modele 3D, rig, animacja |
| **Chrome (z remote debugging)** | ✅ Gotowy | Preview + Chrome DevTools MCP |
| **MCP: Chrome DevTools** | ✅ Gotowy | `take_snapshot()`, `evaluate_script()`, `take_screenshot()` |
| **MCP: Claude-in-Chrome** | ✅ Gotowy | Alternatywna interakcja z Chrome |
| **Plugin: context7** | ✅ Gotowy | Dynamiczna dokumentacja Three.js/React API |
| **Plugin: superpowers** | ✅ Gotowy | Brainstorming, planning, TDD |
| **Plugin: feature-dev** | ✅ Gotowy | Guided feature development |
| **Plugin: code-review** | ✅ Gotowy | Code review |
| **Skill: android-test** | ✅ Gotowy | Testowanie APK na emulatorze |
| **Skill: android-uiux-designer** | ✅ Gotowy | HUD/Menu/UI gry |

### F2. Wymagane do zainstalowania/skonfigurowania

| Narzędzie | Cel | Jak zainstalować | Priorytet |
|-----------|-----|------------------|-----------|
| **Node.js 20 LTS** | Runtime dla Vite + build | nodejs.org (jeśli nie zainstalowany) | KRYTYCZNY |
| **Android Emulator AVD (Pixel 8 Pro)** | Test z WebGPU | Android Studio → AVD Manager | KRYTYCZNY |
| **Capacitor CLI** | Wrap web → Android APK | `npm install @capacitor/cli` | KRYTYCZNY |
| **VRoid Studio** | Tworzenie postaci VRM | vroid.com (darmowy) | WYSOKI |

### F3. Obserwowalność Claude Code (KLUCZOWA PRZEWAGA)

Claude Code ma **pełną wizualną kontrolę** przez Chrome DevTools MCP:

| Akcja Claude | Narzędzie MCP | Tokeny | Opis |
|-------------|---------------|--------|------|
| Zobaczyć aktualny stan gry | `take_screenshot(filePath)` | ~0 kontekst | Screenshot zapisany na dysk → Read |
| Sprawdzić wartość shadera | `evaluate_script(() => skyMaterial.uniforms.zenithColor.value)` | ~30 | Instant read dowolnego uniform |
| Zmierzyć FPS | `evaluate_script(() => renderer.info)` | ~30 | Draw calls, triangles, FPS |
| Kliknąć element UI | `click(uid)` | ~50 | Interakcja z HUD |
| Poczekać na load | `wait_for(text: "Loaded")` | ~50 | Zwraca snapshot po załadowaniu |
| Sprawdzić errory | `list_console_messages(types: ["error"])` | ~200 | Filtowane logi konsoli |
| Pełny snapshot DOM | `take_snapshot()` | ~500-2000 | Lista elementów z uid |

**Workflow iteracji wizualnej:**
```
1. Claude zmienia parametr w kodzie (np. zenithColor)      → Edit tool
2. Vite HMR przeładowuje stronę                            → ~1-2 sec
3. Claude robi screenshot                                    → take_screenshot()
4. Claude analizuje screenshot                               → Read + analiza wizualna
5. Claude porównuje z keyframe filmowym                      → porównanie z docs/keyframe_*.png
6. Claude poprawia parametr                                  → Edit tool
7. Powtórz od kroku 2
```

**Czas jednej iteracji: ~5-10 sekund** (vs ~4 minuty w Unity).

---

## G. STRUKTURA PROJEKTU

```
skateboardsky/
├── src/
│   ├── App.tsx                         # Root React component
│   ├── main.tsx                        # Entry point (Vite)
│   ├── game/
│   │   ├── GameScene.tsx               # Główna scena R3F (<Canvas>)
│   │   ├── GameManager.ts              # Stan gry, score, lifecycle
│   │   └── constants.ts                # Stałe fizyczne, kolory, parametry
│   ├── player/
│   │   ├── SkateController.tsx         # Fizyka deskorolki (§C)
│   │   ├── CharacterModel.tsx          # VRM loader + spring bones (§D)
│   │   ├── AnimationStateMachine.ts    # Stany animacji (idle→ride→triumph)
│   │   └── InputHandler.ts             # Touch / accelerometer / swipe
│   ├── world/
│   │   ├── Road.tsx                    # Spline-extruded droga z teksturą (§B8)
│   │   ├── Terrain.tsx                 # Wzgórza po bokach (displacement mesh)
│   │   ├── Vegetation.tsx              # Instanced drzewa, krzewy, sakury
│   │   ├── Props.tsx                   # Barierki, słupy telegraficzne
│   │   └── SakuraParticles.tsx         # GPU particle system (płatki)
│   ├── sky/
│   │   ├── SkyDome.tsx                 # Atmospheric scattering (§B1)
│   │   ├── Planet.tsx                  # Gigantyczna planeta z Fresnel (§B2)
│   │   ├── CloudSystem.tsx             # Volumetric cumulus (§B3)
│   │   ├── SunDisc.tsx                 # HDR emission → bloom
│   │   └── HorizonStack.tsx            # 5 warstw głębi (§B5)
│   ├── postprocessing/
│   │   ├── PostProcessingStack.tsx     # EffectComposer setup
│   │   ├── LensFlareSetup.tsx          # Anamorphic lens flare (§B4)
│   │   ├── ColorGrading.tsx            # ACES + saturation + split toning (§B7)
│   │   └── DepthHaze.tsx               # Atmospheric fog pass (§B6)
│   ├── camera/
│   │   └── ThirdPersonCamera.tsx       # Smooth follow za postacią
│   ├── ui/
│   │   ├── HUD.tsx                     # Prędkość, score overlay
│   │   └── PauseMenu.tsx               # Menu pauzy
│   ├── audio/
│   │   └── AudioManager.ts             # Wind, wheels, music (Web Audio API)
│   └── utils/
│       ├── SplineUtils.ts              # CatmullRom helpers, slope calculation
│       └── PhysicsUtils.ts             # Gravity, drag, friction formulas
├── public/
│   ├── models/
│   │   ├── character.vrm               # Postać anime VRM
│   │   └── skateboard.glb              # Deskorolka GLTF
│   ├── textures/
│   │   ├── asphalt_diffuse.jpg
│   │   ├── asphalt_normal.jpg
│   │   ├── terrain_grass.jpg
│   │   ├── city_silhouette.png         # Alpha texture
│   │   └── planet_bump.jpg
│   └── audio/
│       ├── wind_loop.mp3
│       ├── wheels_loop.mp3
│       └── ambient_music.mp3
├── android/                            # Capacitor Android project (generated)
├── docs/
│   ├── VIDEO_DESCRIPTION.md
│   ├── GAME_REQUIREMENTS_ANALYSIS.md   # TEN DOKUMENT
│   └── keyframe_*.png                  # 6 klatek referencyjnych
├── index.html                          # Vite entry HTML
├── vite.config.ts                      # Vite config (HMR, assets)
├── tsconfig.json                       # TypeScript config
├── capacitor.config.ts                 # Capacitor Android config
├── package.json                        # Dependencies
└── .eslintrc.js                        # Linting
```

---

## H. DEPLOY NA ANDROID (Capacitor + TWA)

### Capacitor workflow

```bash
# 1. Build web app
npm run build                    # Vite → dist/

# 2. Sync z Android
npx cap sync android             # Kopiuje dist/ do android/

# 3. Build APK
cd android && ./gradlew assembleDebug

# 4. Install na emulatorze
adb install app/build/outputs/apk/debug/app-debug.apk

# 5. Uruchom
adb shell am start -n com.skateboardsky.app/.MainActivity
```

### Konfiguracja Capacitor

```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'com.skateboardsky.app',
  appName: 'Skateboard Sky',
  webDir: 'dist',
  android: {
    // TWA = pełny Chrome engine (nie WebView)
    // Lepsze WebGPU wsparcie
    flavor: 'twa',
  },
  server: {
    androidScheme: 'https',  // Wymagane dla WebGPU
  },
};
```

### Emulator — wymagana konfiguracja

| Parametr | Wartość |
|----------|---------|
| Urządzenie | Pixel 8 Pro |
| API Level | 34 (Android 14) lub 35 (Android 15) |
| System Image | Google APIs (z Chrome) |
| GPU | Host GPU (hardware acceleration ON) |
| RAM | 4 GB+ |
| Orientacja | Portrait (jak film) |

---

## I. REKOMENDOWANY WORKFLOW TWORZENIA GRY

```
Faza 1: Fundament + Niebo (1-2 sesje)
├── Project setup (Vite + R3F + TypeScript + packages)
├── Capacitor Android config
├── Sky Dome z atmospheric scattering (@takram/three-atmosphere)
├── Gradient nieba — tuning z keyframe_001 (Chrome DevTools MCP)
├── Sun disc z HDR emission
├── Bloom post-processing
├── Color grading chain (ACES + saturation + split toning)
├── Porównanie z keyframe'ami filmu → iteracja
└── Build → emulator → weryfikacja

Faza 2: Planeta + Chmury + Lens Flare (2-3 sesje)
├── Planeta z Fresnel rim + bump + alpha (THRASTRO/custom GLSL)
├── Cloud system (procedural-clouds-threejs, WebGPU raymarching)
├── Sortowanie warstw: back clouds → planet → front clouds
├── Anamorphic lens flare (R3F-Ultimate-Lens-Flare)
├── God rays (z pakietu clouds)
├── Tuning: porównanie z każdym keyframe → iteracja
└── Build → emulator → weryfikacja

Faza 3: Świat (2-3 sesje)
├── Road system (CatmullRom spline + ExtrudeGeometry + texture)
├── Żółta linia, barierki, słupy
├── Terrain shelves (displacement mesh po bokach drogi)
├── Horizon stack (miasto, ocean, góry z haze)
├── Vegetation (instanced drzewa + sakury)
├── Sakura particles (GPU particle system)
├── Atmospheric depth haze (post-processing pass)
└── Build → emulator → weryfikacja

Faza 4: Postać + Fizyka + Kamera (2-3 sesje)
├── VRM character loading (@pixiv/three-vrm)
├── Spring bones setup (włosy, spódniczka, plecak)
├── Animation state machine (idle → ride → arms_spread → triumph)
├── Skateboard physics (gravity + friction + drag + spline follow)
├── Input system (touch + accelerometer)
├── Third-person camera (smooth follow)
├── Tuning fizyki: prędkość plateau ~50 km/h jak w filmie
└── Build → emulator → gameplay test

Faza 5: Audio + HUD + Polish (1-2 sesje)
├── Audio system (Web Audio API): wiatr, kółka, muzyka
├── HUD overlay: prędkość, score
├── Final color grading pass
├── Performance profiling na emulatorze
├── Optymalizacja (LOD, instancing, texture compression)
└── Final build APK → emulator → pełny test
```

---

## J. PODSUMOWANIE — STATUS GOTOWOŚCI

### Narzędzia i środowisko

| Kategoria | Status | Uwagi |
|-----------|--------|-------|
| Android SDK (build-tools 36.0.0) | ✅ GOTOWY | `%LOCALAPPDATA%\Android\Sdk` |
| JDK 21 | ✅ GOTOWY | `C:\Program Files\Java\jdk-21` |
| Blender 5.0 | ✅ GOTOWY | Modele 3D, animacje |
| Chrome + DevTools MCP | ✅ GOTOWY | Pełna obserwowalność |
| Node.js | ❓ SPRAWDZIĆ | Wymagany v20 LTS+ |
| Android Emulator (Pixel 8 Pro AVD) | ❓ SPRAWDZIĆ | Wymaga AVD z API 34+, host GPU |
| Capacitor CLI | ❌ DO ZAINSTALOWANIA | `npm install @capacitor/cli @capacitor/core @capacitor/android` |
| VRoid Studio | ❌ DO ZAINSTALOWANIA | Darmowy, do tworzenia postaci VRM |

### Assety do stworzenia

| Kategoria | Status | Źródło |
|-----------|--------|--------|
| Model VRM (dziewczyna anime) | ❌ BRAK | VRoid Studio → export VRM |
| Deskorolka GLTF | ❌ BRAK | Blender 5.0 (~500 tri) |
| Tekstura asfaltu (diffuse+normal) | ❌ BRAK | AI gen / textures.com |
| Sylwetka miasta (alpha PNG) | ❌ BRAK | AI gen / ręcznie |
| Tekstura bump planety | ❌ BRAK | AI gen / proceduralna |
| Props (barierki, słupy) GLTF | ❌ BRAK | Blender 5.0 |
| Drzewa GLTF (3-4 warianty) | ❌ BRAK | Blender / gotowe GLTF |
| Dźwięki SFX | ❌ BRAK | Freesound.org |
| Muzyka ambient | ❌ BRAK | Suno AI / royalty-free |

### Co Claude Code tworzy SAMODZIELNIE (bez zewnętrznych assetów)

Claude Code generuje **90% projektu** samodzielnie:
- ✅ Cały kod TypeScript/React (fizyka, input, kamera, UI, managers)
- ✅ Custom GLSL shadery (sky gradient, planet Fresnel, haze, ocean shimmer)
- ✅ Post-processing stack (bloom, color grading, lens flare, vignette)
- ✅ System chmur (konfiguracja procedural-clouds-threejs)
- ✅ Road generation (spline + extrude + UV mapping)
- ✅ Terrain generation (displacement mesh)
- ✅ Particle systems (sakura, efekty)
- ✅ Animation state machine
- ✅ Physics engine (gravity, drag, friction, spline follow)
- ✅ Capacitor config + Android build setup
- ✅ Pełna konfiguracja projektu (Vite, TypeScript, packages)
- ❌ Model VRM postaci (wymaga VRoid Studio lub gotowy z VRoid Hub)
- ❌ Tekstury artystyczne (wymaga AI gen lub ręcznego tworzenia)
- ❌ Modele 3D props (wymaga Blendera)
- ❌ Audio (wymaga zewnętrznych źródeł)

### Blokery przed Fazą 1

1. **Node.js 20 LTS** — sprawdzić/zainstalować
2. **Android Emulator AVD** — skonfigurować Pixel 8 Pro z API 34+ i host GPU
3. **npm packages** — `npm init` + instalacja wszystkich zależności

### Blokery przed Fazą 4

1. **Model VRM postaci** — stworzyć w VRoid Studio lub pobrać z VRoid Hub
2. **Model deskorolki** — stworzyć w Blenderze 5.0

---

## K. KLUCZOWE PAKIETY NPM — LINKI I DOKUMENTACJA

| Pakiet | npm | GitHub/Docs | Cel |
|--------|-----|-------------|-----|
| three | `three` | threejs.org | Silnik 3D |
| React Three Fiber | `@react-three/fiber` | github.com/pmndrs/react-three-fiber | React wrapper |
| Drei | `@react-three/drei` | github.com/pmndrs/drei | Helpers |
| Postprocessing | `@react-three/postprocessing` | github.com/pmndrs/react-postprocessing | Bloom, grading |
| Rapier | `@react-three/rapier` | github.com/pmndrs/react-three-rapier | Fizyka 3D |
| three-vrm | `@pixiv/three-vrm` | github.com/pixiv/three-vrm | VRM anime + spring bones |
| three-atmosphere | `@takram/three-atmosphere` | npmjs.com/package/@takram/three-atmosphere | Sky scattering |
| Ultimate Lens Flare | `r3f-ultimate-lens-flare` | github.com/ektogamat/R3F-Ultimate-Lens-Flare | Anamorphic flare |
| Capacitor Core | `@capacitor/core` | capacitorjs.com | Web → Android |
| Capacitor Android | `@capacitor/android` | capacitorjs.com | Android bridge |
| Vite | `vite` | vitejs.dev | Build + HMR |

> **Uwaga o chmurach:** `procedural-clouds-threejs` (GitHub: CK42BB/procedural-clouds-threejs) wymaga Three.js r170+ dla WebGPU i TSL node materials. Jeśli pakiet niedostępny w npm, alternatywa: `@takram/three-clouds` lub wbudowany Three.js example `webgpu_volume_cloud`.

---

## L. NASTĘPNE KROKI

Po zatwierdzeniu tej analizy:

1. **Sprawdzić Node.js** — `node --version` (potrzeba v20+)
2. **Skonfigurować Android Emulator** — AVD Pixel 8 Pro, API 34, host GPU
3. **Uruchomić Fazę 1** — project setup + sky dome + color grading
4. **Iterować wizualnie** — Chrome DevTools MCP → porównanie z keyframe'ami → poprawki w sekundy
