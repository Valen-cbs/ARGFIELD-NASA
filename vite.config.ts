import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// Proxy hacia servicios que no permiten pedidos directos desde el navegador (CORS).
// Debe coincidir con PROXY_ROUTES en src/services/proxy.ts, vercel.json y netlify.toml.
const PROXY_TARGETS: Record<string, string> = {
  '/proxy/power': 'https://power.larc.nasa.gov',
  '/proxy/conae1': 'https://geoservicios.conae.gov.ar',
  '/proxy/conae2': 'https://geoservicios2.conae.gov.ar',
  '/proxy/conae3': 'https://geoservicios3.conae.gov.ar',
};

const proxy = Object.fromEntries(
  Object.entries(PROXY_TARGETS).map(([prefix, target]) => [
    prefix,
    {
      target,
      changeOrigin: true,
      secure: true,
      rewrite: (p: string) => p.slice(prefix.length),
    },
  ])
);

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify: file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy,
    },
    preview: {
      proxy,
    },
  };
});
