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
    port: 3001,
    historyApiFallback: true
  },
  define: {
    // Ensure environment variables are properly typed
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false
  },
  optimizeDeps: {
    // Optimize GalaChain dependencies
    include: ["@gala-chain/api", "@gala-chain/connect"]
  },
  build: {
    // Improve build performance and output
    target: "esnext",
    minify: "esbuild",
    sourcemap: true,
    // Increase chunk size warning limit for GalaChain deps
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Advanced chunk splitting strategy
          if (id.includes("node_modules")) {
            // GalaChain dependencies
            if (id.includes("@gala-chain")) {
              return "gala-chain";
            }
            // UI framework dependencies
            if (id.includes("@headlessui") || id.includes("@heroicons")) {
              return "ui-framework";
            }
            // Vue ecosystem
            if (id.includes("vue") || id.includes("pinia") || id.includes("vue-router")) {
              return "vue-ecosystem";
            }
            // Other vendor dependencies
            return "vendor";
          }

          // Application code splitting
          if (id.includes("/src/components/Admin")) {
            return "admin";
          }
          if (
            id.includes("/src/components/Performance") ||
            id.includes("/src/composables/usePerformance") ||
            id.includes("/src/composables/useAnalytics")
          ) {
            return "monitoring";
          }
          if (id.includes("/src/composables/useError") || id.includes("/src/components/ErrorBoundary")) {
            return "error-handling";
          }
        },
        // Optimize asset names for caching
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) {
            return "assets/css/[name]-[hash][extname]";
          }
          return "assets/[name]-[hash][extname]";
        },
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js"
      },
      // External dependencies (if needed)
      external: []
    },
    // Enable modern build optimizations
    cssCodeSplit: true,
    reportCompressedSize: true,
    // Optimize for modern browsers
    modulePreload: {
      polyfill: false
    }
  }
});
