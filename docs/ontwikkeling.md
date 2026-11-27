> Ontwikkellogboek van de opeenvolgende versies. Paden als `src/`, `src2/` … `src4/` verwijzen naar de werkmappen tijdens de ontwikkeling; in deze repository staat enkel de laatste versie (= `src4/`) in `src/`.

# Windberekening loods Gent – voortgang (3 passes)

## PASS 1 – Geometrie (AFGEROND)
Bron: Bijlage 1 (grondplan 1/200, plan 2161/A) en Bijlage 2 (doorsneden 1/150, plan 2161/B).

Assen dwars (x, west→oost): 1–2 7.26 | 2…12 10×7.50 | 12–13 7.26  → as1–as13 = 89.52 m (2×44.76 = "2x 4476")
- buitenkant staal 89.52 / buitenkant wandplaten 90.00 m
- luifel as13–as14: 22.605 + 22.535 = 45.14 m (4490 bk staal / 4500 bk opstortkolom)
Assen langs (y, A→P): A–G 43.674 | G–L 36.661 | L–P 29.104 → 109.439 m; buitenkant wandplaten 110.00 m ("11000")
Niveaus (bovenkant dakspanten, rode kaders, doorsnede A-A'):
- as1 dakrand +14.46 (bk spant +14.32), onderkant spant +12.12
- as4 nok +17.44 | as7 kilgoot +14.20 | as10 nok +17.44 | as13 kilgoot +14.23 | luifel nok +17.48 | as14 +14.28 (ok spant +12.04)
- helling 15 % (8.53°) ; 22.50·0.15 = 3.375 → 14.07+3.375 ≈ 17.44 ✔
- VH 12.0 m (onderkant spanten +12.00)
- keerwand beton as1 (d=30cm) en as13 (d=50cm) tot +6.00, daarboven staalplaatbekleding
Fasen:
- Fase 1: dak as1–as7 verwijderd (blauw) → dakopening ≈ 44.76 × 109.44 m
- Fase 2: gevel as1 tussen G–L opengemaakt: 36.661 m × 10.837 m (rode kaders) ≈ 397 m²
- Fase 3: spanten/kolommen K,J,I,H verwijderd ; Fase 4: opbouw
Te behouden dakdeel (oranje): as7–as13 (loods overspanning 2) + as13–as14 (open luifel), volledige lengte A–P.
Rechtergevel = "GESLOTEN WAND" op as13 (luifel zonder invloed volgens opdrachtgever), 109.44 m × 14.23 m.

## PASS 2 – Normatieve berekening (AFGEROND – keuzes)
NA België (ANB 2010):
- vb,0 = 26 m/s (Tabel 4.2 ANB: Oost-Vl., arr. Gent) ✔ = opgave ; cdir Tabel 4.3 ANB (oriëntatie onbekend → 1.0)
- cseason Tabel 4.4 ANB (nov = 1.0; duur 1 mnd–1 jaar → hoogste maandwaarde) ; cprob Tabel 4.5 ANB (T=2→0.78, 5→0.85, 10→0.90, 50→1.0), K=0.2 n=0.5 normatief
- kr = 0.19(z0/0.05)^0.07, cat III z0=0.3 zmin=5 ; kI = 0.95 voor cat III (4.4 ANB) ; ρ = 1.25 ; c0 = 1 (helling <5 %)
- controle: Tabel 4.9 ANB qp(18 m, III) = 862 N/m² = formule ✔
- 5.3(5) ANB: correlatiefactor 0.85 NIET toepassen
- 7.2.2(1) ANB: ze lij/zijgevels = h ; 7.2.9(6) ANB: cpi = +0.2 / −0.3 bij onbekende permeabiliteit
- 7.3 ANB: zadeldak-overkapping: globale kracht in midden van elke helling + asymmetrisch geval
- Tabellen EN: 7.1 (gevels), 7.4a/b (zadeldak), 7.10d (geschakeld), 7.7 (overkapping), 7.13/7.2.9 (cpi), 6.2 (cscd)
Modelkeuzes:
- R1 (as7–13) = zadeldak α = 15 % (8.53°), behandeld als eerste overspanning (fms = 1.0, conservatief)
- Luifel (as13–14) = open zadeldak-overkapping Tabel 7.7, φ: van rechts = 1, anders 0 (7.3(4))
- Rechtergevel as13: Tabel 7.1, h = 17.44, d = 89.52/90, b = 109.44 ; e = 34.88
- cpi-scenario's: S1 +0.2 | S2 −0.3 | S3 dominante dakopening (dak as1–7 weg, 7.2.9(5): 0.9·cpe,gem) | S4 dominante gevelopening as1 (optioneel) | S5 manueel
- Tijdelijk: geen standaardreductie; cprob via terugkeerperiode (EN 1991-1-6 §3.1, niet aangeleverd) enkel als apart scenario ; γQ = 1.5 (EN 1990 A1.2(B)), ψ0 = 0.6
- WAARSCHUWING: plan vermeldt "WIND Vb=26m/s WINDCAT II" ↔ opdracht cat III

## PASS 3 – HTML-tool (AFGEROND) → /home/user/windberekening/windberekening_loods_gent.html
- bronnen in src/ (engine.js = rekenkern, ui.js, view3d.js, template.html, defaults.js); build: python3 src/build.py <pad naar three@0.128.0 package>
- Three.js r128 + OrbitControls ingebed → werkt offline (≈ 780 kB)
- getest (Chromium headless): 26/26 controles OK, handberekening = JS, validatie, tijdelijk scenario, cat. II, CSV/JSON, gsm-breedte 390 px
Kernresultaten (standaardinvoer, karakteristiek, cat. III, geen duurreductie):
- qp(17,44 m) = 0,853 kN/m² (cat. II: 1,148)
- Dak as 7–13: lokaal −2,15 / +0,55 kN/m² ; globaal −1,45 ; totaal opwaarts 3357 kN, neerwaarts 2359 kN
- Luifel: cp,net lokaal −1,71 / +1,54 kN/m² ; totaal opwaarts 5483 kN
- Rechtergevel: lokaal +1,17 / −1,37 kN/m² ; globaal +0,91 / −1,19 ; totaal 1419 kN naar binnen (M voet 10 099 kNm)

## REVISIE 2 – enkel EN 7.3 open overkappingen (AFGEROND)
- bronnen: src2/ (engine.js, ui.js, view.js, template.html, defaults.js); build: python3 src2/build.py <three-pakket>
- invoer: aantal velden n (fig. 7.18 / tabel 7.8 ψmc), d, b, he, α (−20…−5 / +5…+30, fig. 7.17, tabel 7.7), blokkering φ %, lokaal c_p,net ↔ globaal c_f
- ANB-factoren behouden: vb,0, cat., c0, kI, cdir (tabel 4.3), cseason (4.4), cprob (4.5), γQ, KFI, cscd, wrijving (tabel 7.10)
- één pagina (geen tabbladen), offline-bestand met ingebedde Three.js; vorige versie: windberekening_loods_gent_v1_volledig.html
- standaard (luifel 45,14 × 109,44, α 8,53°, φ 100 %): qp(17,62) = 0,856 kN/m²; lokaal −1,71 / +1,54 kN/m²; ΣFz opwaarts 5497 kN, neerwaarts 1567 kN

## REVISIE 3 – universeel model (AFGEROND)
- bronnen: src4/ (engine.js = universele rekenkern, canopy.js = EN 7.3-kern, ui.js, view.js, template.html, defaults.js); build: python3 src4/build.py <three-pakket>
- daken per overspanning aan/uit + verwijderde lengte; wanden W0–W3 (as 1/7/13/14) en gevels A/P per overspanning aan/uit + openingen m²; fase-2-opening as 1
- volumes = overspanningen gescheiden door aanwezige tussenwanden; per volume EN 7.2.9(2): ≥ 2 vlakken > 30 % open ⇒ open (dak 7.3, wanden 7.4 tabel 7.9) anders gesloten (7.2 + c_pi 7.2.9 dominante zijde / fig. 7.13 + S1/S2)
- geschakeld dak automatisch (fig. 7.10d): eerste aanwezige gesloten overspanning ×1,0, tweede H/I ×0,8, daarna ×0,6
- 3D: navigatie v2 + maatlijnen overspanningen, lengte, hoogtes; standaard = handberekening OK, 26/26 controles

## REVISIE 4 – controle WInt + Wind.xlsx (AFGEROND)
- coëfficiënten F/G/H/I/J, D/E, q_p identiek aan WInt (α 8,25°, h 17,4); c_pi S3 = Wind.xlsx (−0,524)
- nieuw: S5 (grensvlak verwijderd dak = open loefgevel, = WInt +0,647), optie zone I 5° +0,2, optie z_e zone D = bovenkant gevel
- luifel: z_e = h tot dakrand (fig. 7.17) = 14,23 m; φ per richting (R 100 %, L/A/P 0 % volgens 7.3(4))
- oranje invoerkaders verwijderd

## REVISIE 5 – rapport per zone (AFGEROND)
- nieuwe sectie 3b: per windrichting × dakgeval (4 bij ⟂ nok, 1 bij ∥ nok) dakaanzicht + gevelaanzichten met zone, c_pe/c_pi, w + tabel; eigen keuzes (c_pi-scenario, lokaal/globaal, opwaarts/neerwaarts, kar./ontwerp, richting); offline: knop "Rapport afdrukken / PDF"
- aannameblokken → gewone lijst; oranje tags/rijkleuring neutraal

## REVISIE 6 – bestanden en rapportdialoog (AFGEROND)
- Project opslaan/openen (.json, formaat "windbelasting-loods-gent", onbekende velden genegeerd, ook slepen op invoerpaneel)
- CSV/JSON/project/rapport: offline als download; gepubliceerde pagina via downloads-capability (klembord als terugval)
- Rapport…-dialoog: onderdelen, windrichtingen, dakgevallen, gevelaanzichten, instellingen → Afdrukken/PDF (offline) of Exporteren als HTML

## Versie 1.5.0 – belastingen per element en tabbladen
- nieuw `src/elements.js`: spantposities (standaard 16 spanten A–P uit plan 2161/A), invloedsbreedtes, lijnlasten per spant (c_pe,10, c_s c_d), dakliggers scharnierend per overspanning/luifelveld → reacties per kolomlijn; kolommen in kopgevels (opening fase 2 in rekening); omhullende over richting × dakgeval × c_pi × overkappingsopstelling; gordingen/gevelregels met c_pe(A = L·h.o.h.); gevelkolommen A/P; windverbanden langsrichting met wrijving (EN 5.3(4)-toets)
- controles: Σ spanten = totale dak- en kopgevelkracht (alle combinaties), Σ overkapping = fig. 7.17, evenwicht per spant, invloedsbreedtes sluitend
- interface: tabblad "Invoer en model" (invoer in kolommen + live model en status) en "Resultaten"; menu "Bestand"; statusregel in de kop

## Versie 1.6.0 – drie talen
- taalkeuze English / Nederlands / Français in de kop, standaard English, onthouden in localStorage
- `src/i18n.js`: woordenboekvertaling in één doorgang (langste fragment eerst, woordgrenzen), haken op innerHTML / insertAdjacentHTML / textContent, vaste paginatekst opnieuw ingevuld vanuit het Nederlands; "as n" → axis/axe; Engels met decimaalpunt
- `src/lang/d1–d4.txt`: ca. 870 fragmenten; build.py zet ze om naar I18N_DICT en weigert dubbele sleutels met verschillende vertaling
- rapport (afdrukken en HTML-export) in de gekozen taal; eigen opmerkingen en bestandsnamen worden niet vertaald

## Versie 1.7.0 – indeling invoer en rapport per element
- tabblad Invoer: status, invoer als inklapbaar menu (groepen in raster, standaard dicht, toestand onthouden, Alles open/dicht; groep met fout gaat open), daaronder model (plan + doorsnede) en het 3D-model
- tabblad Resultaten: "1. Model en automatisch gekozen theorie" (uitleg, figuren, volumes, berekende delen)
- rapportdialoog: Annuleren draait wijzigingen terug, "Opslaan en sluiten" bewaart de instellingen (ook na herladen); keuze van het spant voor §3c
- rapport §3c: per windrichting × dakgeval × overkapping op/neer (zelfde keuze als het rapport per zone), daarna omhullenden en secundaire elementen
- §3c: c_pe en c_pi per segment in diagram en tabel + uitleg wanneer het dak netto neerwaarts belast wordt door inwendige zuiging

## Versie 1.8.0 – spanten in 3D, tekenafspraak
- 3D: spanten (posities uit Draagconstructie) als liggers en kolommen met letter A–P, schakelaar "spanten"; het in §3c gekozen spant oranje gemarkeerd; zonder spantposities blijven de oude kolomstippen
- §3c: tekenafspraak EN 5.3(3), fig. 5.1 expliciet vermeld (w = w_e − w_i, + = naar het buitenvlak; inwendige onderdruk werkt naar binnen, op het dak neerwaarts) – rekenwijze ongewijzigd en gecontroleerd

## Versie 1.8.1 – duidelijkheid coëfficiënten
- rapport per zone: per geval vermeld of lokale c_pe (A_lok) of globale c_pe,10 getoond worden, eenheid w [kN/m²]
- §3c: diagram toont q in kN/m én w in kN/m²; uitleg dat §3c globale c_pe,10 gebruikt (vergelijk met het rapport per zone in de stand "globaal")

## Versie 1.9.0 – diagram en c_pe-basis voor elementen
- §3c-diagram: elke sectie krijgt haar waarde (smalle secties verticaal), kleiner lettertype, eenheden achter alle waarden (q kN/m, w kN/m², F/V/H kN); overkapping toont ook de gelijkwaardige lijnlast per helling
- keuze c_pe voor spanten, kolommen en elementen: volgens belaste oppervlakte (fig. 7.2, standaard), c_pe,10 of c_pe,1; ook in het rapport §3c; de controle Σ spanten = totalen blijft op de standaardbasis

## Versie 1.9.1 – c_pe,1 / c_pe,10 expliciet
- overal waar een uitwendige coëfficiënt getoond wordt, staat nu c_pe,1, c_pe,10 of c_pe(A) volgens de werkelijk gebruikte belaste oppervlakte (fig. 7.2): samenvatting, rapport per zone (ondertitel, labels, tabel), 3D-labels, §3c-diagram en -tabellen (spanten, gordingen, gevelregels, gevelkolommen); overkapping blijft ψ·c_p,net / ψ·c_f

## Versie 1.9.2 – beknoptere tekst, geen dubbele resultaten
- uitlegparagrafen ingekort tot één regel per onderdeel (kop, invoer, §1, §3b, §3c, §7, §9, §10); herhaalde uitleg (theoriekeuze, tekenafspraak, “Model.”-paragraaf in §3c, “Gevels: zie dakgeval 1”) geschrapt
- plan en doorsnede staan enkel nog in het tabblad Invoer; het rapport neemt ze mee bij “Model en gekozen theorie”
- §8 toont enkel nog alle combinaties (de maatgevende waarden staan in §2 en §3b); §9 toont enkel de maatgevende rij per deel
- identieke rijen samengevoegd: gevel A en P (gespiegeld identiek) als “Gevel A/P” in §2 en §3c, zelfde windrichtingen in §10, zelfde duur in §11, dubbele zones in §3b als “(2×)”

## Versie 1.10.0 – overspanningen 1–3, c_pe⁺/c_pe⁻ en symbolen in de figuren
- asnummering verdwijnt uit de tool: overspanningen heten overspanning 1, 2, 3; wanden: linkergevel (overspanning 1), wand overspanning 1|2, wand overspanning 2|3, rechtergevel (overspanning 3); langsgevels blijven A/P; windrichtingen: van rechts/links ⟂ nok, van A/P ∥ nok; kolomlijnen links, 1|2, 2|3, rechts
- figuren (rapport per zone, gevelaanzichten, 3D-labels, §3c-diagram): elke waarde met symbool en eenheid (c_pe, c_pi, ψ·c_p,net, ψ·c_f, w [kN/m²], q [kN/m], F/V/H [kN]); c_pe en c_pi altijd zichtbaar, ook bij smalle zones
- dakzones bij wind ⟂ nok tonen c_pe⁺ of c_pe⁻ (positieve/negatieve reeks van tabel 7.4a), ook in de tabel van het rapport per zone en in de 3D-tooltip
