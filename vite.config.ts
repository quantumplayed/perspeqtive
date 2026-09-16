import { defineConfig } from "vite";
import { quantumForgeVitePlugin } from "quantum-forge/vite-plugin";

export default defineConfig({
  plugins: [quantumForgeVitePlugin()],
});
