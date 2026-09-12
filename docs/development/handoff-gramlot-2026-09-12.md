# Handoff Gramlot — ripartenza del 12 settembre 2026

Documento di continuità richiesto dal proprietario, in italiano. Fotografia del
repository e delle decisioni disponibili durante questa sessione. Non è una
nuova autorizzazione a pubblicare, creare tag o riprendere tutto il backlog.

## 1. Punto di ripartenza

Il framework Gramlot è in pre-alpha. Il primo rilascio usabile è previsto per
fine 2026: è un obiettivo, non una garanzia. La priorità emersa nell'ultima
conversazione è organizzare distribuzioni per sviluppatori e rilasci espliciti
tramite tag, separati dai deploy delle applicazioni.

Il framework contiene già numerose funzionalità oltre alla wheel utilizzata dal
sito pubblico. Non confondere il contenuto di `main`, il working tree corrente,
la wheel congelata usata dai consumer e una distribuzione pubblicata.

Stato Git verificato:

- Repository canonico: `/Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/gramlot`.
- Repository GitHub: `genropy/gramlot`.
- HEAD locale: `c82f859423bc5037536de31c4b68101d3fa7a9e7`.
- CI di questo commit: riuscita, esecuzione **34649992949**.
- Numerose modifiche locali non committate: elenco completo in fondo.
- Non sono state applicate modifiche al framework per scrivere questo handoff.

## 2. Letture iniziali e precedenza delle decisioni

Leggere `AGENTS.md`, poi:

1. `docs/context/README.md`.
2. `docs/context/decisions.md` e `docs/context/open-work.md`.
3. `docs/context/gramlot-builder.md` prima di cambiare le API di authoring.
4. `docs/development/browser-distribution-proposal.md` per il bundle in corso.
5. `docs/guides/javascript-only.md`, `docs/fastapi.md` e `docs/release.md`.
6. Il nuovo registro delle decisioni di release nel repository del sito:
   `/Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/gramlot-site/docs/release-policy-decisions.md`.

Le memorie contengono anche riferimenti storici: ad esempio `gramlot.com`,
`demo-rosetta` e la PoC API descritta come sospesa. Non ripristinarli come stato
corrente. I riferimenti pubblici attuali sono `www.gramlot.org`,
`rosetta.gramlot.org` e il repository `genropy/gramlot-rosetta`.
Le direttive più recenti del proprietario prevalgono su note storiche e proposte.

## 3. Confini fra i progetti

| Progetto | Responsabilità |
| --- | --- |
| Gramlot | Authoring Python, builder, runtime browser JS, componenti, servizi, inspector, adapter FastAPI opzionale, distribuzioni |
| Gramlot Rosetta | Consumer FastAPI indipendente; confronto fra Gramlot Python, Gramlot JS, React, Vue, NiceGUI |
| Gramlot site | Sito pubblico HTML/CSS con esempi isolati, pagine di presentazione e download; server Genro ASGI |
| Bag, TYTX, Builders, Toolbox | Dipendenze generiche esterne; non duplicarne l'implementazione |

Genro ASGI non deve diventare dipendenza né extra del framework. FastAPI è invece
un'integrazione opzionale implementata in `gramlot.contrib.fastapi`.
La licenza prevista per Gramlot è Apache 2.0; preservare le notice di terze parti.

Rosetta locale: `/Users/gporcari/Sviluppo/genro_ng/gramlot-rosetta`.
Sito locale: `/Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/gramlot-site`.

## 4. Direttive di authoring da non perdere

- Gli autori delle applicazioni sono principalmente programmatori Python.
  Applicazioni e PoC si scrivono in Python; piccoli frammenti JS sono accettabili
  quando necessari. L'opzione JS standalone resta un caso esplicitamente voluto.
- Un'applicazione presentata come Gramlot deve usare Gramlot: Source, Data Bag,
  binding, controller, resolver e componenti. Niente DOM parallelo, scraping
  degli input, event wiring manuale o fetch applicativo per aggirare il framework.
- Una capacità mancante va resa esplicita e implementata in modo riusabile nel
  framework, non nascosta in una facciata specifica del sito o della demo.
