import type { State } from "state-pool";
import PdfRedactor from "./components/PdfRedactor";

type PDFRedactorAppProps = {
	urlState: State<string>;
};

function PDFRedactorApp({ urlState }: PDFRedactorAppProps) {
	const [url] = urlState.useState();

	return <PdfRedactor document={url} />;
}

export default PDFRedactorApp;
