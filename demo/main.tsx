import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { createState } from "state-pool";

import "./index.css";
import PDFRedactorApp from "../src/PDFRedactorApp";

const lightTheme = createTheme({
	palette: {
		mode: "light",
	},
});

const urlState = createState("");

class PDFRedactor {
	private root: ReactDOM.Root | undefined;

	mount(rootElement: HTMLElement) {
		this.root = ReactDOM.createRoot(rootElement);
		this.root.render(
			<React.StrictMode>
				<ThemeProvider theme={lightTheme}>
					<PDFRedactorApp urlState={urlState} />
				</ThemeProvider>
			</React.StrictMode>
		);
	}

	unmount() {
		this.root?.unmount();
	}

	setUrl = (url: string) => urlState.setValue(url);

	save(_: Blob) {
		console.log("save callback is not set");
		return false;
	}

	setSaveCallback(callback: (pdfData: Blob) => boolean) {
		this.save = callback;
	}
}


declare global {
	interface Window {
		PDFRedactor: PDFRedactor
	}
}

window.PDFRedactor = new PDFRedactor();