- Il codice mostrato deve essere esattamente quello eseguito. Shell HTML,
  bootstrap, import/export di file e contesto editoriale devono essere distinguibili
  dalla recipe; niente esempi artificialmente brevi con implementazione nascosta.
- Preferire API e semantica Genropy legacy. Le differenze intenzionali hanno un
  registro in `docs/context/legacy-differences.md`.
- Formule: destinazione ed espressione posizionali, seguite dagli ingressi reattivi
  nominati. Esempio JS: `root.dataFormula('.balance', 'income - expenses',
  {income: '^.income', expenses: '^.expenses'})`.
- Nelle recipe didattiche usare binding letterali; niente sintesi di path o formule
  con template string, map/join, Object.entries o mini-DSL. Helper semplici sono
  ammessi per riuso reale del layout, accettando i binding senza trasformarli.
- Aggregati: collegare la formula all'intera Bag della categoria e usare
  `sum('#v')`, oppure `sum('#a.amount')` per attributi. Risultati in un ramo esterno
  (`totals.personal`), per non sommare il totale dentro se stesso. Verificare
  inserimenti, aggiornamenti e cancellazioni.
- CSS della Page: `root.css` / `root.styleSheet`, parti e variabili supportate.
  Non manipolare shadow root nelle applicazioni. Le risorse esterne non vengono
  incorporate automaticamente nell'HTML standalone.
- Per inizializzazione dati è desiderata una singola dichiarazione JSON annidata,
  ma verificare conversione in Bag e propagazione eventi nell'artefatto effettivo.
  Il consumer budget conserva il resoconto dei gap in
  `gramlot-site/docs/budget-json-initialization.md`.
- Non imporre un locale nella recipe budget. Distinguere arrotondamento di
  presentazione e valore dati; non aggiungere Math.round senza necessità.
- La direzione standalone è una classe Page con main/helper, con bootstrap a carico
  dell'exporter. `GramlotStandalonePage` era una proposta, non una classe da assumere
  disponibile. Un bundle ESM servito via HTTP non equivale a un HTML offline.

## 5. Funzionalità presenti nel framework e relativi riferimenti

Questa sezione riassume codice/documentazione locale, non un audit completo
rieseguito durante la stesura né una promessa sulla vecchia wheel pubblica.

- Component alpha: descrizioni e registrazione Web Components, ControlElement,
  decorazione e stato campo condivisi, dichiarazioni Python dal catalogo.
  Riferimento: `docs/development/component-alpha-implementation-2026-09-11.md`.
- Source-owned CSS, publish/subscribe, formattazione numerica e temporale:
  guide in `docs/guides/style-resources.md`, `publish-subscribe.md`,
  `number-formatting.md`, `display-formatting.md`.
- Date simboliche: campo testo e calendario, conferma Enter/blur, annullamento
  Escape. `period_to` resta mancante; contesto menu/help rinviato.
- Griglie residenti: Data Bag, `datamode` bag/attr, selezione stabile e struttura
  legacy via `structpath`, celle in `view_0.rows_0.cell_*`, proprietà negli attributi.
  Formule residenti con catene, parametri `formula_*` e aritmetica Decimal entro
  una grammatica limitata. Vedere `docs/guides/static-grid.md` e audit collegati.
- Resolver `urlResolver` / `openApiResolver` e servizi OpenAPI browser riusabili.
  Guide: `docs/guides/http-resolvers.md`, `docs/guides/openapi-client.md`.
- Inspector Source/Data: non perdere la distinzione fra SourceBag strutturali e
  normali Data Bag. I bug recenti di preparazione e ownership degli store sono
  descritti nel checkpoint della distribuzione browser.

## 6. API Explorer: stato aggiornato rispetto alla conversazione iniziale

La vecchia PoC JS con app.js e adattatori DOM è stata superata. Il README attuale
la descrive come **Python OpenAPI explorer**, con applicazione in `page.py`.

- `root.openApiClient()` installa il comportamento riusabile.
- `content.openApiForm()` genera la Source del modulo.
- Implementazione dei servizi in `js/dom/src/services/openapi-client.js` e
  `openapi-schema.js`.
