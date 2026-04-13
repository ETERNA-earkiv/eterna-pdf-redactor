# Changelog

All notable changes to **eterna-pdf-redactor** are documented here.

---

## [Unreleased]



## [1.0.3] – 2026-04-13

### Fixed
- **Landscape PDF masking** – redaction boxes that were being applied with incorrect orientation on landscape-format pages are now rendered correctly; the fix also prevents data loss when exporting those pages.
- **Error logging** – export and document-load errors are now consistently logged in the `ExportContext` catch blocks.

### Added
- **CI workflow** – automated lint and build checks run on pull requests targeting `dev` or `main`, and on direct pushes to `dev`.

### Internal
- Removed debug console statements added during export diagnostics investigation.

---

## [1.0.2] – 2026-04-02

### Fixed
- **Concurrent OffscreenCanvas exhaustion** – page exports inside each worker are now serialized to avoid running out of `OffscreenCanvas` instances when exporting multi-page documents in parallel.
- **Silent export hangs** – page-level export errors are now propagated and reported instead of causing the save to hang indefinitely.
- **Atomic undo/redo** – redaction state (boxes, history, redo stack) is merged into a single state object so undo/redo transitions are always consistent.
- **pdfjs / worker asset URLs** – asset URLs for the pdf.js worker, CMaps, and standard fonts are resolved correctly in both demo (development) mode and production WebJar mode.
- **Save callback backward compatibility** – returning `undefined` or `void` from the save callback is treated as success, matching the pre-async behaviour.

### Added
- **Undo** toolbar button – steps back through redaction actions one group at a time; state is managed atomically to prevent partial/inconsistent views.
- **Redo** toolbar button – re-applies previously undone redaction actions.
- **Reset / Clear all** toolbar button – opens a confirmation dialog and wipes all pending and applied redactions when confirmed.
- **Async save callback** – `setSaveCallback` now accepts an async function that receives the redacted PDF `Blob` and an `AbortSignal`. The component enforces a timeout and treats `void`/`null`/`undefined` as success for backward compatibility.
- **`SaveResult` type export** – the flexible union type for save-callback return values is now exported from the public entry point.
- **`AbortSignal` parameter** – the save callback signature is extended to receive an `AbortSignal` so callers can cancel in-flight upload requests.

---

## [1.0.0] – 2025-04-24 (initial release)

### Added
- Initial public release of the `eterna-pdf-redactor` component.
- React 19 + TypeScript implementation built with Vite 6.
- In-browser PDF rendering using pdfjs-dist and react-pdf.
- **Text redaction mode** – select text to highlight the corresponding region for redaction.
- **Box redaction mode** – draw a freehand rectangle to mark any area on any page for redaction.
- **Apply redactions** – commits pending marks as permanent black-box redactions embedded in the exported PDF.
- **Page navigation** – sidebar thumbnails, previous/next buttons, and a direct page-number input.
- **Zoom / scale selector** – fit-to-page, fit-to-width, and fixed percentage zoom levels.
- `PDFRedactor` class exposed on `window` with `mount`, `unmount`, `setUrl`, and `setSaveCallback` methods.
- Maven `pom.xml` for packaging the built assets as a WebJar.
- GitHub Actions workflow for automated WebJar publishing.
- Upgrade to React 19.1 and react-pdf 9.2.1.
- Biome linter configuration.

---

[Unreleased]: https://github.com/ETERNA-earkiv/eterna-pdf-redactor/compare/HEAD...HEAD
[1.0.3]: https://github.com/ETERNA-earkiv/eterna-pdf-redactor/releases/tag/1.0.3
[1.0.2]: https://github.com/ETERNA-earkiv/eterna-pdf-redactor/releases/tag/1.0.2
[1.0.1]: https://github.com/ETERNA-earkiv/eterna-pdf-redactor/releases/tag/1.0.1
[1.0.0]: https://github.com/ETERNA-earkiv/eterna-pdf-redactor/releases/tag/1.0.0
