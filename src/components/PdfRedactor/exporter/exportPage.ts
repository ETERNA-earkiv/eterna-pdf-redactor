import { PDFImage, PngEmbedder, PDFPage, type PDFDocument, type PDFRef } from "pdf-lib";
import type { PDFPageProxy } from "pdfjs-dist";
import { pageToPng } from "./pageToPng";
import type { ExportedPage } from "./types/ExportedPage";

interface PageProxyWithWidthHeight extends PDFPageProxy {
    width: number;
    height: number;
    originalWidth: number;
    originalHeight: number;
}

async function exportPage(
    pdfDocument: PDFDocument,
    page: PDFPageProxy,
    pageNumber: number,
    imageRef: PDFRef,
    boxes: DOMRect[] | undefined,
    scale: number,
) {
    const imageBuffer = await pageToPng(page, boxes, scale);
    if (imageBuffer === undefined) {
        return;
    }

    const imageBytes = new Uint8Array(imageBuffer);
    const embedder = await PngEmbedder.for(imageBytes);
    const pdfImage = PDFImage.of(imageRef, pdfDocument, embedder);

    const width = (page as PageProxyWithWidthHeight).originalWidth;
    const height = (page as PageProxyWithWidthHeight).originalHeight;

    const newPage = PDFPage.create(pdfDocument)
    newPage.setWidth(width);
    newPage.setHeight(height);

    newPage.drawImage(pdfImage, {
        x: 0,
        y: 0,
        width,
        height,
    });

    return <ExportedPage>{
        page: newPage,
        pageNumber,
        image: pdfImage
    };
}

export { exportPage };
