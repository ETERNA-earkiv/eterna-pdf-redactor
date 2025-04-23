import type { PDFDocumentProxy } from "pdfjs-dist";
import { PDFDocument } from "pdf-lib";
import { exportPage } from "./exportPage";

async function exportPdfAsync(
	documentProxy: PDFDocumentProxy,
	boxes: DOMRect[][],
	scale: number,
) {
	const newDocument = await PDFDocument.create();

	const exportPagePromises = [];

	const start = performance.now();

	for (let pageNumber = 1; pageNumber <= documentProxy.numPages; pageNumber++) {
		const page = await documentProxy.getPage(pageNumber);

		const imageRef = newDocument.context.nextRef();
		//const exportPagePromise = exporter.exportPage(newDocument, page, pageNumber, imageRef, boxes[pageNumber - 1], scale);
		const exportPagePromise = exportPage(
			newDocument,
			page,
			pageNumber,
			imageRef,
			boxes[pageNumber - 1],
			scale,
		);
		exportPagePromises.push(exportPagePromise);
	}

	const exportPageProgressPromises = new Map(
		exportPagePromises.map((promise, index) => [index, promise]),
	);

	for (let i = 0; i < documentProxy.numPages; i++) {
		const exportedPage = await Promise.any(exportPageProgressPromises.values());
		if (exportedPage === undefined) {
			return;
		}

		const pageIndex = exportedPage.pageNumber - 1;
		exportPageProgressPromises.delete(pageIndex);
	}

	for (let i = 0; i < exportPagePromises.length; i++) {
		const exportedPage = await exportPagePromises[i];
		if (exportedPage === undefined) {
			return;
		}

		newDocument.addPage(exportedPage.page);
		exportedPage.image.embed();
	}

	console.log(`exportPdf took ${performance.now() - start}ms`);

	return newDocument;
}

export { exportPdfAsync };
