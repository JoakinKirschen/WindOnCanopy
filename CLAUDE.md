# Werkafspraken voor deze repository

## Git-werkwijze
- Werk nooit rechtstreeks op `main`. Maak voor elke wijziging een branch (bv. `versie-1.4.1`), push die, open een pull request naar `main` en **merge de PR meteen** (merge commit, geen squash).
- In Claude Code-sessies werkt GitHub GraphQL niet: gebruik de REST API, bv.
  `gh api repos/JoakinKirschen/WindOnCanopy/pulls -f title=… -f head=<branch> -f base=main -F body=@pr.md`
  en `gh api -X PUT repos/JoakinKirschen/WindOnCanopy/pulls/<nr>/merge -f merge_method=merge`.
- Breng na de merge de lokale `main` gelijk met `origin/main` (fast-forward).

## Bouwen en versies
- Bron in `src/`; `python3 build.py` bouwt `dist/windberekening_loods_gent.html` (offline), `dist/artifact.html` (claude.ai) en `index.html`.
- Verhoog `VERSION` bij elke inhoudelijke wijziging (patch voor correcties, minor voor nieuwe functies); het nummer verschijnt in de kop, het rapport, projectbestanden en de JSON-export.
- Controleer na een wijziging in een browser: geen consolefouten, alle automatische controles geslaagd, handberekening en vergelijking met WInt/Wind.xlsx ongewijzigd.

## Niet committen
- Normteksten (NBN EN 1991-1-4, ANB), bouwplannen en projectspreadsheets (`.gitignore` sluit pdf/xls/xlsx/zip uit). De repository is publiek.

## Taal
- De tool is drietalig: Engels (standaard), Nederlands en Frans, te kiezen in de kop. De brontekst in de code blijft Nederlands; `src/i18n.js` vertaalt alle tekst die via innerHTML/textContent in de pagina komt met het woordenboek in `src/lang/*.txt` (`NL || EN || FR`, één fragment per regel).
- Voeg bij elke nieuwe of gewijzigde tekst de Engelse en Franse vertaling toe in `src/lang/` en controleer in de browser in alle drie de talen dat er geen Nederlandse resten zijn. Gebruikersnaam/eigen tekst in `<span translate="no">`.
- Commitberichten en documentatie in het Nederlands.
