# Windbelasting tijdelijke bouwfase – loods met luifel (Gent)

Versie: zie [`VERSION`](VERSION) (ook zichtbaar in de blauwe balk bovenaan de tool).

Interactieve rekentool voor windbelasting volgens **NBN EN 1991-1-4:2005 + Belgische Nationale Bijlage (ANB:2010)**, met 3D-visualisatie van de drukzones. Gemaakt voor een loods met open luifel in een tijdelijke bouwfase (deel van het dak verwijderd, gevel gedeeltelijk geopend), maar universeel opgezet: daken en wanden kunnen per overspanning aan- of uitgezet worden.

**Openen:** download [`dist/windberekening_loods_gent.html`](dist/windberekening_loods_gent.html) (of `index.html`) en open het in een browser. Eén bestand, werkt offline.

## Wat de tool doet

- **Stuwdruk** volgens EN 4.2–4.5 met alle ANB-factoren: v<sub>b,0</sub>, terreincategorie, c<sub>0</sub>, k<sub>I</sub>, c<sub>dir</sub> (tabel 4.3), c<sub>season</sub> (tabel 4.4), c<sub>prob</sub> (tabel 4.5); controle tegen ANB tabel 4.9.
- **Universeel model:** drie overspanningen (as 1–7, 7–13, 13–14), daken en wanden (as 1/7/13/14, gevels A/P per overspanning) in/uit, met openingen.
- **Automatische theoriekeuze per volume** (EN 7.2.9(2)): ≥ 2 vlakken met > 30 % openingen ⇒ open constructie (dak als overkapping EN 7.3, wanden als vrijstaande wand EN 7.4); anders gesloten gebouw (EN 7.2).
- **Gesloten delen:** gevels tabel 7.1, zadeldak tabel 7.4a/b, geschakeld dak fig. 7.10d (positie automatisch), c<sub>pe,1</sub>/c<sub>pe,10</sub>-interpolatie (fig. 7.2).
- **Inwendige druk (EN 7.2.9):** dominante zijde (0,75–0,90·c<sub>pe</sub>) of fig. 7.13 (μ), plus gesloten-gebouwscenario's +0,2/−0,3, handmatig, en een veilige variant met open grensvlak (S5).
- **Open overkapping (EN 7.3):** tabel 7.7, meerdere velden (tabel 7.8 / fig. 7.18), blokkering φ per windrichting (7.3(4)), belastingsopstellingen fig. 7.17, wrijving (7.5).
- **Belastingen per constructie-element:** lijnlasten per spant (invloedsbreedte uit de spantposities), steunpuntsreacties per kolomlijn met omhullende en maatgevende druk/trek, kolommen in de kopgevels, gordingen, gevelregels, gevelkolommen en windverbanden in langsrichting (incl. wrijving EN 5.3/7.5).
- **Drie talen:** English (standaard), Nederlands, Français – keuze in de kop, onthouden in de browser; ook het rapport volgt de gekozen taal.
- **Twee tabbladen:** *Invoer en model* (invoer met live modelweergave en status) en *Resultaten*.
- **3D-model** (Three.js) met zones, kleuren, drukpijlen, labels, maatvoering en vlotte navigatie.
- **Rapport per zone** voor alle windrichtingen en dakgevallen; rapportdialoog om onderdelen te kiezen, af te drukken of als HTML te exporteren.
- **Project opslaan/openen** (.json) met een venster “Opslaan als” (map en naam kiezen in Chrome/Edge; andere browsers vragen eerst een bestandsnaam). De map en naam van het laatst opgeslagen of geopende project worden onthouden; het projectbestand bevat ook de rapport- en afdrukinstellingen. Export CSV/JSON.
- **Verificatie:** automatische controles, handberekening en vergelijking met een externe berekening (WInt) en een manuele spreadsheet.

## Structuur

| Pad | Inhoud |
|---|---|
| `src/engine.js` | rekenkern (gebouw, volumes, c<sub>pe</sub>/c<sub>pi</sub>, totalen, controles) |
| `src/canopy.js` | rekenkern open overkapping (EN 7.3) |
| `src/i18n.js`, `src/lang/*.txt` | vertaallaag en woordenboek NL → EN/FR |
| `src/elements.js` | belastingen per constructie-element (spanten, kolommen, gordingen, regels, verbanden) |
| `src/ui.js` | invoer, rapportering, export, rapportdialoog |
| `src/view.js` | 3D-weergave |
| `src/template.html` | opmaak en paginastructuur |
| `src/defaults.js` | standaardinvoer (uit de plannen) |
| `vendor/three/` | Three.js r128 + OrbitControls (MIT) |
| `build.py` | bouwt `dist/` en `index.html` |
| `dist/` | gebouwde bestanden: offline versie en claude.ai-variant |
| `docs/ontwikkeling.md` | logboek van de ontwikkelstappen en keuzes |

## Bouwen

```bash
python3 build.py
```

Verhoog `VERSION` bij elke nieuwe versie; de build zet het nummer in de kop, het rapport, de projectbestanden en de JSON-export.

## Belangrijk

- De normteksten (NBN EN 1991-1-4 en ANB) en de bouwplannen zijn **niet** opgenomen (auteursrecht/licentie, projectdocumenten). De tool bevat enkel de rekenwaarden uit de normtabellen die nodig zijn voor de berekening.
- Dit is een technisch rekenhulpmiddel en vervangt niet de controle en goedkeuring door een bevoegd stabiliteitsingenieur.
