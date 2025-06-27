import vue from "@vitejs/plugin-vue";
import { URL, fileURLToPath } from "url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  server: {
    port: 3001
  },
  define: {
    // Ensure environment variables are properly typed
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
  },
  optimizeDeps: {
    // Optimize GalaChain dependencies
    include: ['@gala-chain/api', '@gala-chain/connect']
  },
  build: {
    // Improve build performance and output
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks
          'gala-chain': ['@gala-chain/api', '@gala-chain/connect'],
          'ui-framework': ['@headlessui/vue', '@heroicons/vue'],
          'vue-ecosystem': ['vue', 'vue-router', 'pinia']
        }
      }
    }
  }
});
