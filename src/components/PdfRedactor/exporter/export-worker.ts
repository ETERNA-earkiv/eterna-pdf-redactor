import { pdfjs } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { ExportWorkerMessage } from "./types/ExportWorkerMessage";
import { exportPageFromWorker } from "./exportPageFromWorker";
import type { ExportWorkerResponse } from "./types/ExportWorkerResponse";

interface CanvasAndContext {
	canvas: OffscreenCanvas | null;
	context: OffscreenCanvasRenderingContext2D | null;
}

class CanvasFactory {
	create(width: number, height: number) {
		const canvas = new OffscreenCanvas(width, height);
		const context = canvas.getContext("2d");
		return {
			canvas,
			context,
		};
	}

	reset(canvasAndContext: CanvasAndContext, width: number, height: number) {
		if (canvasAndContext.canvas !== null) {
			canvasAndContext.canvas.width = width;
			canvasAndContext.canvas.height = height;
		}
	}

	destroy(canvasAndContext: CanvasAndContext) {
		// Zeroing the width and height cause Firefox to release graphics
		// resources immediately, which can greatly reduce memory consumption.
		if (canvasAndContext.canvas !== null) {
			canvasAndContext.canvas.width = 0;
			canvasAndContext.canvas.height = 0;
		}

		canvasAndContext.canvas = null;
		canvasAndContext.context = null;
	}
}

let pdfBuffer: Uint8Array = new Uint8Array();
let pdfDocument: PDFDocumentProxy | undefined;

const pdfjsBase = import.meta.env.MODE === "development" ? location.origin + "/" : import.meta.url;

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
	/* @vite-ignore */ "pdfjs/pdf.worker.min.mjs",
	pdfjsBase,
).href;

const canvasFactory = new CanvasFactory();

const options = {
	cMapUrl: new URL(/* @vite-ignore */ "pdfjs/cmaps/", pdfjsBase).href,
	standardFontDataUrl: new URL(
		/* @vite-ignore */ "pdfjs/standard_fonts/",
		pdfjsBase,
	).href,
	canvasFactory,
};

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
(self.document as any) = {
	baseURI: self.location.href,
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	fonts: (self as any).fonts,
};

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
(self.window as any) = {
	location: {
		get href() {
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			(self.window as any) = undefined;
			return self.location.href;
		},
	},
};

// Serialize page exports to prevent concurrent OffscreenCanvas creation,
// which can exhaust GPU resources and cause getContext("2d") to return null.
let exportQueue: Promise<void> = Promise.resolve();

async function processExportPage(pageNumber: number, boxes: DOMRect[] | undefined, scale: number) {
	if (!pdfDocument) {
		self.postMessage(<ExportWorkerResponse>{
			type: "errorPage",
			params: { pageNumber, message: "Document not loaded" },
		});
		return;
	}

	try {
		const exportedXObjects = await exportPageFromWorker(
			pdfDocument,
			pageNumber,
			boxes,
			scale,
		);

		if (!exportedXObjects) {
			self.postMessage(<ExportWorkerResponse>{
				type: "errorPage",
				params: { pageNumber, message: `Failed to render page ${pageNumber}` },
			});
			return;
		}

		self.postMessage(<ExportWorkerResponse>{
			type: "exportPage",
			params: exportedXObjects,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		self.postMessage(<ExportWorkerResponse>{
			type: "errorPage",
			params: { pageNumber, message },
		});
	}
}

self.onmessage = async (e: MessageEvent<ExportWorkerMessage>) => {
	if (e.data.type === "loadDocument") {
		pdfBuffer = e.data.params.buffer;

		pdfDocument = await pdfjs.getDocument({
			data: pdfBuffer,
			...options,
		}).promise;

		self.postMessage(<ExportWorkerResponse>{ type: "loadDocument" });
	} else if (e.data.type === "exportPage") {
		const { pageNumber, boxes, scale } = e.data.params;
		exportQueue = exportQueue.then(() =>
			processExportPage(pageNumber, boxes, scale),
		);
	}
};
