import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

const proxy = Object.fromEntries(Object.entries({
  power: 'https://power.larc.nasa.gov',
  conae1: 'https://geoservicios.conae.gov.ar',
  conae2: 'https://geoservicios2.conae.gov.ar',
  conae3: 'https://geoservicios3.conae.gov.ar',
  planetary: 'https://planetarycomputer.microsoft.com'
}).map(([name, target]) => [`/proxy/${name}`, {
  target, changeOrigin: true, timeout: 20000, proxyTimeout: 20000,
  rewrite: (requestPath: string) => requestPath.replace(`/proxy/${name}`, '')
}]));

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      proxy,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: { proxy },
  };
});
