# Rosetta — guida di installazione, documentazione e prova

Guida per il collaboratore · 8 settembre 2026 · Preview sperimentale

Questa guida accompagna dal download alla prima prova della stessa interfaccia in
**React, Vue, Genro Pages Python e Genro Pages JavaScript**. Comprende l’apertura
del manuale tecnico in inglese e la consultazione in italiano tramite Chrome.

La procedura usa i repository pubblici: non richiede accesso al computer dell’autore,
credenziali GitHub o checkout Genro già installati. Il setup scarica revisioni precise
e crea gli ambienti di lavoro dentro la cartella della demo.

## 1. Cosa si ottiene

- Una demo FastAPI locale con nove esempi in quattro implementazioni.
- Il sorgente di ciascun esempio accanto all’interfaccia, con separazione tra pagina,
  codice di integrazione e parti comuni.
- Un editor JavaScript live e l’inspector di Data e Source nelle varianti Pages.
- Il manuale tecnico con architettura, sorgenti, runtime e schemi dei repository
  separati e del repository unico `genro-gui` proposto.

**Lingue del manuale:** l’originale è in inglese. Chrome può tradurre il testo in
italiano; non si tratta di una seconda traduzione revisionata. Codice, simboli e
schemi grafici restano in originale. La proposta `genro-gui` è distinta dalla
struttura effettivamente implementata.

## 2. Requisiti del computer

| Strumento | Requisito / funzione |
| --- | --- |
| Sistema | macOS o Linux con Bash. La verifica di questa preview è stata eseguita su macOS. |
| Git | Scarica la demo e i repository delle dipendenze. |
| uv | Gestisce Python e l’ambiente virtuale della demo. |
| Python | 3.12, installabile anche tramite uv. |
| Node.js e npm | Per costruire React, Vue e l’editor. Usare Node 24 LTS; Vite della preview dichiara `^20.19.0 || >=22.12.0`. |
| Chrome | Per la demo e la traduzione del manuale. |
| Internet | Necessario per il primo setup; alcune risorse opzionali della demo possono richiederlo anche durante l’uso. |

Gli script forniti sono Bash: non eseguirli direttamente in PowerShell. Su Windows
serve un ambiente Linux, per esempio WSL, ma questa guida non documenta una verifica
Windows/WSL. Per la prima prova è preferibile un ambiente macOS o Linux.

Aprire il Terminale e controllare:

```bash
git --version
uv --version
node --version
npm --version
```

