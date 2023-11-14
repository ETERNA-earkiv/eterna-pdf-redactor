import { PDFPageProxy } from "pdfjs-dist";

async function pageToPng(
	page: PDFPageProxy,
	boxes: DOMRect[] | undefined,
	scale: number,
) {
	const viewport = page.getViewport({ scale: scale });

	// Support HiDPI-screens.
	const outputScale = window?.devicePixelRatio || 1;

	const canvas = new OffscreenCanvas(
		Math.floor(viewport.width * outputScale),
		Math.floor(viewport.height * outputScale),
	);
	//const canvas = document.createElement("canvas");
	//canvas.width = Math.floor(viewport.width * outputScale);
	//canvas.height = Math.floor(viewport.height * outputScale);

	const context = canvas.getContext("2d");
	if (context === null) {
		console.log("Could not get canvas context.");
		return;
	}

	const transform =
		outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

	const renderContext = {
		canvasContext: context,
		transform: transform,
		viewport: viewport,
	};

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	await page.render(renderContext as any).promise;

	if (boxes !== undefined) {
		for (let i = 0; i < boxes.length; i++) {
			context.fillRect(
				boxes[i].x * scale,
				boxes[i].y * scale,
				boxes[i].width * scale,
				boxes[i].height * scale,
			);
		}
	}

	/*
	const cavasToBlobPromise = () => {
		return new Promise<Blob>((resolve, reject) => {
			canvas.toBlob((blob) => {
				if (blob === null) {
					reject();
				} else {
					resolve(blob);
				}
			}, "image/png");
		});
	};
    */

	//const imageBlob = await cavasToBlobPromise();
	const imageBlob = await canvas.convertToBlob({ type: "image/png" });
	const imageBuffer = await imageBlob.arrayBuffer();

	return imageBuffer;
}

export { pageToPng };
