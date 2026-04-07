import { PDFDocument } from "pdf-lib";
import { PNG } from "pdf-lib/src/utils/png";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { pageToPng } from "./pageToPng";
import type { ExportedXObjects } from "./types/ExportedXObjects";

async function exportPageFromWorker(
	pdfDocument: PDFDocumentProxy,
	pageNumber: number,
	boxes: DOMRect[] | undefined,
	scale: number,
) {
	const page = await pdfDocument.getPage(pageNumber);

	const newDocument = await PDFDocument.create();

	const imageBuffer = await pageToPng(page, boxes, scale);

	if (imageBuffer === undefined) {
		return;
	}

	const imageBytes = new Uint8Array(imageBuffer);
	const image = PNG.load(imageBytes);

	const xObjectDictAlphaChannel = image.alphaChannel
		? {
				Type: "XObject",
				Subtype: "Image",
				Height: image.height,
				Width: image.width,
				BitsPerComponent: image.bitsPerComponent,
				ColorSpace: "DeviceGray",
				Decode: [0, 1],
		  }
		: undefined;

	const xObjectAlphaChannel = image.alphaChannel
		? newDocument.context.flateStream(
				image.alphaChannel,
				xObjectDictAlphaChannel,
		  )
		: undefined;

	const SMask = xObjectAlphaChannel
		? newDocument.context.register(xObjectAlphaChannel)
		: undefined;

	const xObjectDictRGB = {
		Type: "XObject",
		Subtype: "Image",
		BitsPerComponent: image.bitsPerComponent,
		Width: image.width,
		Height: image.height,
		ColorSpace: "DeviceRGB",
		SMask,
	};

	const xObjectRGB = newDocument.context.flateStream(
		image.rgbChannel,
		xObjectDictRGB,
	);

	const pageViewport = page.getViewport({ scale: 1 });
	return <ExportedXObjects>{
		pageNumber,
		width: pageViewport.width,
		height: pageViewport.height,
		xObjectAlphaChannel: {
			data: xObjectAlphaChannel?.asUint8Array(),
			dict: xObjectDictAlphaChannel,
		},
		xObjectRGB: {
			data: xObjectRGB.asUint8Array(),
			dict: xObjectDictRGB,
		},
	};
}

export { exportPageFromWorker };