- `index.html` è solo host/import map/mount point; il server Node compila Python
  in TYTX e serve asset e API dimostrative locali.
- Source visualizza Python reale in CodeMirror readonly.
- Limiti: OpenAPI parziale; riferimenti locali, campi scalari path/query/header e
  JSON body. Annidamenti tramite editor JSON, non form visuali annidati. Mancano
  external refs, composizioni, file/multipart e flussi OAuth completi.
- La forma degli array JSON nelle Bag non è garantita attraverso TYTX.

Comandi di riferimento dal README, da eseguire solo dopo aver verificato il contesto:

```sh
.venv/bin/python scripts/prepare_assets.py
.venv/bin/python docs/examples/teaching/build_preview.py --output build/teaching-preview
node docs/examples/gramlot-api-poc/server.mjs
node --test js/dom/tests/openapi-poc.test.js
node --test docs/examples/gramlot-api-poc/schema.test.mjs
```

Porta predefinita 64324, configurabile con PORT. Il link 56489 indicato dal
proprietario funzionava per la precedente vista compact-4; non assumere che una
porta storica identifichi ancora il processo attuale.
La pagina pubblica `https://www.gramlot.org/experiments/api-explorer/` è una
presentazione, non un deploy della PoC. Il suo screenshot è della precedente v2:
va rivalutato prima di presentarlo come stato visivo dell'ultima implementazione.

## 7. Bundle browser: lavoro locale da portare a conclusione

La proposta è già indicata come accettata e implementata localmente. Il nome
previsto è `gramlot-browser-<version>-<build-id>.zip`; l'archivio contiene una
cartella versionata, manifest, moduli ESM/chunk, risorse e licenze.

Il bundle non è necessariamente un solo file JS: include entry point pubblici,
chunk condivisi e caricamenti lazy. Va consumato intero, senza ricostruire il
runtime in ogni applicazione. La wheel deve incorporare gli stessi byte del ZIP.
Installare la wheel non deve richiedere Node né compilazione JS lato consumer.

File centrali locali:

- `scripts/build_browser_bundle.mjs`
- `scripts/build_browser_distribution.py`
- `scripts/verify_browser_distribution.py`
- `scripts/prepare_assets.py`, `hatch_build.py`, `scripts/verify_distribution.py`
- `src/gramlot/contrib/fastapi/runtime.py`
- `tests/browser_distribution.mjs`, `tests/test_browser_distribution.py`,
  `tests/test_fastapi_browser_distribution.py`
- `.github/workflows/ci.yml`, `.github/workflows/publish.yml`

Il manifest distingue frameworkVersion, buildId, entryPoints e inventario dei file
con hash/dimensioni. Il buildId non sostituisce una verifica di riproducibilità.
FastAPI deve servire il payload versionato con cache immutable solo per asset
validi; HTML/configurazione e 404 non devono ricevere cache immutabile.
Conservare asset vecchi abbastanza a lungo per pagine aperte e moduli lazy.

Checkpoint documentato, NON rieseguito in questo handoff:

- 342 test runtime e 20 test combinati adapter/distribuzione riportati superati.
- 45 file byte-identici fra archivio e wheel.
- Build corretto riportato: `8f3eac851e6680a0`.
- Verifiche browser su 8053/8054, inspector Source/Data e riapertura.

Questi risultati sono evidenza locale riportata, non un rilascio pubblico né il
risultato della CI del working tree non committato.

## 8. Decisioni appena concordate sui rilasci

- Push su main e PR: verifica, senza pubblicazione o deploy.
- Tag di versione: avvia il rilascio del repository interessato dopo i controlli.
- Tre flussi indipendenti: framework, sito, Rosetta.
- Framework: due opzioni per sviluppatori, Gramlot JS e Gramlot JS + adapter
  FastAPI. Stessa versione e stesso payload browser.
- Canale concordato: asset di GitHub Release, note e checksum, prerelease esplicite.
- PyPI/npm/CDN non sono impliciti. Nessuna nuova pubblicazione PyPI autorizzata
  dalla sola decisione di distribuire bundle su GitHub.
