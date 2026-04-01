import React from "react";
import { createRoot, Root } from "react-dom/client";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { createState } from "state-pool";
import type { SaveResult } from "../src/main";

import "./index.css";
import PDFRedactorApp from "../src/PDFRedactorApp";

const lightTheme = createTheme({
	palette: {
		mode: "light",
	},
});

const urlState = createState("");

class PDFRedactor {
	private root: Root | undefined;

	mount(rootElement: HTMLElement) {
		this.root = createRoot(rootElement);
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

	save(_: Blob, _signal?: AbortSignal): Promise<SaveResult> | SaveResult {
		console.log("save callback is not set");
		return false;
	}

	setSaveCallback(
		callback: (pdfData: Blob, signal: AbortSignal) => Promise<SaveResult> | SaveResult,
	) {
		this.save = callback;
	}
}


declare global {
	interface Window {
		PDFRedactor: PDFRedactor
	}
}

window.PDFRedactor = new PDFRedactor();
