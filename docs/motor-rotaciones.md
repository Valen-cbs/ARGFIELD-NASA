# Motor matemático de decisiones agronómicas — ArgField

Documentación técnica del motor de rotaciones (`src/engine/`, `scripts/buildMagypStats.mjs`, `scripts/smoke-engine.ts`, `tests/engine.test.ts`).

Versión del motor: `ENGINE_VERSION = 1.1.0` (`src/engine/engineTypes.ts`).

---

## 1. Fuentes oficiales y URLs de datasets

| Fuente | Qué aporta | URL | Acceso implementado |
| --- | --- | --- | --- |
| NASA POWER (MERRA-2) | Serie agroclimática diaria 2016–2025: T2M, T2M_MAX, T2M_MIN (°C), PRECTOTCORR (mm/día), ALLSKY_SFC_SW_DWN (MJ/m²/día), RH2M (%), WS2M (m/s) | `https://power.larc.nasa.gov/api/temporal/daily/point` (docs: `/docs/services/api/temporal/daily/`) | Consulta por punto en vivo vía `/proxy/power` (mismo proxy Vercel/Netlify/dev existente), agregada en el cliente a climatología mensual. Fixture real reproducible: `tests/fixtures/power-chaco-2016-2025.json` |
| MAGyP · Estimaciones Agrícolas | Superficie sembrada/cosechada (ha), producción (tn) por cultivo, campaña, provincia y departamento | `https://datosestimaciones.magyp.gob.ar/reportes.php?reporte=Estimaciones` (descarga del dataset completo: `POST Dataset=Dataset`) | Preprocesamiento estático UNA VEZ (dev): `npm run build:magyp` → `public/data/magyp-provincial.json` (66 KB) y `magyp-departamental.json` (1 MB). Descarga verificada 2026-11-15, 163 760 filas. La app consulta solo estos archivos |
| GPM IMERG (vía CONAE WMS) | Lluvia reciente (mm/día `PA1D`, mm/mes `PA1M`) | `https://gpm.nasa.gov/data/imerg` + `geoservicios.conae.gov.ar` | Lecturas ya validadas por los servicios existentes (`SatelliteReading`); el motor las usa como **evidencia de condición actual**, nunca las suma a POWER |
| SAOCOM 1A/1B (vía CONAE) | Humedad de suelo volumétrica (% vol., perfil 0–50 cm) y percentil | idem | Solo con observación vigente y mismo mes/año nominal inicial: ajusta la capa 0–50 cm; resto del perfil conserva el supuesto |
| SMAP | Humedad superficial (% vol., 0–5 cm) | idem | Solo contexto superficial; no inicializa el balance ni se extrapola a raíces |
| Sentinel-2 / Sentinel-1 (ESA, vía Planetary Computer) | NDVI y retrodispersión | idem | Contexto interpretativo; no modifica puntajes |
| MODIS Terra/Aqua | Temperatura de superficie (LST, NO temperatura del aire) | idem | Contexto; se advierte la diferencia |
| OpenStreetMap Nominatim | Departamento/partido desde coordenadas (para anclar MAGyP) | `https://nominatim.openstreetmap.org/reverse` | Consulta puntual con caché por coordenada; si falla → escala provincial documentada |
| FAO | Parámetros de cultivo (EcoCrop/GAEZ), Kc y p (FAO-56), balance | `https://www.fao.org/gaez/en`, `https://ecocrop.fao.org`, FAO-56 (Allen et al., 1998) | Codificados en `src/engine/agronomy.ts` con procedencia por campo |
| INTA (geo.inta.gob.ar) | Suelos, ventanas | `https://geo.inta.gob.ar/` | **No accesible desde el entorno de desarrollo actual** (timeout de red). El modelo usa (a) el catálogo de suelos ya presente en la app (`SOIL_DATABASE`) y (b) propiedades declaradas manualmente por el productor, marcadas como tales. Limitación documentada, no oculta |

**Datos que NO pudieron obtenerse** (y cómo se maneja el motor): servicios geoespaciales INTA (usado catálogo local + valores declarados); ECOSTRESS/VIIRS/Amazonia-1 no tienen producto continuo consultable integrado en ArgField y no se incorporan (según el desafío, no se agregan fuentes sin variable interpretable); campaña 2026/27 aún no publicada en el dataset MAGyP descargado (última: 2025/26).

---

## 2. Base agronómica (cultivos piloto)