- Il formato finale dell'opzione FastAPI va deciso: wheel con esempio, ZIP
  accompagnatorio ecc. Non promettere dipendenze già incluse o installazione offline.
- Release immutabili: non spostare tag né sostituire silenziosamente i byte.
- Creare un tag framework non aggiorna automaticamente sito o Rosetta.

### Conflitti concreti da correggere PRIMA del primo tag

Il `.github/workflows/publish.yml` locale letto in questa sessione:

1. pubblica con PyPI Trusted Publishing;
2. fa dipendere GitHub Release dal job PyPI;
3. usa `gh release upload ... --clobber` sulle release esistenti;
4. richiede `v` seguito esattamente dalla versione in pyproject.toml.

Questa configurazione non implementa ancora la nuova policy GitHub-only e
immutabile. Il tag illustrativo `v0.1.0-alpha.2` non è un numero deciso e potrebbe
non corrispondere alla sintassi della versione Python: definire e validare la
mappatura. Non creare un tag per “provare” finché il workflow non è allineato.
Le CI dei consumer hanno ancora deploy su main: migrazione separata, documentata
nel registro di release del sito, incluse regole dell'environment e bypass manuali.

## 9. Ultima correzione CI consolidata

La CI di `949f989` falliva su Python 3.11/3.12: quattro file generati textbox
risultavano diversi; Python 3.14 passava. La differenza effettiva era l'indentazione
nelle docstring esportate, non una differenza funzionale dei componenti.

Commit `c82f859`:

- usa `inspect.cleandoc` sulle docstring degli elementi esportati in
  `docs/examples/components/textbox/generate.py`;
- rigenera i due file `*-builder-grammar.json` e i due `*-contract.js`;
- mantiene il controllo di riproducibilità, senza escluderlo dalla CI.

Verifiche effettuate nella sessione:

- generazione/check identici con Python 3.12 e 3.14, Builders 0.23.2;
- quattro test `tests/test_component_guide.py` superati;
- CI completa verde su Python 3.11, 3.12, 3.14, browser, documentazione e package.

CI: https://github.com/genropy/gramlot/actions/runs/34649992949
Questa CI valida il commit, non le modifiche locali successive o ancora fuori Git.

## 10. Stato consumer utile per non rompere l'integrazione

Il sito e Rosetta usano una wheel congelata approvata dal proprietario, SHA-256:
`90a1558181efb9bb0f2555659263fe8a97696462afa26f3b046bc09b3ef85e7d`.
Non equivale automaticamente all'attuale framework main. Il pin pubblico è
rimasto `gramlot==0.1.0a1`; in questa sessione non è stata pubblicata una nuova wheel.

- https://www.gramlot.org/ — homepage con applicazioni e percorsi didattici.
- https://www.gramlot.org/rosetta/ — introduzione; rimosso il riquadro indicato dal proprietario.
- https://rosetta.gramlot.org/overview/ — rimosso il link Visual builder.
- https://www.gramlot.org/experiments/visual-editor/ — esperimento separato.
- https://www.gramlot.org/experiments/api-explorer/ — presentazione della PoC.

Rosetta commit `33ec49f`, sito commit `39a8ddd`: rimozioni pubblicate e verificate.
Togliere il link dall'overview non ha rimosso l'endpoint builder usato dalla pagina
pubblica dell'esperimento. Nessun nuovo problema di raggiungibilità è stato
riprodotto: home e Hello World nelle cinque implementazioni rispondevano.

La precedente pubblicazione accidentale di una wheel in un'immagine temporaneamente
pubblica è registrata nel runbook/storico del sito; il proprietario ha autorizzato
il proseguimento. Conservare i confini attuali dei pacchetti privati, senza riaprire
un audit o cambiare visibilità come effetto collaterale del lavoro sui bundle.

## 11. Sequenza operativa consigliata per ripartire

1. Confermare cwd, branch e status Git; leggere il registro di release del sito.
2. Separare il lavoro bundle/distribuzione dalle modifiche didattiche e dagli
   esperimenti ancora untracked. Non usare `git add .`, reset o pulizie generiche.
