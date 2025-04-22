import { pdfjs } from "react-pdf";
import { PDFDocumentProxy } from "pdfjs-dist";
import { ExportWorkerMessage } from "./types/ExportWorkerMessage";
import { exportPageFromWorker } from "./exportPageFromWorker";
import { ExportWorkerResponse } from "./types/ExportWorkerResponse";

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

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
	`${import.meta.env.VITE_URL_PREFIX}/pdfjs/pdf.worker.min.js`,
	import.meta.url,
).toString();

const canvasFactory = new CanvasFactory();

const options = {
	cMapUrl: new URL(
		`${import.meta.env.VITE_URL_PREFIX}/pdfjs/cmaps/`,
		import.meta.url,
	).toString(),
	standardFontDataUrl: new URL(
		`${import.meta.env.VITE_URL_PREFIX}/pdfjs/standard_fonts/`,
		import.meta.url,
	).toString(),
	canvasFactory,
};

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
(self.document as any) = {
	baseURI: "http://localhost:5173/",
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	fonts: (self as any).fonts,
};

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
(self.window as any) = {
	location: {
		get href() {
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            (self.window as any) = undefined;
			return "http://localhost:5173/";
		},
	},
};

self.onmessage = async (e: MessageEvent<ExportWorkerMessage>) => {
	if (e.data.type === "loadDocument") {
		pdfBuffer = e.data.params.buffer;

		pdfDocument = await pdfjs.getDocument({
			data: pdfBuffer,
			...options
		}).promise;

		self.postMessage(<ExportWorkerResponse>{ type: "loadDocument" });
	} else if (e.data.type === "exportPage") {
		if (!pdfDocument) {
			return; // todo handle error
		}

		const { pageNumber, boxes, scale } = e.data.params;

		const exportedXObjects = await exportPageFromWorker(
			pdfDocument,
			pageNumber,
			boxes,
			scale,
		);

		if (!exportedXObjects) {
			return; // todo handle error
		}

		self.postMessage(<ExportWorkerResponse>{
			type: "exportPage",
			params: exportedXObjects,
		});
	}
};
