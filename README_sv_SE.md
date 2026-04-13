> Read [English version](README.md)

# ETERNA PDF-maskningsverktyg

En webbläsarbaserad PDF-maskeringskomponent byggd för [ETERNA](https://github.com/ETERNA-earkiv). Komponenten renderar PDF-dokument i webbläsaren och låter användare markera, tillämpa och exportera bortmaskat innehåll med hjälp av textmarkering eller frihandsrektanglar.

---

## Funktioner

- **PDF-rendering i webbläsaren** via [pdf.js](https://mozilla.github.io/pdf.js/) och [react-pdf](https://github.com/wojtekmaj/react-pdf)
- **Textmaskning** – markera text för att automatiskt identifiera motsvarande region för bortmaskning
- **Rektangelmaskning** – rita en frihandsrektangel över valfritt område på valfri sida
- **Ångra / Gör om** – stega genom bortmaskningsåtgärder atomärt; fullständig historik hålls i minnet
- **Rensa allt** – återställ alla väntande och tillämpade bortmaskningar via en bekräftelsedialog
- **Asynkron sparningscallback** – exportera den maskerade PDF:en som en `Blob` och överlämna den till en asynkron callback från värdapplikationen; stöder `AbortSignal` och flexibla returtyper
- **Sidnavigering & zoom** – sidminiatyrer i sidopanel, föregående/nästa-knappar, sidväljare och skalväljare
- **Paketerad som WebJar** (via Maven / `pom.xml`) för enkel integration i Java-baserade värdapplikationer

---

## Teknisk stack

| Lager | Bibliotek / Verktyg |
|---|---|
| UI-ramverk | React 19 + TypeScript |
| PDF-rendering | pdfjs-dist 4.8, react-pdf 9 |
| PDF-manipulation | pdf-lib |
| Komponentbibliotek | MUI (Material UI) v7 |
| Tillståndshantering | state-pool |
| Byggverktyg | Vite 6 |
| Pakethanterare | pnpm |
| Linter | Biome |
| Paketering | Maven WebJar (pom.xml) |

---

## Kom igång

### Förutsättningar

- **Node.js** ≥ 18
- **pnpm** ≥ 9

### Installera beroenden

```bash
pnpm install
```

### Kör i utvecklingsläge (med demo)

```bash
pnpm dev
```

Utvecklingsservern startar en inbyggd demomiljö som laddar en exempel-PDF och exponerar `PDFRedactor`-klassen på `window`. Öppna `http://localhost:5173` i webbläsaren.

### Bygg för produktion

```bash
pnpm build
```

Utdata placeras i katalogen `dist/`.

### Lint

```bash
pnpm lint
```

---

## Integration

Komponenten exponerar en global `PDFRedactor`-klass på `window`. Bädda in de byggda filerna i en HTML-sida och styr komponenten via dess JavaScript-API.

### Montering

```js
const redactor = window.PDFRedactor;

// Montera i ett DOM-element
redactor.mount(document.getElementById('pdf-redactor-root'));

// Ladda en PDF via URL
redactor.setUrl('/sökväg/till/dokument.pdf');

// Registrera en sparningscallback (anropas när användaren klickar Spara)
redactor.setSaveCallback(async (pdfBlob, abortSignal) => {
  const response = await fetch('/api/spara', {
    method: 'POST',
    body: pdfBlob,
    signal: abortSignal,
  });
  return response.ok; // returnera truthy för att indikera framgång
});

// Avmontera när du är klar
redactor.unmount();
```

### Publikt API

| Metod | Signatur | Beskrivning |
|---|---|---|
| `mount` | `(rootElement: HTMLElement) => void` | Renderar komponenten i det angivna elementet |
| `unmount` | `() => void` | Avmonterar och rensar React-roten |
| `setUrl` | `(url: string) => void` | Laddar ett PDF-dokument från angiven URL |
| `setSaveCallback` | `(callback: (blob: Blob, signal: AbortSignal) => Promise<SaveResult> \| SaveResult) => void` | Registrerar funktionen som anropas vid sparning |

#### Typen `SaveResult`

Sparningscallbacken kan returnera något av följande för att signalera framgång eller fel:

```ts
type SaveResult =
  | boolean
  | { ok: boolean }
  | { success: boolean }
  | { status: number }
  | null
  | undefined;
```

Att returnera `true`, `{ ok: true }`, `{ success: true }`, `{ status: 2xx }`, `null` eller `undefined` (void) tolkas som **framgång**. Att returnera `false` eller ett objekt med felstatus tolkas som **fel**.

---

## Verktygsfältets kontroller

| Kontroll | Beskrivning |
|---|---|
| Sidopanelväxlare | Visa/dölj sidminiatyrpanelen |
| Föregående / Nästa sida | Navigera mellan sidor |
| Sidväljare | Hoppa till ett specifikt sidnummer |
| Skalväljare | Välj zoomnivå (anpassa till sida, anpassa till bredd eller fasta procentandelar) |
| Textbortmaskning | Växla textmarkeringsbaserat bortmaskningsläge |
| Rektangelbortmaskning | Växla frihandsrektangelläge |
| Tillämpa bortmaskningar | Bekräfta väntande markeringar som permanenta bortmaskningsrutor |
| Ångra | Återställ den senaste tillämpade bortmaskningsåtgärden |
| Gör om | Återanvänd den senast ångrade bortmaskningsåtgärden |
| Återställ | Rensa alla bortmaskningar efter en bekräftelsedialog |
| Spara | Starta exportpipelinen och anropa sparningscallbacken |

---

## Projektstruktur

```
src/
├── main.tsx                        # Publikt API & PDFRedactor-klass (window.PDFRedactor)
├── PDFRedactorApp.tsx              # Rot-React-komponent
├── components/
│   └── PdfRedactor/
│       ├── PdfRedactor.tsx         # Kärn-viewer + tillståndsmaskin för bortmaskning
│       ├── DOMRectUtils.ts         # Hjälpfunktioner för DOMRect-sammanslagning
│       ├── Toolbar/                # Verktygsfältsskal och alla verktygsfältsobjekt
│       └── exporter/               # PDF-exportpipeline (ExportContext, workers)
└── hooks/
    └── useMemoizedRefArray.ts      # Stabil ref-array-hook
demo/                               # Demofiler (laddas endast i utvecklingsläge)
```

---

## Licens

Det här projektet är en del av [ETERNA](https://github.com/ETERNA-earkiv).
