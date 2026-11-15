# ArgField — integración de observaciones y comparación de rotaciones

Fecha de verificación: 15 de noviembre de 2026. Se conserva el motor v1.1.0, sus pesos y fórmulas FAO-56, los datasets MAGyP, los proveedores y proxies existentes. No se agregó backend, autenticación, servicios pagos ni el parche de Juan.

## Fuentes utilizadas

| Fuente | Función efectiva | Condiciones y límites |
|---|---|---|
| NASA POWER | Aptitud térmica, ETo y precipitación del balance y escenarios existentes | Serie histórica; no se reemplazó su implementación |
| CONAE SAOCOM | Inicialización de agua útil en la capa 0–50 cm; modifica balance e indicador hídrico | Humedad volumétrica válida, unidad correcta, fecha vigente y mismo mes/año nominal de la primera campaña. CC/PMP documentadas. La capa profunda mantiene el supuesto de 50% de agua útil; campañas posteriores no reutilizan la lectura |
| NASA GPM IMERG / CONAE | Percentil API como diagnóstico de precipitación antecedente; desvío de lluvia diaria reciente | Variabilidad solo con al menos cinco días consecutivos distintos de la ventana de siete días. Diagnósticos separados de S(r): jamás se suman a POWER ni se duplican acumulados diarios/mensuales |
| ESA Sentinel-2 | Cambio entre extremos de NDVI observado | Al menos cuatro fechas distintas en un intervalo de treinta días, máximo noventa días, mismo punto, escenas con corrección radiométrica y control de calidad. No predice las rotaciones futuras |

La admisión vuelve a comprobar fecha, vigencia, valor finito, rango y unidad en la entrada del motor. Las lecturas guardadas no inicializan condiciones actuales. Los cambios de ubicación descartan respuestas anteriores y el adaptador filtra lecturas pertenecientes a otro punto.

Cada evidencia conserva producto, fuente, URL, fecha de observación, resolución, validez y función efectiva. La proveniencia distingue uso en balance, diagnóstico observado, contexto y exclusión. Las series conservan las fechas y URLs de las muestras efectivamente usadas, sin inferir fechas a partir del número de capa. Una muestra histórica válida puede pertenecer a la serie de siete días aunque supere los tres días de vigencia de una lectura de lluvia actual; nunca se reutiliza como condición actual.

