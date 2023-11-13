import { PDFDocumentProxy } from "pdfjs-dist";
import { PDFDocument, PDFImage, PDFRef, PngEmbedder } from "pdf-lib";
import ExportWorkerCoordinator from "./ExportWorkerCoordinator";
import ExistingPngEmbedder from "./ExistingPngEmbedder";

async function exportPdfWithWorkers(
	exporter: ExportWorkerCoordinator,
	documentProxy: PDFDocumentProxy,
	boxes: DOMRect[][],
	scale: number,
) {
	const newDocument = await PDFDocument.create();
	const newPages = Array.from({ length: documentProxy.numPages }, (_) =>
		newDocument.addPage(),
	);

	console.log(documentProxy);

	const exportPagePromises = [];

	const start = performance.now();

	for (let pageNumber = 1; pageNumber <= documentProxy.numPages; pageNumber++) {
		const exportPagePromise = exporter
			.exportPage(pageNumber, boxes[pageNumber - 1], scale)
			.then((exportedPage) => {
				const pageIndex = exportedPage.pageNumber - 1;

				let alphaChannelRef: PDFRef | undefined = undefined;

				if (exportedPage.xObjectAlphaChannel.data !== undefined) {
					const alphaChannelStream = newDocument.context.stream(
						exportedPage.xObjectAlphaChannel.data,
						{
							...exportedPage.xObjectAlphaChannel.dict,
							Filter: "FlateDecode",
						},
					);

					alphaChannelRef = newDocument.context.register(alphaChannelStream);
				}

				const rgbStream = newDocument.context.stream(
					exportedPage.xObjectRGB.data,
					{
						...exportedPage.xObjectRGB.dict,
						SMask: alphaChannelRef,
						Filter: "FlateDecode",
					},
				);

				const rgbRef = newDocument.context.register(rgbStream);

				const embedder = new ExistingPngEmbedder(
					rgbRef,
					exportedPage.xObjectRGB.dict.Width,
					exportedPage.xObjectRGB.dict.Height,
				);

				const image = PDFImage.of(
					rgbRef,
					newDocument,
					embedder as unknown as PngEmbedder,
				);

				const page = newPages[pageIndex];
				if (page === undefined) {
					// TODO: handle error
				}

				page.drawImage(image, {
					x: 0,
					y: 0,
					width: exportedPage.width,
					height: exportedPage.height,
				});

				image.embed();

				return {
					pageNumber,
				};
			});

		exportPagePromises.push(exportPagePromise);
	}

	console.log(exportPagePromises);

	const exportPageProgressPromises = new Map(
		exportPagePromises.map((promise, index) => [index, promise]),
	);

	for (let i = 0; i < documentProxy.numPages; i++) {
		const exportedPage = await Promise.any(exportPageProgressPromises.values());
		if (exportedPage === undefined) {
			return;
		}

		const pageIndex = exportedPage.pageNumber - 1;
		console.log("pageIndex", pageIndex);

		exportPageProgressPromises.delete(pageIndex);
	}

	console.log(`Parallelizable part took ${performance.now() - start}ms`);

	console.log(`exportPdf took ${performance.now() - start}ms`);

	return newDocument;
}

export { exportPdfWithWorkers };
