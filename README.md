>Läs på [Svenska](README_sv_SE.md)

# eterna-pdf-redactor

A browser-based PDF redaction component built for [ETERNA](https://github.com/ETERNA-earkiv). It renders PDF documents in the browser and allows users to mark, apply, and export redacted content using text selection or bounding-box drawing tools.

---

## Features

- **In-browser PDF rendering** powered by [pdf.js](https://mozilla.github.io/pdf.js/) and [react-pdf](https://github.com/wojtekmaj/react-pdf)
- **Text redaction** – select text to automatically mark the corresponding region for redaction
- **Box redaction** – draw a freehand rectangle over any area on any page
- **Undo / Redo** – step through redaction actions atomically; full history is maintained in memory
- **Clear all** – reset all pending and applied redactions with a confirmation dialog
- **Async save callback** – export the redacted PDF as a `Blob` and hand it to a host-provided async callback; supports `AbortSignal` and flexible return types
- **Page navigation & zoom** – sidebar thumbnails, previous / next buttons, page selector, and scale selector
- **Packaged as a WebJar** (via Maven / `pom.xml`) for easy integration into Java-based host applications

---

## Technology Stack

| Layer | Library / Tool |
|---|---|
| UI framework | React 19 + TypeScript |
| PDF rendering | pdfjs-dist 4.8, react-pdf 9 |
| PDF manipulation | pdf-lib |
| Component library | MUI (Material UI) v7 |
| State management | state-pool |
| Build tool | Vite 6 |
| Package manager | pnpm |
| Linter | Biome |
| Packaging | Maven WebJar (pom.xml) |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 9

### Install dependencies

```bash
pnpm install
```

### Run in development mode (with demo)

```bash
pnpm dev
```

The development server starts a built-in demo environment that loads a sample PDF and exposes the `PDFRedactor` class on `window`. Open `http://localhost:5173` in your browser.

### Build for production

```bash
pnpm build
```

Output is placed in the `dist/` directory.

### Lint

```bash
pnpm lint
```

---

## Integration

The component exposes a global `PDFRedactor` class on `window`. Embed the built assets in any HTML page and then drive the component through its JavaScript API.

### Mounting

```js
const redactor = window.PDFRedactor;

// Mount into a DOM element
redactor.mount(document.getElementById('pdf-redactor-root'));

// Load a PDF by URL
redactor.setUrl('/path/to/document.pdf');

// Register a save callback (called when the user clicks Save)
redactor.setSaveCallback(async (pdfBlob, abortSignal) => {
  const response = await fetch('/api/save', {
    method: 'POST',
    body: pdfBlob,
    signal: abortSignal,
  });
  return response.ok; // return truthy to indicate success
});

// Unmount when done
redactor.unmount();
```

### Public API

| Method | Signature | Description |
|---|---|---|
| `mount` | `(rootElement: HTMLElement) => void` | Renders the component into the given element |
| `unmount` | `() => void` | Unmounts and cleans up the React root |
| `setUrl` | `(url: string) => void` | Loads a PDF document from the given URL |
| `setSaveCallback` | `(callback: (blob: Blob, signal: AbortSignal) => Promise<SaveResult> \| SaveResult) => void` | Registers the function called on save |

#### `SaveResult` type

The save callback may return any of the following to signal success or failure:

```ts
type SaveResult =
  | boolean
  | { ok: boolean }
  | { success: boolean }
  | { status: number }
  | null
  | undefined;
```

Returning `true`, `{ ok: true }`, `{ success: true }`, `{ status: 2xx }`, `null`, or `undefined` (void) is treated as **success**. Returning `false` or an error-status object is treated as **failure**.

---

## Toolbar Controls

| Control | Description |
|---|---|
| Sidebar toggle | Show/hide the page thumbnail panel |
| Previous / Next page | Navigate between pages |
| Page selector | Jump to a specific page number |
| Scale selector | Choose a zoom level (fit page, fit width, or fixed percentages) |
| Text Redactor | Toggle text-selection-based redaction mode |
| Box Redactor | Toggle freehand bounding-box draw mode |
| Apply Redactions | Commit pending selections as permanent redaction boxes |
| Undo | Revert the last applied redaction action |
| Redo | Re-apply the last undone redaction action |
| Reset | Clear all redactions after a confirmation dialog |
| Save | Trigger the export pipeline and invoke the save callback |

---

## Project Structure

```
src/
├── main.tsx                        # Public API & PDFRedactor class (window.PDFRedactor)
├── PDFRedactorApp.tsx              # Root React component
├── components/
│   └── PdfRedactor/
│       ├── PdfRedactor.tsx         # Core viewer + redaction state machine
│       ├── DOMRectUtils.ts         # DOMRect merge helpers
│       ├── Toolbar/                # Toolbar shell and all toolbar items
│       └── exporter/               # PDF export pipeline (ExportContext, workers)
└── hooks/
    └── useMemoizedRefArray.ts      # Stable ref-array hook
demo/                               # Demo assets (only loaded in development mode)
```

---

## License

This project is part of [ETERNA](https://github.com/ETERNA-earkiv).
