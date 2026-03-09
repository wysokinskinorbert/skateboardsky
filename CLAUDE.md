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

## Zasady implementacji
- Produkcyjne podejście od dnia 1 — brak prototypów, placeholderów, fallbacków
- Dokładne odwzorowanie grafiki i fizyki z filmu referencyjnego
- Iteracja wizualna przez Chrome DevTools MCP (porównanie z keyframe'ami)
- Dokument referencyjny: `docs/GAME_REQUIREMENTS_ANALYSIS.md`