Cultivos con parámetros completos en `src/engine/agronomy.ts`:

| ID motor | Nombre | Serie MAGyP usada | Agregados excluidos (anti doble conteo) |
| --- | --- | --- | --- |
| `soja1` | Soja de primera | `Soja 1ra` (ID 34) | `Soja total` (25) |
| `soja2` | Soja de segunda | `Soja 2da` (ID 35) | `Soja total` (25) |
| `maiz` | Maíz | `Maíz` (32) | — |
| `trigo` | Trigo | `Trigo total` (28) | `Trigo candeal` (29) |
| `girasol` | Girasol | `Girasol` (14) | — |
| `sorgo` | Sorgo granífero | `Sorgo` (26) | — |

Reglas: `soja2` solo existe como segunda ocupación tras trigo en la misma campaña; `soja1` y `soja2` se evalúan como series separadas, nunca sumadas; `Trigo candeal` es subconjunto de `Trigo total` y jamás se suma. El catálogo MAGyP completo (`src/data/magypCrops.ts`) sigue disponible para el registro; cultivos sin parámetros (p. ej. cebada, maní) **no** generan rotaciones ni reciben valores inventados.

Parámetros por cultivo (con fuente en el propio código): familia botánica; ciclo (días); etapas FAO-56 `[inicial, desarrollo, media, final]`; Kc único por etapa; fracción de agotamiento `p`; profundidad radicular (m, dentro del rango FAO-56 Tabla 22); rangos de temperatura óptimos/absolutos (orientativos EcoCrop); sensibilidad a helada; resistencia a sequía; fijación de N (kg/ha, orientativo); residuos (tn MS/ha); meses de cobertura; ventanas de siembra por macroregión (`norte`, `noa`, `centro` — orientativas, basadas en difusión INTA/AACARA, se advierten como no calibración local); compatibilidad con tipos de suelo (decisión del modelo sobre el catálogo local); penalizaciones de sucesión.

---

## 3. Ecuaciones implementadas

### 3.1 Estadística regional MAGyP (`statistics.ts`, `magyp.ts`)

- Rendimiento por campaña: `Y(c,t) = Σ_dept P / Σ_dept A_cosechada` (kg/ha; tn × 1000).
- Promedio ponderado histórico: `Ȳ = Σ_t P / Σ_t A` (kg/ha).
- Variabilidad interanual: `CV = σ_muestral(Y_t) / μ(Y_t)`.
- Registros con superficie cosechada nula o no positiva se **excluyen** del rendimiento y se cuentan (`filasConCosechadaNula`); nunca se reemplazan por promedios.
- La serie **departamental** se usa si tiene ≥ 8 campañas válidas; si no, la **provincial**, marcando expresamente el cambio de escala. Si la departamental tiene < 80 % de las campañas de la provincial, se prefiere la provincial y se documenta.
- `Ȳ` regional **no** es el rendimiento esperado del lote; `CV` **no** es una probabilidad de fracaso (se usa como `estabilidad = 1/(1+CV)` en la comparación entre alternativas).

### 3.2 Climatología (`climate.ts`)

- Agregación diaria POWER → mensual: medias de T2M/T2M_MAX/T2M_MIN, totales de precipitación con control de cobertura (≥ 80 % de días válidos), CV interanual por mes (≥ 5 años), días Tmax ≥ 35 °C, días Tmin < 0 °C, días de lluvia (P ≥ 1 mm).
- **Descubrimiento documentado**: el endpoint `climatology` de POWER reporta en `T2M_MAX/T2M_MIN` el **extremo** mensual del período (verificado para Chaco: 42.9 °C en enero frente a 34.6 °C de media de máximos). El motor usa series diarias y calcula medias de máximos, no extremos.
- Valores `-999` = faltantes; nunca cero.

### 3.3 Evapotranspiración de referencia — FAO-56 Penman-Monteith (`fao56EtoMonthlyMm`)

`ETo = [0.408 Δ (Rn − G) + γ (900/(T+273)) u2 (es − ea)] / [Δ + γ (1 + 0.34 u2)]`, con paso mensual (G = 0), `ea` por HR media (ecuación 14 de FAO-56, aproximación documentada), Rso por latitud/día juliano y altitud. Si falta un insumo (p. ej. HR), ETo = `null` — **no** se fabrica un valor aproximado. Sanity check en pruebas: ETo anual de Chaco dentro de ~900–1400 mm.

