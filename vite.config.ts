import path from "node:path";
import { createRequire } from "node:module";

import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import react from "@vitejs/plugin-react-swc";

const require = createRequire(import.meta.url);
const pdfjsPath = path.dirname(require.resolve("pdfjs-dist/package.json"));
const cMapsDir = path.join(pdfjsPath, "cmaps");
const standardFontsDir = path.join(pdfjsPath, "standard_fonts");
const pdfWorkerPath = path.join(pdfjsPath, "build/pdf.worker.min.mjs");

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	const isDemo = mode === "development";

	return {
		root: isDemo ? "demo" : ".",
		plugins: [
			viteStaticCopy({
				targets: [
					{ src: cMapsDir, dest: "pdfjs" },
					{ src: standardFontsDir, dest: "pdfjs" },
					{ src: pdfWorkerPath, dest: "pdfjs" },
				],
			}),
			react(),
		],
		worker: {
			format: "es",
			rollupOptions: {
				output: {
					entryFileNames: "[name].js",
				},
			},
		},
		build: {
			sourcemap: false,
			minify: "terser",
			lib: !isDemo
				? {
						entry: path.resolve(__dirname, "src/main.tsx"),
						name: "PDFRedactor",
					}
				: undefined,
		},
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "src"),
			},
		},
		define: {
			"process.env.NODE_ENV": JSON.stringify(mode),
		},
	};
});
