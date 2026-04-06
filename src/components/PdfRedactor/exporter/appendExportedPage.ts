import { PDFImage, type PDFDocument, type PDFPage, type PDFRef, type PngEmbedder } from "pdf-lib";
import type { ExportedXObjects } from "./types/ExportedXObjects";
import ExistingPngEmbedder from "./ExistingPngEmbedder";

function appendExportedPage(exportedXObjects: ExportedXObjects, pdfDocument: PDFDocument, pdfPage: PDFPage) {
    let alphaChannelRef: PDFRef | undefined = undefined;

    if (exportedXObjects.xObjectAlphaChannel.data !== undefined) {
        const alphaChannelStream = pdfDocument.context.stream(
            exportedXObjects.xObjectAlphaChannel.data,
            {
                ...exportedXObjects.xObjectAlphaChannel.dict,
                Filter: "FlateDecode",
            },
        );

        alphaChannelRef = pdfDocument.context.register(alphaChannelStream);
    }

    const rgbStream = pdfDocument.context.stream(
        exportedXObjects.xObjectRGB.data,
        {
            ...exportedXObjects.xObjectRGB.dict,
            SMask: alphaChannelRef,
            Filter: "FlateDecode",
        },
    );

    const rgbRef = pdfDocument.context.register(rgbStream);

    const embedder = new ExistingPngEmbedder(
        rgbRef,
        exportedXObjects.xObjectRGB.dict.Width,
        exportedXObjects.xObjectRGB.dict.Height,
    );

    const image = PDFImage.of(
        rgbRef,
        pdfDocument,
        embedder as unknown as PngEmbedder,
    );

    // preserve original size/orientation
    pdfPage.setWidth(exportedXObjects.width);
    pdfPage.setHeight(exportedXObjects.height);

    pdfPage.drawImage(image, {
        x: 0,
        y: 0,
        width: exportedXObjects.width,
        height: exportedXObjects.height,
    });

    image.embed();

    return {
        pageNumber: exportedXObjects.pageNumber,
    };
}

export default appendExportedPage;