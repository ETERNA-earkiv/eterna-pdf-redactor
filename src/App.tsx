import { State } from "state-pool";
import PdfRedactor from "./components/PdfRedactor";

type AppProps = {
	urlState: State<string>;
};

function App({ urlState }: AppProps) {
	const [url] = urlState.useState();

	return <PdfRedactor document={url} />;
}

export default App;
