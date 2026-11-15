# ARGFIELD


## Motor de rotaciones (nuevo)

`src/engine/` implementa el motor matemático de decisiones agronómicas: estadística regional MAGyP (con anti-doble-conteo), series NASA POWER agregadas a climatología mensual, ETo FAO-56 Penman-Monteith, balance hídrico mensual con estrés hídrico, aptitud térmica tipo EcoCrop, generación de secuencias con restricciones excluyentes y evaluación multicriterio documentada con pesos por prioridad y escenarios climáticos hipotéticos.

- Documentación científica completa: [`docs/motor-rotaciones.md`](docs/motor-rotaciones.md).
- Preprocesamiento de estadísticas MAGyP: `npm run build:magyp` (genera `public/data/magyp-*.json`).
- Ejemplo reproducible con datos reales (Chaco): `npm run smoke:engine`.
- Pruebas: `npm test` (55 pruebas: satelitales + motor).

Aplicación para productores argentinos: perfil del establecimiento, lecturas satelitales por punto, mapas, avisos de seguimiento y ejemplos de rotación. React, TypeScript, Vite y Leaflet.

## Ejecutar

Requiere Node.js 22.12 o superior (se verificó con Node 24).

```sh
npm install
npm run dev
```

Abrir `http://localhost:3000`, elegir el establecimiento y consultar Inicio, Mapa o Fuentes. No se necesitan claves para los productos públicos conectados. El nombre del lote y el perfil quedan en el navegador; las consultas satelitales envían las coordenadas seleccionadas a los proveedores correspondientes mediante las rutas proxy de la app.

## Productos conectados

| Proveedor | Producto | Uso |
| --- | --- | --- |
| CONAE | SAOCOM: humedad 0–50 cm y percentil | Lectura del punto, comparación con lo normal y mapa |
| NASA / ESA vía CONAE | SMAP y SMOS | Humedad superficial con fecha real del catálogo |
| NASA vía CONAE | GPM IMERG diario y mensual | Lluvia por día o mes calendario, sin confundirla con 30 días móviles |
| ESA vía Planetary Computer | Sentinel-2 L2A | NDVI con control SCL de nubes/sombras y corrección radiométrica; escena en color natural en el mapa |
| ESA vía Planetary Computer | Sentinel-1 RTC | Retrodispersión gamma nought VV en dB y capa radar |
| NASA vía Planetary Computer | MODIS MOD11A2 | Temperatura superficial compuesta de 8 días con control QC |
| CONAE | Estatus hídrico, inundaciones, focos VIIRS/GOES | Capas de mapa y consulta del punto |
| CONAE | Fusariosis y anomalías de rinde de maíz/soja | Productos modelados y capas de mapa |

Cada lectura conserva fuente, fecha del producto, fecha de consulta, cobertura y estado. Un servicio accesible puede devolver una imagen transparente, NoData o datos antiguos. La app los diferencia; no sustituye valores faltantes por simulaciones. SMAP y SMOS publicados por CONAE pueden estar desactualizados.

El perfil es un punto: no representa el promedio de las hectáreas del establecimiento. La humedad volumétrica no equivale a agua útil. El NDVI aislado no demuestra una caída; el radar VV no mide directamente humedad o compactación; la temperatura MODIS no es temperatura del aire.

Los avisos actuales son reglas de seguimiento para percentiles secos de SAOCOM y para incidencia modelada de fusariosis cuando el cultivo declarado es trigo. Solo usan productos vigentes, fechados y no recuperados de la caché offline. Las capas de fuego e inundación no generan avisos automáticos de proximidad.

El clima utiliza pronósticos Open-Meteo. Los puntajes de rotación son indicadores orientativos del motor; los beneficios físicos en agua, carbono y rendimiento no se estiman. El informe JSON y su vista imprimible incluyen esta distinción y la procedencia de las lecturas. Las misiones que aún requieren acceso o procesamiento aparecen en Fuentes como pendientes.

## Verificar

```sh
npm run lint
npm test
npm run test:e2e
npm run build
```

Diagnóstico opcional contra CONAE real: `npm run check:conae`. Usa exclusivamente centros urbanos públicos de Pergamino y Junín; no utiliza el establecimiento guardado. Las pruebas de regresión incluyen los nombres de campos reales de CONAE y la fecha del período mensual.

Auditoría regional completa: `npm run audit:satellites`. Consulta diez productos en nueve centros urbanos públicos y guarda valores, fechas y motivos de ausencia en [docs/AUDITORIA_SATELITAL.md](docs/AUDITORIA_SATELITAL.md) y sus JSON. La búsqueda de escenas revisa hasta 90 días y conserva la antigüedad real; puede seguir sin haber un píxel válido. No se usan mediciones de un punto vecino ni los archivos de auditoría para completar el lote.

Las pruebas de navegador usan Chrome instalado, respuestas controladas y bloquean las conexiones externas. Se puede elegir otro canal instalado con `PLAYWRIGHT_CHANNEL` (por ejemplo, `msedge`). Cubren fechas antiguas, NoData con imágenes transparentes, cambios de serie y lote, modo offline, móvil y exportación. El modo offline conserva solo lecturas de la sesión en memoria; al recargar sin conexión puede no haber datos guardados.

## Desplegar

`npm run build` genera `dist`. Vercel y Netlify incluyen las rutas `/proxy/conae1`, `/proxy/conae2`, `/proxy/conae3`, `/proxy/planetary` y `/proxy/power`; Vercel además redirige las rutas del frontend, como `/landing`, a la aplicación. Vite aplica las mismas rutas en desarrollo y preview. Otro alojamiento estático necesita configurar estos proxies; copiar solo `dist` no alcanza para consultar proveedores que restringen CORS. Los destinos son fijos; no hay un proxy de URLs arbitrarias ni credenciales embebidas.

El análisis del proyecto, las fuentes consultadas y los límites de la integración están en [docs/INTEGRACION_SATELITAL.md](docs/INTEGRACION_SATELITAL.md).

La revisión del paquete `argfield-para-mariano.zip`, sus conflictos con el motor integrado y la adaptación aplicada están documentadas en [docs/REVISION_PAQUETE_MARIANO.md](docs/REVISION_PAQUETE_MARIANO.md). Inicio comparte alternativas con el Optimizador y agrega un resumen meteorológico semanal; la exportación JSON conserva la evaluación completa.
