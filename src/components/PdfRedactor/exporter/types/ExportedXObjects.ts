import type { PDFRef } from "pdf-lib";

type XObjectDict = {
	Type: "XObject";
	Subtype: "Image";
	BitsPerComponent: number;
	Width: number;
	Height: number;
	ColorSpace: "DeviceGray" | "DeviceRGB";
	SMask?: PDFRef | undefined;
	Decode?: number[];
};

export interface ExportedXObjects {
	pageNumber: number;
    width: number;
    height: number;
	xObjectAlphaChannel: {
		data: Uint8Array | undefined;
		dict: XObjectDict | undefined;
	};
	xObjectRGB: {
		data: Uint8Array;
		dict: XObjectDict;
	};
}