### 3.4 Balance hídrico mensual (`soil.ts`)

`S_{t+1} = S_t + P_t + I_t − ETa_t − R_t − D_t`, con `S ∈ [0, TAW]` (agua útil entre marchitez y capacidad de campo, limitada por `min(profundidad suelo, raíz cultivo)`).

- `ETa = Ks · Kc · ETo`, `Ks = (TAW − Dr)/(TAW − RAW)` (FAO-56 ec. 82–84) — el ajuste por estrés **siempre** aplica; nunca `ETa = Kc·ETo` con déficit.
- `R` (escorrentía): SCS-CN **por evento**: la precipitación mensual se divide entre los días de lluvia medios (POWER) y se suma `Q = (P−Ia)²/(P+0.8·Smax)` por pulso, `Ia = 0.2·Smax`. Motivo documentado: SCS-CN se calibró para eventos; aplicarlo al total mensual sobrestimaba (43 % de P en la primera medición). Sin días de lluvia disponibles → un único pulso mensual (se advierte).
- `D` (drenaje) = exceso sobre TAW.
- `I` (riego): la DISPONIBILIDAD de riego y el VOLUMEN aplicable son datos distintos. Solo si el productor declara riego disponible **y** declara el volumen mensual aplicable (`maxMonthlyIrrigationMm`), el balance aplica riego complementario que cubre el agotamiento hasta ese tope **declarado por el productor**. Riego disponible sin volumen declarado → el balance corre en secano (I = 0) con advertencia explícita; el modelo NO asume un caudal por omisión (la versión 1.0.0 asumía 60 mm/mes automáticamente: corregido).
- `S0`: 50 % del agua útil por omisión (suposición declarada). Con lectura **vigente** de humedad volumétrica SAOCOM (`current === true`) del mismo mes/año nominal de la primera campaña: `S0 = (θ − PMP) / (CC − PMP) × TAW`, con CC/PMP declaradas por el productor o, si no, estimadas por textura del catálogo. La conversión θ→mm es válida SOLO con CC/PMP disponibles y consistentes; lecturas vencidas, conversiones inválidas (PMP ≥ CC, θ fuera de 0–60 % vol) o perfiles sin CC/PMP se rechazan con advertencia y caen al supuesto por omisión (antes se multiplicaba θ × TAW, físicamente incorrecto: corregido). La lectura solo ajusta la capa 0–50 cm; el resto conserva el supuesto. SMAP no inicializa el perfil. Se aplican las validaciones de `observations.ts` y no se reutiliza una lectura actual en campañas posteriores.
- Si falta P o ETo de algún mes del ciclo → `ok=false` con razón; no se fuerza con ceros ni promedios.

### 3.5 Aptitud climática (`suitability.ts`)

Función **trapezoidal** por mes del ciclo sobre la media mensual (± ΔT del escenario): 1 dentro de `[optMin, optMax]`; descenso lineal hacia `[absMin, absMax]`; 0 fuera. Cultivos sensibles a helada: factor 0.7 en meses del ciclo con heladas y temperatura por debajo del óptimo (decisión documentada). Ventana de siembra: `ok` / `outside` (excluyente) / `unknown` (advertencia, no exclusión). Los umbrales son decisiones del modelo (`EXCLUSION_THRESHOLDS`), no límites biológicos exactos.

### 3.6 Evaluación multicriterio (`evaluation.ts`)

`S(r) = Σ_i w_i · f_i(r)` con `f_i ∈ [0,1]` y **restricciones excluyentes aplicadas antes** (una rotación incompatible no se compensa). Criterios:

| Criterio | f_i (0–1) | Fuente |
| --- | --- | --- |
| `clima_aptitud` | media de aptitud térmica de los cultivos de la secuencia | POWER + EcoCrop |
| `agua_compatibilidad` | media de `1 − estrés` con estrés `= 1 − ΣETa/ΣETc` por campaña | balance FAO-56 |
| `suelo_compatibilidad` | media de compatibilidad cultivo↔suelo del catálogo; **sin calibración para la textura declarada → criterio NO disponible (null, sin valor neutral y sin exclusión por desconocimiento)**; el riego disponible NO bonifica el suelo (su efecto hídrico se evalúa en el balance FAO-56) | catálogo suelos |
| `cobertura_suelo` | media de meses de cobertura/12 (trigo+soja2 cuentan la doble ocupación) | base agronómica |
| `diversificacion` | entropía de Shannon de familias normalizada por `ln(3)` | secuencia |
| `sucesion` | `1 − penalización media` (mapa documentado por cultivo anterior) | reglas agronómicas |
| `estabilidad_regional` | media de `1/(1+CV)` de series MAGyP con ≥ 8 campañas | MAGyP |

