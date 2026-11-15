# Auditoría regional de datos satelitales

Consulta real registrada: 2026-11-15T03:01:50.634Z (UTC). Nueve centros urbanos públicos, diez productos por punto: 90 lecturas. No son promedios de ciudades ni de establecimientos.

## Resultados

| Punto público | SAOCOM (% vol.) | GPM diario (mm) | NDVI | MODIS (°C superficie) | Productos vigentes / 10 |
| --- | ---: | ---: | ---: | --- | ---: |
| Pergamino | 36 | 4.2 | -0.049 | 23.17 | 8 |
| Rosario | Sin dato | 12.1 | 0.085 | 20.65 | 5 |
| Córdoba | Sin dato | 51.7 | 0.034 | 26.51 | 5 |
| Resistencia | Sin dato | 0 | 0.25 | 28.81 | 5 |
| Salta | Sin dato | 0 | 0.194 | 24.35 (antiguo, 2026-10-07) | 4 |
| Mendoza | Sin dato | 0 | 0.192 | 26.59 (antiguo, 2026-09-29) | 4 |
| Neuquén | Sin dato | 0 | 0.243 | 22.83 | 6 |
| Trelew | Sin dato | 16.5 | 0.712 | 16.35 (antiguo, 2026-10-15) | 4 |
| Río Gallegos | Sin dato | 0 | 0.174 | 12.85 | 5 |

## Disponibilidad por producto

| Producto | Vigentes | Antiguos | Sin dato | Errores |
| --- | ---: | ---: | ---: | ---: |
| saocom_humedad | 1 | 0 | 8 | 0 |
| saocom_percentil | 1 | 0 | 8 | 0 |
| smap | 0 | 4 | 5 | 0 |
| smos | 0 | 8 | 1 | 0 |
| lluvia_imerg | 9 | 0 | 0 | 0 |
| lluvia_imerg_mensual | 9 | 0 | 0 | 0 |
| fusarium | 3 | 0 | 6 | 0 |
| sentinel2_ndvi | 9 | 0 | 0 | 0 |
| sentinel1_radar | 8 | 0 | 1 | 0 |
| modis_lst | 6 | 3 | 0 | 0 |

## Interpretación y correcciones

- GPM diario y mensual respondieron en las nueve ubicaciones. Los ceros de lluvia son valores publicados, no rellenos.
- SAOCOM y fusariosis son productos modelados con máscaras propias. Una ciudad dentro de la región general puede tener NoData; no se infiere cobertura efectiva a partir del nombre de la provincia.
- SMAP y SMOS publicados por CONAE siguen ofreciendo fechas antiguas o valores nulos. No se presentan como mediciones actuales ni se sustituyen por otro satélite sin avisar.
- El radar Sentinel-1 en el punto de Rosario devolvió -32768 (NoData). Ese valor se rechaza antes de calcular dB.
- Se amplió la búsqueda STAC a 24 resultados del último período de 90 días y hasta 12 consultas de píxel, con prioridad cronológica y hasta dos escenas por fecha antes de revisar solapamientos adicionales. Esto permite revisar fechas diferentes sin omitir el compuesto Terra/Aqua alternativo de un mismo período.
- La búsqueda recuperó NDVI del 30 de octubre para Río Gallegos y temperaturas MODIS históricas para Salta y Mendoza. La fecha real y la etiqueta de antigüedad se mantienen; no se inventa una temperatura actual.
- La interfaz distingue estar fuera de la extensión publicada, respuesta NoData, píxel rechazado por calidad, falta de escenas y consulta incompleta. Ofrece ubicar el punto dentro del lote, sin moverlo automáticamente a un lugar con datos.

## Reproducir y revisar

`npm run audit:satellites` consulta nuevamente estos puntos públicos y actualiza este informe. Requiere Internet; no lee perfiles del usuario. Las respuestas cambian cuando los proveedores actualizan los productos.

El archivo [AUDITORIA_SATELITAL.json](AUDITORIA_SATELITAL.json) conserva fechas, valores, escena, fuente, estado y motivos individuales. [AUDITORIA_SATELITAL_ANTES.json](AUDITORIA_SATELITAL_ANTES.json) registra la primera ronda, previa a la ampliación de búsqueda. Estos archivos son evidencia del diagnóstico y no se usan como datos de producción.

Referencias: [catálogo oficial de CONAE](https://catalogos.conae.gov.ar/catalogo/catalogoGeoServiciosOGC.html), [API de Planetary Computer](https://planetarycomputer.microsoft.com/api/data/v1/openapi.json).
