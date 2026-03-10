# Skateboard Sky — Wytyczne projektu

## Git workflow
- **Komituj regularnie** — po każdym logicznym kroku (nowy komponent, fix, konfiguracja)
- **Pushuj po każdym milestone** (koniec fazy, działający build, ważna zmiana)
- **Autor commitów:** `neuronx <norbert.wysokinski@gmail.com>` — NIGDY nie używaj Claude Code jako autora
- **Konwencja commitów:** conventional commits (feat:, fix:, chore:, docs:, refactor:)
- **Branch:** `main` dla stabilnego kodu, feature branches gdy potrzeba izolacji

## Superpowers
- Używaj `/brainstorming` na początku każdej fazy
- Używaj `/feature-dev` dla implementacji złożonych komponentów
- Używaj `/code-review` na końcu każdej fazy
- Używaj `/goal-guardian` do pilnowania celu i wykrywania odchyleń

## Stack technologiczny
- Three.js r171+ (WebGPURenderer) + React Three Fiber + TypeScript
- Vite (build + HMR), Capacitor (Android APK)
- Testy na Android emulatorze (Pixel 8 Pro, API 34+, WebGPU)
- Preview/debug: Chrome na PC + Chrome DevTools MCP

## Testowanie w przeglądarce — ZAWSZE Chrome
- **NIGDY nie otwieraj localhost w domyślnej przeglądarce** — domyślna to Firefox, a potrzebujemy Chrome
- Używaj Chrome DevTools MCP (`mcp__chrome-devtools__navigate_page`) do nawigacji na localhost
- Lub jawnie uruchamiaj: `start chrome http://localhost:PORT`
- Firefox powoduje konflikty portów (Vite uruchomiony w Firefox blokuje port dla Chrome)

## Zasady implementacji
- Produkcyjne podejście od dnia 1 — brak prototypów, placeholderów, fallbacków
- **Cel nadrzędny: 100% pixel-perfect odtworzenie świata z filmu referencyjnego**
- Iteracja wizualna przez Chrome DevTools MCP (porównanie z keyframe'ami)

## Dokumenty referencyjne
| Dokument | Ścieżka | Opis |
|----------|---------|------|
| **World Bible** | `docs/WORLD_BIBLE.md` | **GŁÓWNA BAZA WIEDZY** — kompletny opis świata, parametry każdego elementu, paleta kolorów, znane odchylenia. Aktualizuj przy każdym odkryciu. |
| Film referencyjny | `docs/ssstwitter.com_1772994588112.mp4` | Nadrzędna referencja wizualna |
| Klatki filmu | `docs/frames/frame_001..034.png` | 34 klatki do porównań pixel-perfect |
| Keyframe'y | `docs/keyframe_001..006_*.png` | 6 kluczowych klatek co 2s |
| Analiza wymagań | `docs/GAME_REQUIREMENTS_ANALYSIS.md` | Techniczna analiza (legacy) |
| Opis wideo | `docs/VIDEO_DESCRIPTION.md` | Tekstowy opis filmu |

## Wytyczne tworzenia świata
1. **Reusable Assets** — każdy element wizualny (drzewo, chmura, budynek) to niezależny, reużywalny komponent z parametrycznym shader'em. Buduj bibliotekę gotowych elementów.
2. **Proceduralne generowanie** — 80% świata jest proceduralne (niebo, chmury, teren, droga, drzewa, ocean, góry, miasto). Używaj noise, FBM, hash zamiast tekstur wszędzie gdzie się da.
3. **Dynamiczny świat** — architektura przygotowana na chunk-based scrolling (spline-driven chunks + stationary player + ring buffer). InstancedMesh pools dla powtarzalnych obiektów.
4. **Biome zones** — różne strefy roślinności wzdłuż road spline (green hills → transition → sakura valley → haze fadeout). Sakura NIE pojawia się na początku trasy.
5. **Mobile budget** — max 50 draw calls, <100k triangles, DPR ≤ 1.5. Preferuj InstancedMesh nad indywidualne meshe.
6. **World Bible jako źródło prawdy** — przed zmianą parametru ZAWSZE sprawdź `docs/WORLD_BIBLE.md`. Po zmianie AKTUALIZUJ dokument.