Exclusiones excluyentes (registradas con paso y motivo): `repeticion_mismo_cultivo` (consecutivos, incluye la línea de base), `ventana_temporal`, `termicamente_inadecuado` (aptitud < 0.25), `suelo_incompatible` (compatibilidad < 0.35), `agua_insuficiente_secano` (oferta/demanda < 0.4 en secano con cultivo no rústico). Cultivo perenne como único cultivo del establecimiento → no se generan rotaciones anuales (informado).

**Datos faltantes**: `f_i = null` (nunca 1 ni 0). La agregación renormaliza los pesos de los criterios disponibles y el resultado informa **completitud** `= Σ w_disponibles`.

### 3.7 Pesos por prioridad (decisiones del modelo, configurables)

`DEFAULT_WEIGHTS` (se renormalizan a 1; ajustables por el productor con `weightOverrides`):

| Prioridad | clima | agua | suelo | cobertura | diversif. | sucesión | estabilidad |
| --- | --- | --- | --- | --- | --- | --- | --- |
| conserve_moisture | 0.15 | 0.25 | 0.15 | 0.20 | 0.10 | 0.05 | 0.10 |
| build_soil_organic | 0.05 | 0.10 | 0.25 | 0.20 | 0.15 | 0.15 | 0.10 |
| drought_resilience | 0.20 | 0.25 | 0.10 | 0.05 | 0.10 | 0.10 | 0.20 |
| erosion_control | 0.05 | 0.15 | 0.20 | 0.30 | 0.10 | 0.10 | 0.10 |
| maximize_margin | 0.20 | 0.15 | 0.10 | 0.10 | 0.10 | 0.10 | 0.25 |

---

## 4. Escenarios climáticos (`scenarios.ts`)

Hipotéticos y claramente etiquetados (NO son pronósticos NASA):

| ID | Precipitación | Temperatura |
| --- | --- | --- |
| `referencia` | histórica 2016–2025 | histórica |
| `precip_menor` | × 0.70 | +0 °C |
| `temp_mayor` | × 1 | +2 °C |
| `estres_combinado` | × 0.70 | +2 °C |

Se aplican **a las entradas** (P × f, T + Δ), se **recalcula ETo con FAO-56** (HR/radiación/viento constantes — decisión documentada) y todos los indicadores afectados (aptitud, balance). Nunca se ajustan porcentajes sobre el puntaje final. Cada alternativa informa `scenarioId`.

---

## 5. Resultado del motor (`engineTypes.ts`)

Cada alternativa incluye: secuencia (campaña con año de siembra, cultivo/s, mes nominal, ventana), horizonte, exclusiones incumplidas (si corresponden), indicadores por campaña (ETo, balance con P/I/R/D/ETa/Ks/almacenamiento, aptitud térmica mensual, estadística regional usada con escala y nº de campañas), evaluación multicriterio con **desglose por criterio** (valor, peso, detalle con fuentes), prioridades aplicadas, justificación textual línea por línea, advertencias, provenencia (URLs POWER, fechas de observación satelital, descarga MAGyP, geocodificación OSM), cobertura/resolución (`~0.5° MERRA-2`, IMERG 0.1°, SAOCOM/SMAP superficie) y completitud.

Integración: `useRotationEngine` (`src/services/rotationEngineAdapter.ts`) consume `FarmProfile` + lecturas satelitales existentes, geocodifica con OSM, ejecuta el motor y adapta a `CropRotationPlan` para `RotationStrategies.tsx` **sin cambios visuales**; si el motor no puede ejecutarse, la app cae al generador cualitativo previo (`rotationOptimizer.ts`). El registro de estancias, la navegación y la persistencia no se modifican.

---

## 6. Supuestos y restricciones (lista explícita)