Se manca Git, usare le [istruzioni ufficiali di installazione](https://git-scm.com/install/).
Per Node usare l’[installer ufficiale](https://nodejs.org/en/download), scegliendo
Node 24 LTS e l’architettura del proprio computer. npm è incluso nelle normali
installazioni Node. Dopo l’installazione riaprire il Terminale e ripetere i controlli.

Per installare uv su macOS/Linux, la documentazione ufficiale propone:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Riaprire il Terminale, quindi:

```bash
uv --version
uv python install 3.12
```

Riferimenti: [installazione uv](https://docs.astral.sh/uv/getting-started/installation/)
e [gestione Python con uv](https://docs.astral.sh/uv/guides/install-python/).

## 3. Scaricare Rosetta

Scegliere una cartella in cui conservare il progetto. Per esempio:

```bash
mkdir -p ~/Progetti
cd ~/Progetti
git clone https://github.com/genropy/demo-rosetta.git
cd demo-rosetta
```

Da questo punto, salvo indicazioni diverse, **tutti i comandi vanno eseguiti dentro
`demo-rosetta`**. Se si apre un nuovo Terminale:

```bash
cd ~/Progetti/demo-rosetta
```

Se si è scelto un altro percorso, sostituirlo nei comandi `cd`. Non copiare
percorsi `/Users/gporcari/...` eventualmente presenti nei documenti storici: sono
registrazioni del computer di sviluppo, non istruzioni per il collaboratore.

Il repository di partenza è [genropy/demo-rosetta](https://github.com/genropy/demo-rosetta).
Il clone normale segue il branch `main`. Per annotare esattamente la versione scaricata:

```bash
git rev-parse HEAD
```

## 4. Installare e costruire la demo

```bash
ROSETTA_PYTHON=3.12 ./scripts/setup.sh
```

Attendere il messaggio finale:

```text
Ready. Run scripts/run.sh.
```

Il setup svolge queste operazioni:

1. Crea `.venv/` e installa le dipendenze Python da `requirements.lock`.
2. Installa le dipendenze npm fissate nei lockfile.
3. Costruisce l’editor e le applicazioni React e Vue.
4. Scarica Pages, Builders e DOM in `.local/dependencies/` ai commit previsti.
5. Installa le dipendenze del runtime JavaScript e prepara i collegamenti locali.

Non occorre attivare manualmente `.venv` per usare `setup.sh`, `run.sh` o `check.sh`.
Non occorre installare Genro ASGI: Rosetta usa FastAPI e carica i sorgenti Pages
necessari alla prova. L’assenza di Genro ASGI è verificata dai test della demo.

Se il setup termina con un errore, conservare le ultime righe e risolverlo prima
di avviare la demo. Un messaggio npm di avvertimento non equivale necessariamente
a un errore: controllare che il setup raggiunga il messaggio finale sopra indicato.

## 5. Avviare Rosetta

Nel primo Terminale:

```bash
./scripts/run.sh
```

Il server mostra un indirizzo simile a `http://127.0.0.1:8026`.
Lasciare aperto questo Terminale e aprire Chrome su:

**[Rosetta — Pages Python](http://127.0.0.1:8026/pages/)**

| Variante | Indirizzo locale |
| --- | --- |
| Pages Python | [Apri Pages Python](http://127.0.0.1:8026/pages/) |
| Pages JavaScript | [Apri Pages JS](http://127.0.0.1:8026/pages-js/) |
| React | [Apri React](http://127.0.0.1:8026/react/) |
| Vue | [Apri Vue](http://127.0.0.1:8026/vue/) |

`127.0.0.1` e `localhost` indicano il computer su cui gira il browser. Questi link
funzionano dopo l’avvio sul proprio computer; non sono una demo ospitata su Internet.

Per fermare Rosetta premere **Ctrl+C** nel Terminale del server. Per usarla un altro
giorno basta rientrare nella cartella e rieseguire `./scripts/run.sh`: non è necessario
ripetere l’installazione a ogni avvio.

## 6. Aprire il manuale tecnico senza un secondo setup

Il setup Rosetta ha già scaricato il manuale insieme a Pages. Aprire un **secondo
Terminale**, lasciando Rosetta attiva nel primo:

```bash
cd ~/Progetti/demo-rosetta
.venv/bin/python -m http.server 8037 --bind 127.0.0.1   --directory .local/dependencies/genro-pages/docs/manual/html
```

Aprire **[il manuale tecnico](http://localhost:8037/)** in Chrome.

Questo è un server statico per la documentazione: usa l’ambiente già disponibile
e non richiede il server applicativo Genro. Il comando `genropages manual` è previsto
nell’ambiente completo di Pages; per chi ha installato solo Rosetta, usare il
comando qui sopra.

| Terminale | Servizio | Porta | Arresto |
| --- | --- | --- | --- |
| Primo | Demo Rosetta | 8026 | Ctrl+C |
| Secondo | Manuale tecnico | 8037 | Ctrl+C |

La documentazione Markdown è leggibile anche direttamente su GitHub:
[manuale Pages](https://github.com/genropy/genro-pages/tree/codex/hello-world/docs/manual).
Quella scaricata dal setup corrisponde alla revisione Pages fissata per Rosetta;
il branch GitHub può contenere aggiornamenti successivi.

## 7. Consultare inglese e italiano

Per leggere l’originale, usare normalmente il manuale: l’HTML dichiara la lingua inglese.
Per l’italiano:

1. Aprire `http://localhost:8037/` in Chrome.
2. Fare clic destro su una zona di testo e scegliere **Traduci in italiano**.
3. Se Chrome propone un’altra lingua, usare le opzioni di traduzione per scegliere
   l’italiano. In alternativa usare l’icona di traduzione nella barra degli indirizzi.
4. Per tornare all’inglese, scegliere l’originale nel pannello di traduzione.

La traduzione richiede normalmente connettività e può dipendere dalle impostazioni
di Chrome o dalle politiche del computer aziendale. Se non compare, consultare le
[istruzioni ufficiali di Chrome](https://support.google.com/chrome/answer/173424?hl=it).
Il progetto non contiene un servizio di traduzione proprio.

Per confrontare le lingue affiancate, aprire il manuale in due schede o finestre:
mantenere l’originale in una e attivare la traduzione nell’altra. Chrome può ricordare
le preferenze per il sito: controllare la lingua mostrata in entrambe.

Nel manuale utilizzare l’indice laterale e **⌘F** su Mac oppure **Ctrl+F** su Linux.
Il comando Stampa / PDF, oppure la stampa del browser, permette di salvarne una copia.
Per condividere un PDF tradotto, verificare nell’anteprima di stampa che il testo
sia nella lingua desiderata.

## 8. Percorso di lettura del manuale

| Sezione nell’indice | A cosa serve |
| --- | --- |
| Repository maps: current & proposed | Vedere la divisione Python/JS nei repository attuali e la proposta di repository unico. |
| Architecture & dependencies | Capire componenti, confini e dipendenze. |
| Source atlas | Individuare file e responsabilità. |
| Runtime & execution paths | Seguire costruzione, binding, aggiornamenti e ciclo di vita. |
| Widgets & maintenance | Approfondire widget e punti di intervento. |
| Proposed architecture | Valutare `genro-gui` e gli adapter proposti. |
| Concurrent work / Verification record | Distinguere snapshot verificati, aggiunte successive e limiti delle prove. |

Aprire gli schemi a dimensione intera per leggere i dettagli. La traduzione del testo
non modifica le etichette interne degli SVG. Il manuale mantiene la data e i confini
dello studio originale: non attribuire automaticamente al runtime testato allora
le funzionalità aggiunte in seguito.

## 9. Provare i nove esempi Rosetta

La navigazione in alto cambia implementazione; quella laterale cambia esempio.
Passando da Pages a React o Vue, l’esempio selezionato rimane lo stesso.

| Esempio | Operazione | Risultato da osservare |
| --- | --- | --- |
| Hello World | Aprire la pagina. | Saluto fisso e campo di sola lettura. |
| Editable text | Scrivere nel campo Text, poi fare clic fuori. | L’output si aggiorna quando il campo perde il focus. |
| Text color | Cambiare il colore del testo. | Il colore dell’output cambia. |
| Background color | Cambiare il colore di fondo. | Cambia il fondo del campo di output. |
| Font size | Spostare lo slider. | Il testo cambia dimensione, da 10 a 48 pixel. |
| Font family | Scegliere serif o monospace. | Cambia il carattere dell’output. |
| Font style | Selezionare Bold e Italic. | Cambiano peso e stile del testo. |
| Local scope | Modificare testo e stile dentro il riquadro. | Le modifiche restano nello stato locale del riquadro. |
| Repeated panels | Modificare il terzo dei sei pannelli. | Gli altri cinque mantengono valori indipendenti. |

In Repeated panels provare anche **Label position**: sposta le etichette nei pannelli
attraverso un’impostazione comune, mantenendo indipendenti i dati dei singoli pannelli.

Ripetere le operazioni in tutte e quattro le implementazioni. L’obiettivo è confrontare
lo stesso comportamento e il modo in cui viene dichiarato, non soltanto contare le righe.

## 10. Leggere i sorgenti e usare gli strumenti

Il riquadro sorgente offre tre prospettive:

- **Page:** ricetta Python o codice del componente/esempio selezionato.
- **Boilerplate:** avvio, adapter e integrazione specifica della variante.
- **Common:** parti condivise della demo, come cornice e stili.

Il collegamento **View source** apre il sorgente anche separatamente. Su schermi
stretti il riquadro dei sorgenti si dispone sotto l’esempio.

### Editor di Pages JS

Aprire la variante Pages JS e la scheda Page. Cambiare, per esempio, una scritta
nella ricetta e premere **Apply**. La preview viene ricostruita dal codice modificato.

- **Manual:** applica quando si preme Apply.
- **Live:** applica a ogni modifica del testo.
- **Focus out:** applica quando si esce dall’editor.

Le modifiche dell’editor non vengono salvate nei file. Il reload ripristina il sorgente
del repository. Conservare separatamente il codice che si desidera condividere.

### Inspector nelle varianti Pages

Premere il pulsante **Inspector** della demo. Ispezionare Data e Source:
Data contiene i valori vivi; Source descrive la ricetta e i suoi attributi.

Nell’esempio Editable text selezionare in Data il valore del testo, modificarlo
nell’editor delle proprietà e premere Apply. Controllare che campo e output mostrino
il nuovo valore. In Local scope osservare il ramo `sample`; in Repeated panels
osservare i rami indipendenti dei pannelli.

Le modifiche dell’inspector riguardano l’istanza in esecuzione, non il file Python
o JavaScript. Le prove delle form in memoria sono presenti nella suite browser;
la galleria non include ancora una form applicativa completa con persistenza backend.
Orders resta fuori dalla navigazione attiva, conservato in `standby/orders/`.

## 11. Eseguire i test opzionali

Lasciare il server Rosetta in esecuzione nel primo Terminale. In un altro Terminale,
dentro `demo-rosetta`, installare il browser di test:

```bash
PLAYWRIGHT_BROWSERS_PATH=/tmp/demo-rosetta-browsers npx playwright install chromium
```

Poi:

```bash
./scripts/check.sh
```

La verifica esegue test Python, lint e test browser. Chromium di Playwright è separato
dal Chrome usato manualmente. La preview pubblicata è stata verificata con **16 test
Python e 49 test browser passati**, inclusi editor, inspector, form e pannelli ripetuti.
Questi numeri descrivono lo snapshot del rilascio della demo, non una promessa per
ogni revisione futura.

Se il server usa una porta diversa:

```bash
ROSETTA_URL=http://127.0.0.1:8040 ./scripts/check.sh
```

Per il solo inventario quantitativo dei sorgenti:

```bash
.venv/bin/python scripts/measure.py
```

## 12. Problemi comuni

| Sintomo | Cosa controllare / fare |
| --- | --- |
| `command not found: uv`, `git` o `npm` | Installare lo strumento e riaprire il Terminale. |
| Python 3.12 non trovato | Eseguire `uv python install 3.12`, quindi `ROSETTA_PYTHON=3.12 ./scripts/setup.sh`. |
| Errore Node/Vite | Controllare `node --version`; usare una versione compatibile, per esempio Node 24 LTS, e rieseguire il setup. |
| `Address already in use` per Rosetta | Avviare `ROSETTA_PORT=8040 ./scripts/run.sh` e aprire `http://127.0.0.1:8040/pages/`. |
| Porta del manuale occupata | Sostituire `8037` con `8041` nel comando del server statico e nell’URL. |
| Browser: connessione rifiutata | Verificare che il Terminale del server sia ancora aperto e che porta e URL coincidano. |
| Manuale: errore 404 | Eseguire il comando dalla radice `demo-rosetta` e verificare il completamento del setup. |
| `Missing Pages asset directory` | Verificare il setup e gli eventuali override `ROSETTA_*` presenti nella sessione. |
| `Existing checkout differs from preview` | Il setup protegge un checkout modificato o di revisione diversa. Usare un clone Rosetta in una nuova cartella per ripartire senza perdere modifiche. |
| Test browser: eseguibile mancante | Ripetere l’installazione Chromium con lo stesso `PLAYWRIGHT_BROWSERS_PATH`. |
| Traduzione italiana assente | Controllare lingua di destinazione, impostazioni di traduzione e connettività di Chrome. |

Per disattivare override ereditati da altri esperimenti prima di riprovare:

```bash
unset ROSETTA_PAGES_SOURCE ROSETTA_BUILDERS_SOURCE ROSETTA_CLIENT_MODULES ROSETTA_WITH_PAGES
./scripts/run.sh
```

Dopo modifiche alle dipendenze, riavviare Rosetta e ricaricare le schede: gli URL degli
asset incorporano una revisione calcolata all’avvio. La sola modifica di un file in
un checkout diverso non aggiorna il runtime servito.

## 13. Aggiornare o ripartire

Per controllare la situazione del proprio clone:

```bash
git status --short
git rev-parse HEAD
```

Se il clone è pulito e si desidera seguire gli aggiornamenti di `main`:

```bash
git pull --ff-only
./scripts/setup.sh
```

Se cambiano i commit delle dipendenze, il setup può rifiutare i checkout precedenti.
Per una nuova prova riproducibile, scaricare in una nuova cartella e conservare la vecchia:

```bash
cd ~/Progetti
git clone https://github.com/genropy/demo-rosetta.git demo-rosetta-nuova
cd demo-rosetta-nuova
ROSETTA_PYTHON=3.12 ./scripts/setup.sh
./scripts/run.sh
```

Fermare prima il vecchio server o scegliere un’altra porta. Questa procedura conserva
sia i sorgenti eventualmente modificati sia la precedente installazione.

## 14. Cosa inviare quando si segnala un problema

Indicare sistema operativo, esempio, variante e passaggi per riprodurre il problema.
Allegare il messaggio esatto del Terminale o del browser e questi identificativi:

```bash
git rev-parse HEAD
node --version
npm --version
uv --version
.venv/bin/python --version
git -C .local/dependencies/genro-pages rev-parse HEAD
git -C .local/dependencies/genro-builders rev-parse HEAD
git -C .local/dependencies/client/genro-dom-js rev-parse HEAD
```

Il file `docs/dependency-baseline.json` registra i componenti usati nella verifica
pubblicata; `scripts/setup-dependencies.sh` contiene i commit richiesti dal setup.

## 15. Riferimenti del progetto

- [Demo Rosetta e README](https://github.com/genropy/demo-rosetta)
- [Specifiche degli esempi](https://github.com/genropy/demo-rosetta/blob/main/SPEC.md)
- [Stato della verifica](https://github.com/genropy/demo-rosetta/blob/main/docs/STATUS.md)
- [Confronto delle implementazioni](https://github.com/genropy/demo-rosetta/blob/main/docs/COMPARISON.md)
- [Pages, branch della preview](https://github.com/genropy/genro-pages/tree/codex/hello-world)
- [Manuale e schemi dei repository](https://github.com/genropy/genro-pages/blob/codex/hello-world/docs/manual/repository-maps.md)
- [DOM JavaScript, branch della preview](https://github.com/genropy/genro-dom-js/tree/codex/python-js-alignment)
- [Builders, branch della preview](https://github.com/genropy/genro-builders/tree/codex/sourcebag-tytx)