Referencias: [perfil SAOCOM integrado](https://www.argentina.gob.ar/ciencia/conae/productos-saocom/mapas-de-humedad-de-suelo-integrado), [catálogo OGC CONAE](https://catalogos.conae.gov.ar/catalogo/catalogoGeoServiciosOGC.html), [NASA IMERG](https://gpm.nasa.gov/data/imerg), [productos SMAP NSIDC](https://nsidc.org/data/smap/data).

## Contexto y fuentes complementarias

- SMAP y SMOS superficiales: contexto. Los primeros centímetros no representan el almacenamiento de toda la zona de raíces. SMAP no se extrapola al perfil.
- MODIS LST: contexto térmico de superficie; no sustituye la temperatura del aire usada por FAO-56.
- Sentinel-1: retrodispersión; no se transforma directamente en humedad o compactación.
- VIIRS/GOES: capas del mapa; sin incorporación numérica al balance. ECOSTRESS: catálogo, sin extracción conectada.
- SAOCOM percentil y modelo CONAE de fusariosis: se conservan sus reglas de aviso existentes; no se introducen como nuevos pesos en el ranking.
- IMERG diario/mensual aislado y NDVI sin serie suficiente: contexto, sin inventar variabilidad ni tendencia.

## Prioridad regional y acceso

NASA + CONAE se priorizan en toda Argentina. NEA añade AEB/AEP; Patagonia y sur, participación británica y europea; NOA y cordillera, ESA/España/Italia/Canadá; centro y región pampeana, Europa/Canadá. La clasificación geográfica es aproximada para ordenar preferencias: no filtra cobertura. El catálogo mantiene las quince fuentes en todas las regiones; las consultas verifican el punto real.

| Agencia / misión complementaria | Verificación y estado en ArgField |
|---|---|
| AEB / INPE Amazonia-1 | Colección pública STAC AMZ1-WFI-L2-DN-1, imágenes de 64 m. Sin extracción radiométrica agrícola y control de calidad conectado para el lote: no disponible para cálculo. La existencia del catálogo no prueba una observación válida en la ubicación |
| AEP / GuaraniSat-1 | Ficha oficial describe cámara, demostración tecnológica y comunicaciones. No se verificó un producto agrícola de humedad o NDVI: no disponible. Red hidrológica del catálogo tampoco tiene feed verificado |
| Reino Unido / EarthCARE | Misión atmosférica ESA/JAXA con participación británica. Sin producto agronómico procesado conectado; no se atribuye humedad o NDVI |
| España / PAZ | Radar de Hisdesat, sin servicio agrícola puntual conectado: no disponible para cálculo |
| Italia / COSMO-SkyMed | Acceso institucional/comercial por portales y procesamiento SAR; no conectado y no se añaden credenciales |
| Canadá / RADARSAT RCM | Existen productos gratuitos según condiciones de acceso, con registro EODMS y licencia. Sin cuenta ni procesamiento agrícola conectado: no disponible para cálculo |
| ESA / Sentinel-2, Sentinel-1 y SMOS | Servicios existentes reutilizados en todas las regiones; calidad, cobertura y vigencia determinan el uso efectivo |

Fuentes oficiales: [INPE STAC](https://data.inpe.br/bdc/stac/v1/collections/AMZ1-WFI-L2-DN-1), [AEP](https://aep.gov.py/guaranisat-1-2/), [EarthCARE](https://www.esa.int/Applications/Observing_the_Earth/FutureEO/EarthCARE/Facts_and_figures), [Hisdesat PAZ](https://www.hisdesat.es/en/satelites_observacion/), [ASI](https://www.asi.it/en/earth-science/cosmo-skymed/), [acceso RCM](https://www.asc-csa.gc.ca/eng/satellites/radarsat/access-to-data/about.asp).

## Auditoría en vivo

Se consultaron nueve puntos públicos de ciudades, no promedios de lotes: Pergamino, Rosario, Córdoba, Resistencia, Salta, Mendoza, Neuquén, Trelew y Río Gallegos. La primera ejecución en entorno restringido falló por red; la repetición con acceso a los endpoints públicos completó la auditoría.

- IMERG (diario, mensual y API) y Sentinel-2: lecturas vigentes en los nueve puntos.
- SAOCOM humedad y percentil: vigentes en Pergamino; sin dato en los otros ocho puntos.
- SMAP: lecturas antiguas en Córdoba, Salta, Mendoza y Neuquén; sin dato en los demás.
- MODIS: vigente en seis puntos y antiguo en Salta, Mendoza y Trelew.
- Sentinel-1: vigente salvo Rosario, sin píxel válido.

Detalle reproducible con fechas, valores, estados y URLs: `AUDITORIA_SATELITAL.json` y `AUDITORIA_SATELITAL.md`, generados por `npm run audit:satellites`. Es una prueba de disponibilidad puntual; no confirma cobertura integral de una región ni asegura disponibilidad futura. Esta auditoría consulta lecturas individuales; las series se verifican adicionalmente mediante pruebas de integración deterministas.

## Comparación del productor

En el registro existente se declaran dos o tres campañas, en orden, con una tercera opcional y trigo + soja de segunda cuando sea compatible. No se infiere la secuencia a partir de los cultivos actuales ni se rellena con monocultivo. Se conserva el horizonte declarado para todas las alternativas.

La tabla compara la secuencia declarada con las dos mejores alternativas distintas bajo los mismos siete criterios, datos y pesos. La línea de base permanece visible aunque quede excluida, con sus criterios y motivos, sin convertir un puntaje nulo en cero. Se muestran diferencias de indicadores, justificaciones y riesgos; si la actual iguala o supera a las alternativas, se aclara que el puntaje no justifica un cambio. Sin dos opciones viables se informa la limitación, no se generan opciones artificiales.

También se exponen el tipo de suelo y el tope de riego mensual declarado. Riego disponible sin cantidad no aporta agua al balance. Estos campos, la rotación y las prioridades se guardan y disparan una nueva evaluación.

## Límites científicos que permanecen

1. El balance mensual y las propiedades por textura son aproximaciones; no equivalen a mediciones de suelo ni a un modelo calibrado del lote. La inicialización SAOCOM dentro del mes nominal es una aproximación mensual, no una reconstrucción diaria.
2. Una humedad reciente no representa campañas futuras. No hay extrapolación vertical de SMAP ni de SAOCOM más allá de su capa.
3. NDVI no identifica por sí solo suelo descubierto, rastrojo, agua o cobertura porcentual. Esos beneficios y duraciones quedan **no estimados**, aun cuando haya un cambio de vigor calculable.
4. Las puntuaciones no son predicciones de rendimiento ni ahorros hídricos, secuestro de carbono o resultados validados experimentalmente. MAGyP es estadística regional y los escenarios climáticos son sensibilidades hipotéticas.
5. Limitación heredada, expuesta en la comparación: en trigo + soja de segunda el balance del motor v1.1.0 evalúa el cultivo primario; no estima la demanda hídrica conjunta. No interpretar su indicador como ventaja hídrica del doble cultivo. No se modificó esa fórmula ni se integró otro parche.
6. El catálogo piloto conserva sus límites de cultivos, ventanas y reglas excluyentes. No se inventan parámetros para perennes o cultivos no soportados.

## Verificación

- `npx tsc --noEmit`: correcto (invocado como `npx.cmd` por la política de PowerShell).
- `npm test`: 71/71 pruebas aprobadas, incluidas las nuevas pruebas de efecto hídrico SAOCOM, exclusión de observaciones inválidas, ausencia de doble conteo, series IMERG/NDVI, trazabilidad, cambios de ubicación y comparación declarada. Las pruebas existentes cubren suelo, riego y prioridades.
- `npm run build`: correcto; advertencia de Vite por bundle mayor a 500 kB, sin modificar arquitectura para dividirlo.
- Prueba de navegador del flujo de declaración, persistencia, suelo/riego y comparación con dos alternativas: aprobada. Captura revisada en `test-results/rotation-comparison.png`.

Los fixtures sintéticos solo se utilizan en pruebas y están identificados como tales. No se insertan sus valores en la aplicación.
