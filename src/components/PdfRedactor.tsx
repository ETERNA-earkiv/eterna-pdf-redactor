import { Document, Page, pdfjs } from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

type File = React.ComponentProps<typeof Document>['file'];

type PdfRedactorProps = {
	document: File;
};

function PdfRedactor(props: PdfRedactorProps) {
	pdfjs.GlobalWorkerOptions.workerSrc = "pdfjs/pdf.worker.min.js";

	const options = {
		cMapUrl: "/pdfjs/cmaps/",
		standardFontDataUrl: "/pdfjs/standard_fonts/",
	};

	return (
		<>
			<Document file={props.document} options={options}>
				<Page pageNumber={1} />
			</Document>
		</>
	);
}

export default PdfRedactor;
