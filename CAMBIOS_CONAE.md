# Cambios: capas reales de CONAE en el mapa

## Qué se agregó

- **Panel "Capas CONAE" en el Mapa.** Muestra capas WMS reales de CONAE sobre el mapa base:
  - Agua: estatus hídrico (percentil API), humedad SAOCOM 0–50 cm, humedad vs. lo normal (percentil SAOCOM), humedad superficial SMAP, lluvia diaria GPM IMERG.
  - Riesgos: áreas inundadas (diario), focos de calor VIIRS y GOES (24 h).
- Para las capas que CONAE publica como serie de 7 días se puede elegir el día (1 a 7). Además hay control de transparencia, referencias (leyenda que sirve CONAE), estado de carga y la fuente de cada capa.
- **Botón "Probar valor en mi lote".** Hace una consulta GetFeatureInfo sobre el punto del lote. Si el servidor de CONAE no permite consultas desde el navegador (CORS), lo avisa: en ese caso hace falta un servidor intermedio para mostrar el número.
- **Aviso de modo demo y etiquetas "Demo"** en Inicio, Clima, Alertas y Optimizador, porque esos números siguen siendo simulados (`src/services/dataLoader.ts`).

## Archivos

- `src/data/conaeLayers.ts` — lista de capas, endpoints y armado de URLs (leyenda y GetFeatureInfo).
- `src/components/ConaeLayerPanel.tsx` — panel de capas.
- `src/components/DemoBadge.tsx` — etiqueta y aviso de demo.
- `src/components/Map.tsx` — carga la capa WMS sobre Leaflet.
- Pequeños cambios en `App.tsx`, `FarmProfileView.tsx`, `WeatherView.tsx`, `AlertsView.tsx` y `RotationStrategies.tsx` para mostrar las etiquetas.

## Para verificar el domingo

1. Abrir el Mapa y probar cada capa. Si una queda en "CONAE no devolvió esta capa", probar otros días.
2. Confirmar qué día (1 o 7) es el más reciente: CONAE no lo aclara en su página. Hoy se usa 1 por defecto.
3. Las capas SAOCOM solo tienen datos en la Región Pampeana.
4. Tocar "Probar valor en mi lote" para saber si se puede leer el número directo desde el navegador.

Nombres de capas tomados de https://catalogos.conae.gov.ar/catalogo/catalogoGeoServiciosOGC.html

## Nota de instalación

`npm install` falla por un conflicto previo de dependencias (esbuild) que ya venía en el proyecto. Se resuelve con `npm install --legacy-peer-deps` o usando `bun install`.
