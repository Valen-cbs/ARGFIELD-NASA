# Análisis e integración satelital de ARGFIELD

## Qué hace el proyecto

ARGFIELD es una aplicación React/TypeScript con Vite y Leaflet para productores argentinos. Guarda un perfil de establecimiento, muestra condiciones del lote, alertas, mapas, clima y propuestas de rotación. No tiene un servidor de procesamiento geoespacial propio. Vercel y Netlify ya incluyen algunas rutas proxy; Vite todavía no las configura.

El PDF «ARGFIELD — Pantallas para el productor» se tomó como referencia de producto: humedad del perfil 0–50 cm, comparación con lo normal, lluvia GPM, cobertura, fusariosis, incendios e inundaciones. Sus números, fechas, recomendaciones e interacciones son ejemplos de diseño, no observaciones ni instrucciones para ejecutar.

## Diagnóstico previo a implementar

- `dataLoader.ts` inventa lecturas SAOCOM, SMAP, GPM, MODIS, Sentinel-2 y otras misiones, con fecha actual y confianza alta. `App.tsx` las convierte en alertas reales en apariencia.
- `FarmProfileView.tsx` vuelve a inventar los indicadores de forma independiente. Una etiqueta Demo global no garantiza que una lectura, marcador o informe exportado conserve esa distinción.
- Las ocho capas WMS de CONAE son imágenes reales, pero cargar una imagen no prueba que haya un dato en el establecimiento. El estado del transporte y el del píxel deben ser independientes.
- GetFeatureInfo no comprueba HTTP, no distingue excepciones OGC ni NoData, y consulta directamente al proveedor. No cancela resultados al cambiar de lote o día.
- El catálogo de agencias es informativo. «100% constelación activa», últimas pasadas y salud no proceden de telemetría.
- La pantalla Clima y las estimaciones de rotación son simulaciones. Conectar un satélite no las convierte en pronósticos ni valida automáticamente sus recomendaciones.

## Evidencia consultada

Se verificaron los catálogos públicos, sin enviar ubicaciones del proyecto, el 14 de noviembre de 2026:

