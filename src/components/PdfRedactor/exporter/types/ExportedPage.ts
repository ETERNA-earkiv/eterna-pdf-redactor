import { PDFImage, PDFPage } from "pdf-lib";

export interface ExportedPage {
    page: PDFPage,
    pageNumber: number,
    image: PDFImage
}