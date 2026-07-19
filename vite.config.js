import { defineConfig } from "vite";
import { resolve } from "path";
import vue from "@vitejs/plugin-vue";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
    // Rooting at the sidepanel folder makes Vite emit sidepanel.html
    // directly under outDir instead of mirroring its source path
    // (dist/src/sidepanel/sidepanel.html), which the extension manifest
    // ("side_panel.default_path": "sidepanel.html") requires.
    root: "src/sidepanel",
    base: "./",

    plugins: [
        vue(),
        viteStaticCopy({
            targets: [
                { src: "../../manifest.json", dest: "." },
                { src: "../content.js", dest: "." },
                { src: "../inject.js", dest: "." },
                { src: "../background.js", dest: "." },
                { src: "../../public/icons", dest: "." }
            ]
        })
    ],

    build: {
        outDir: "../../dist",
        emptyOutDir: true,
        rollupOptions: {
            input: resolve(__dirname, "src/sidepanel/sidepanel.html")
        }
    }
});
