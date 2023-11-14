import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider, createTheme } from "@mui/material/styles";

import App from "./App.tsx";
import "./index.css";

const rootElement: HTMLElement | null = document.getElementById("root");

const lightTheme = createTheme({
	palette: {
		mode: "light",
	},
});

if (rootElement) {
	ReactDOM.createRoot(rootElement).render(
		<React.StrictMode>
			<ThemeProvider theme={lightTheme}>
				<App />
			</ThemeProvider>
		</React.StrictMode>,
	);
}