- [CONAE GEOServicios](https://catalogos.conae.gov.ar/catalogo/catalogoGeoServiciosOGC.html) y GetCapabilities de HumedadDeSuelos, EstatusHidrico, PrecipitacionAcumulada y Cultivos.
- `DSS_MSM_1` y `DSS_PSM_1`: título fechado 2026-11-12. `MOM_GPMIMERG_PA1D_1`: 2026-11-13. `SMAP_Pasada_Descendente`: 2023-11-21. `SMOS_Pasada_Descendente`: 2026-01-14. Son fechas del catálogo, no garantía de cobertura en un lote.
- [API pública de Planetary Computer](https://planetarycomputer.microsoft.com/api/data/v1/openapi.json), colecciones `sentinel-2-l2a`, `sentinel-1-rtc` y `modis-11A2-061`. El endpoint de punto devuelve `values` y `band_names`; el de teselas permite visualizar una escena concreta.
- [Corrección radiométrica de Sentinel-2](https://github.com/microsoft/PlanetaryComputer/issues/134): el NDVI requiere considerar el offset de las versiones de procesamiento desde 04.00 y la clasificación de nubes del píxel.
- [SMAP NSIDC](https://nsidc.org/sites/default/files/spl3smp_e-v004-userguide.pdf): humedad superficial, aproximadamente 0–5 cm, expresada como fracción volumétrica. No equivale a agua útil ni a humedad de 0–100 cm.

## Decisión de implementación

1. Consultar productos públicos reales por punto, con procedencia, fecha de observación y fecha de consulta separadas. No completar faltantes con simulaciones.
2. Conservar y ampliar CONAE: SAOCOM, percentil, SMAP, SMOS, GPM, estatus hídrico, inundaciones, VIIRS, GOES y los productos de cultivos del PDF.
3. Conectar Sentinel-2 (NDVI con control de nubes y offset), Sentinel-1 RTC (retrodispersión radar, sin presentarla como humedad) y MODIS MOD11A2 (temperatura superficial compuesta de ocho días, sin presentarla como temperatura del aire ni anomalía).
4. Usar proxies del mismo origen en desarrollo, preview, Vercel y Netlify. No introducir credenciales en el navegador ni un proxy que acepte destinos arbitrarios.
5. Separar error de red/HTTP/OGC/formato, falta de cobertura, control de calidad, fecha desconocida y dato antiguo. Cancelar resultados que pertenezcan a otro lote/día.
6. Generar avisos únicamente a partir de datos vigentes con una interpretación respaldada por el producto. Las comparaciones con lo normal requieren percentiles reales; una lectura aislada de NDVI no demuestra una caída.
7. Mantener explícitamente demostrativos el clima y las estimaciones de rotación. Mostrar como pendientes las misiones sin un proveedor conectado; RADARSAT, PAZ, COSMO-SkyMed y telemetría regional requieren acceso y productos específicos.

## Alcance y límites

La ubicación disponible es un punto; no existe un polígono de lote. Una consulta describe un píxel o zona homogénea, no un promedio de las hectáreas declaradas. No se reconstruyen estratos de 10 cm, agua útil, normales históricas ni tendencias a partir de una lectura aislada. No se infiere ausencia de incendios o inundación si el proveedor no devuelve datos. La app consulta los servicios para las coordenadas elegidas al utilizarla. Las pruebas automatizadas usan respuestas controladas; la verificación externa se hizo con metadatos públicos y un punto público ajeno al proyecto.

## Resultado implementado y verificación

La auditoría regional posterior está en [AUDITORIA_SATELITAL.md](AUDITORIA_SATELITAL.md): nueve ciudades, 90 lecturas por ronda, comparación antes/después y respuestas JSON con procedencia. La búsqueda actual revisa hasta 24 escenas de 90 días, consulta hasta 12 píxeles en la misma ubicación y conserva la fecha y calidad reales. Distingue cobertura publicada, NoData, calidad, falta de escenas y consultas incompletas. Los valores históricos recuperados no activan alertas como si fueran actuales.

### Corrección de lecturas CONAE descartadas

La primera implementación reconocía únicamente nombres de banda genéricos (`GRAY_INDEX`, etc.). Una prueba fuera de la cobertura argentina no detectó que CONAE usa nombres propios: `HUMEDAD_DE_SUELO`, `PERCENTIL_HUMEDAD_DE_SUELO`, `PA1D`, `PA1M`, `INCIDENCIA_FUSARIOSIS_TRIGO` y `PCNTLAPI`. Eso descartaba mediciones válidas como si fueran NoData.

Se corrigió la correspondencia explícita por producto. Un campo desconocido ahora produce un error de interpretación, no un diagnóstico de falta de cobertura. Los valores nulos siguen sin convertirse en cero y las unidades se conservan por producto. Para lluvia mensual, la fecha de cierre se lee del intervalo del Abstract, porque el título solo trae año y mes.

La corrección se comprobó con los adaptadores reales en dos centros urbanos públicos, sin usar ubicaciones del usuario: Pergamino devolvió humedad SAOCOM 36 % vol., percentil 27 y lluvia diaria 4,2 mm; Junín devolvió 21 % vol., percentil 17 y lluvia diaria 32,9 mm. SMAP devolvió null en esos puntos; SMOS devolvió mediciones históricas que mantienen su etiqueta de dato antiguo. Son ejemplos de diagnóstico, no valores fijos para la app.

`tests/fixtures/conae-feature-info.json` conserva los formatos de respuesta verificados para las pruebas de regresión. `npm run check:conae` repite el diagnóstico real en esos puntos públicos; requiere conexión a Internet y no lee perfiles locales.

- Hay 16 productos seleccionables: 13 capas CONAE y tres productos STAC (Sentinel-2, Sentinel-1 RTC y MODIS). Diez productos se consultan en Inicio; los restantes se consultan al seleccionar su capa en el mapa.
- `satelliteApi.ts` valida HTTP, excepciones OGC, formato, NoData, fecha, reflectancia Sentinel-2, clasificación SCL y bits QC de MODIS. El catálogo WMS se comparte en caché durante 15 minutos. Las consultas de punto se cancelan al cambiar de ubicación o producto.
- `dataLoader.ts` publica resultados parciales por proveedor durante cada consulta. Las lecturas satelitales no se persisten al recargar la página.
- Una escena nublada puede mostrarse como contexto en el mapa sin que su NDVI figure como una medición válida. Las imágenes recibidas no verifican por sí solas la cobertura del punto.
- Las alertas automáticas solo siguen percentiles secos SAOCOM e incidencia modelada de fusariosis para un perfil que declare trigo. No se implementó inferencia de proximidad de incendios, alertas aguas arriba ni comparación temporal de NDVI.
- El informe JSON incluye cada lectura con fuente, fechas y estado, y marca las estrategias como `demo`. La vista imprimible conserva la misma distinción.
- Se corrigió el conflicto entre esbuild 0.25 del manifiesto y Vite 8, que requiere 0.27/0.28. `npm install` ya resuelve las dependencias sin `--legacy-peer-deps`.
- Las pruebas automatizadas usan respuestas controladas; no transmiten ubicaciones del proyecto. Cubren antigüedad, NoData y ceros válidos, errores HTTP/OGC/formato, calidad, cambios de serie y lote durante consultas, edición de estancia, móvil y exportación.
- Adicionalmente se ejecutaron los adaptadores reales sobre **Puerta del Sol, Madrid**, un punto público de prueba ajeno al usuario: CONAE devolvió NoData y conservó sus fechas de catálogo; Sentinel-1 devolvió retrodispersión válida; MODIS devolvió 22,59 °C con fecha de final de compuesto 2026-10-31; Sentinel-2 rechazó las escenas consultadas por control de calidad. Estos resultados verifican transporte e interpretación, no cobertura de campos argentinos.
