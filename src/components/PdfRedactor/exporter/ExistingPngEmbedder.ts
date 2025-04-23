import { type PDFRef, PngEmbedder } from "pdf-lib";

class ExistingPngEmbedder {
	readonly rgbRef: PDFRef;
	readonly height: number;
	readonly width: number;

	constructor(rgbRef: PDFRef, width: number, height: number) {
		this.rgbRef = rgbRef;
		this.width = width;
		this.height = height;
	}

	async embedIntoContext(): Promise<PDFRef> {
		return this.rgbRef;
	}
}

Object.setPrototypeOf(ExistingPngEmbedder.prototype, PngEmbedder.prototype);

export default ExistingPngEmbedder;