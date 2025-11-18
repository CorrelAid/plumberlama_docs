// @ts-check
import { defineConfig, envField } from "astro/config";
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import node from "@astrojs/node";

import svelte from "@astrojs/svelte";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  //   integrations: [mdx(), svelte()],
  prefetch: true,

  output: "server",

  adapter: node({
      mode: "standalone"
  }),

  vite: {
      resolve: {
          alias: {
              '@': path.resolve(__dirname, './src')
          }
      }
  },

  experimental: {
      liveContentCollections: true,
  },

  env: {
      schema: {
          // Authentication
          POSTGRES_URL: envField.string({ context: "server", access: "secret" }),
      }
  },

  integrations: [svelte()],
});