3. Leggere integralmente build/verify browser e relativo manifest; verificare
   le assunzioni dell'adapter e confrontare ZIP/wheel effettivi.
4. Rieseguire i test mirati di distribuzione/adapter e il caricamento reale
   dell'inspector usando gli artefatti, poi i controlli richiesti dalla CI.
5. Allineare il workflow di release alle decisioni del punto 8 prima di taggare.
6. Preparare le due esperienze di installazione con esempio minimo verificato;
   rendere evidente la differenza fra static hosting, FastAPI e export offline.
7. Rivedere/stagiare soltanto il perimetro concordato; far passare la CI del commit.
8. Solo con numero e azione di release espliciti, creare il tag e pubblicare gli
   asset. Verificare download, checksum, installazione ed esempi della release.
9. Aggiornare i consumer in task/commit separati e con versioni esplicite.

Altri temi conservati, non automaticamente prioritari: audit DRY/componenti,
menu/context menu, store remoti, LocalDB, esempi didattici aggiuntivi, limitazioni
OpenAPI. L'handoff non autorizza a implementarli tutti.

## 12. Prompt pronto per una nuova sessione

> Riprendi Gramlot leggendo AGENTS.md, docs/context e questo handoff. Il repository
> contiene lavoro locale non committato: preservalo e individua il perimetro prima
> di modificare file. La priorità è completare e verificare il bundle browser e
> l'opzione FastAPI, allineando la release GitHub ai tag e separandola da PyPI e dai
> deploy dei consumer. Non creare tag o pubblicare per il solo fatto di aver letto
> il documento. Distingui verifiche del commit, test locali riportati e release
> effettive; usa esclusivamente API Gramlot nelle applicazioni.

## 13. Snapshot completo del working tree alla stesura

Lo snapshot seguente precede l'aggiunta di questo handoff. Le directory untracked
possono contenere più file: l'elenco non ne sostituisce la revisione.

```text
 M .github/workflows/ci.yml
 M .github/workflows/publish.yml
 M README.md
 M docs/examples/teaching/10-local-logic/controller/recipe.js
 M docs/examples/teaching/10-local-logic/controller/recipe.py
 M docs/examples/teaching/10-local-logic/inline/recipe.js
 M docs/examples/teaching/10-local-logic/inline/recipe.py
 M docs/examples/teaching/10-local-logic/passive/recipe.js
 M docs/examples/teaching/10-local-logic/passive/recipe.py
 M docs/examples/teaching/10-local-logic/recipe.js
 M docs/examples/teaching/10-local-logic/recipe.py
 M docs/examples/teaching/README.md
 M docs/examples/teaching/manifest.json
 M docs/fastapi.md
 M docs/release.md
 M hatch_build.py
 M js/dom/package-lock.json
 M js/dom/package.json
 M scripts/prepare_assets.py
 M scripts/verify_distribution.py
 M src/gramlot/contrib/fastapi/runtime.py
 M tests/test_teaching_examples.py
?? docs/development/browser-distribution-proposal.md
?? docs/development/handoff-rosetta-comparisons-2026-09-11.md
?? docs/development/localdb-possibility-2026-09-11.md
?? docs/development/rosetta-public-loading-diagnosis-2026-09-11.md
?? docs/development/webstruct-declarations-legacy-audit.md
?? docs/examples/standalone-storage/
?? docs/examples/teaching/16-date-input/
?? docs/examples/teaching/17-text-mask/
?? docs/examples/teaching/18-date-format/
?? docs/examples/teaching/19-required-validation/
?? docs/examples/teaching/20-tree-selection/
?? docs/examples/teaching/21-grid-records/
?? docs/examples/teaching/22-grid-attributes/
?? docs/examples/teaching/23-email-validation/
?? docs/examples/teaching/24-number-validation/
?? docs/guides/javascript-only.md
?? scripts/build_browser_bundle.mjs
?? scripts/build_browser_distribution.py
?? scripts/verify_browser_distribution.py
?? test-results/
?? tests/browser/tutorial-chapters.spec.js
?? tests/browser_distribution.mjs
?? tests/test_browser_distribution.py
?? tests/test_fastapi_browser_distribution.py

```