1. Paso mensual del balance (no diario): subestima pulsos cortos; se documenta en cada resultado.
2. RAW mensual ≈ 0.5·TAW (p medio; FAO-56 permite ajuste fino que aquí se simplifica).
3. Riego complementario solo si hay volumen mensual DECLARADO por el productor (`maxMonthlyIrrigationMm`); disponibilidad sin volumen declarado → balance en secano con advertencia (sin caudal asumido).
4. S0 = 50 % del agua útil sin lectura vigente; con lectura vigente se convierte θ→mm con CC/PMP (declaradas o estimadas por textura), rechazando lecturas no vigentes o físicamente implausibles.
5. HR, radiación y viento constantes entre escenarios.
6. `conserve_moisture` y demás pesos: decisiones del modelo, no constantes científicas.
7. Umbrales excluyentes (0.25 térmico, 0.35 suelo, 0.4 oferta/demanda): decisiones del modelo.
8. Ventanas de siembra orientativas por macroregión; no calibración INTA local.
9. Precipitación POWER y IMERG son estimaciones alternativas de la misma variable: IMERG no entra al balance ni a los acumulados climáticos (verificado por prueba).
10. LST ≠ temperatura del aire; NDVI puntual ≠ cobertura del lote.
11. La numeración de campañas MAGyP no es estrictamente anual (54=2022/23, 57=2023/24; 55–56 no existen): los JSON empotran el mapa oficial `campaignLabelsById`; el rótulo de campañas futuras usa año de siembra (`2026/27`).
12. Diferencia por naturaleza del dato: **observación** satelital (con fecha oficial de adquisición), **estadística** MAGyP (histórica regional), **escenario** (hipótesis propia, no NASA), **estimación del modelo** (balance/aptitud). El resultado etiqueta cada número con su naturaleza.
13. CC/PMP (capacidad de campo y punto de marchitez permanente, % vol): estimaciones por textura del catálogo, coherentes con el agua útil (TAW = (CC − PMP) × 1000 × profundidad efectiva); NO son mediciones del lote y el productor puede declararlas (tienen precedencia). Sin CC/PMP válidas, la conversión de lecturas volumétricas no es válida y la lectura satelital no se usa para inicializar el almacenamiento.

---

## 7. Caso argentino reproducible

- **Estancia**: Comandante Fernández, Chaco (`-26.786, -60.443`), 850 ha, vertisol, secano, soja actual con soja previa, prioridad `drought_resilience`.
- **Datos reales identificables**: serie diaria POWER 2016-01-01→2025-12-31 para el punto (fixture `tests/fixtures/power-chaco-2016-2025.json`, descargada 2026-11-15, geometría `[-60.443, -26.786, 93.74]`); series MAGyP reales de `COMANDANTE FERNANDEZ` (Soja 1ra: Ȳ 1770 kg/ha, CV 0.37, 26 campañas; y provincial 2002 kg/ha, CV 0.31) en `public/data/magyp-*.json` (descarga 2026-11-15).
- **Ejecución**: `npm run smoke:engine` (script con salida completa) o `npm test` (prueba `caso Chaco`).
- **Salida esperada (2026-11-15)**: 8 alternativas rankeadas con puntaje ~0.83–0.87 y completitud 1.0; línea de base soja→soja→soja excluida por `repeticion_mismo_cultivo`; el escenario `estres_combinado` no supera a la referencia; provenencia con años y altitud.

---

## 8. Limitaciones pendientes

1. INTA geoespacial no accesible desde el entorno actual → suelos por catálogo + declarados; pendiente integrar WMS cuando la red lo permita.
2. ECOSTRESS/VIIRS/SAOCOM profundidad completa: sin integración de producto continuo; las lecturas usadas son las ya presentes en la app.
3. Balance mensual: un modelo diario (o decádico) con FAO-56 etapas explícitas reduciría la incertidumbre del estrés.
4. Rendimientos: el motor compara estabilidad regional; no predice rendimiento del lote (requeriría calibración local y respuesta a manejo).
5. Carbono orgánico: sin modelo validado → no se estima (queda marcado "No estimado").
6. La campaña 2026/27 no está en el dataset MAGyP descargado; las estadísticas se apoyan en series hasta 2025/26.
7. GAEZ/EcoCrop: rangos resumidos orientativos; una ficha EcoCrop por especie por región afinaría la aptitud.
8. Nominatim: resolución de departamento aproximada en zonas rurales; si falla, escala provincial (documentada).
9. Estación/consumo: la descarga POWER diaria (~420 KB por punto, 10 años) se cachea en memoria; un cache persistente (localStorage/IndexedDB) es mejora pendiente.
