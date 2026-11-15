# Cierre del optimizador — 15 de noviembre de 2026

Base auditada: `16b4254a6e7831c13cb09ea0fef9188e9577d61a`.

## Hallazgos reproducidos

1. `generateCandidates` → `stepFor` → `nominalSowMonth`: el catálogo no tiene ventanas de siembra para `sur` ni `cuyo`, ni una ventana general por defecto. Todas las ramas se detenían con `null` antes de llegar a evaluación, incluso con POWER e imágenes disponibles. La UI ocultaba este motivo y mostraba una tabla con S(r) sin columnas. Se informa ahora la región y los parámetros ausentes. No se copian ventanas de otra región para fabricar viabilidad.
2. `evaluateRotations`, selección de `referenceAlternatives`: eliminaba toda alternativa cuyo texto coincidía con la línea de base. En el caso de una única secuencia válida, declarar esa misma secuencia hacía desaparecer el único plan. Se conserva la optimización prospectiva aunque coincida con el historial.
3. `evaluateRotations`, cálculo de horizonte: la longitud del historial tenía prioridad sobre `constraints.horizonCampaigns`. Se separó el horizonte prospectivo (2 o 3; predeterminado 3). Un historial de diferente longitud se presenta como no comparable hasta configurar igual horizonte; no se rellena ni repite.
4. `useRotationEngine` reiniciaba resultados por identidad del arreglo de lecturas y esperaba Nominatim sin límite propio. Ahora compara su contenido, conserva resultados del mismo lote durante actualizaciones, limpia resultados al cambiar insumos/lote y limita la geocodificación opcional a 8 segundos. Los errores de integración tienen un mensaje propio y no se sustituyen por planes cualitativos.
5. `RotationStrategies` retornaba antes de mostrar advertencias cuando no había planes. `EngineComparison` esperaba dos opciones y solo mostraba dos mientras el adaptador enviaba ocho tarjetas. Ahora muestra hasta tres, admite una sola y muestra el diagnóstico completo cuando no hay resultados.

El prompt no incluye las coordenadas, el perfil persistido ni una exportación de la instancia original fallida. Por ello, los puntos anteriores son fallas verificadas por reproducción en código, no una atribución no comprobada de la región del lote original. En el fixture real de Chaco el motor anterior ya producía alternativas; la ausencia de MAGyP o historial por sí sola no causaba cero candidatos.

## Flujo y contratos

`FarmProfile` → `buildEngineInput` → `evaluateRotations` → `generateCandidates` → restricciones de evaluación → ranking de referencia → `planFromAlternative` → `RotationStrategies` y `EngineComparison`.

- `rotationConstraints` transporta horizonte, exclusiones y cultivos requeridos hacia el motor. El formulario permite configurar el horizonte independientemente del historial. Se respeta la restricción documentada de incluir todos los `preferredCrops` cuando se informan.
- `Trigo total` del catálogo de registro se mapea a `trigo`; nombres no soportados no se sustituyen por otros cultivos.
- Los conteos de diagnóstico corresponden a secuencias prospectivas en el escenario de referencia, sin incluir el historial. Cada regla cuenta una secuencia una vez, aunque falle en varias campañas. Las frecuencias de reglas pueden solaparse. También se conservan conteos por escenario y errores por candidato/escenario.
- Los puntajes y pesos existentes se conservan. Los criterios sin insumos quedan `null`, se renormalizan pesos disponibles y se informa completitud. No se inventan rendimientos ni beneficios físicos.

## Escenario reproducible sin red

```sh
npm ci
npm run smoke:optimizer
```

El script usa exclusivamente `tests/fixtures/power-chaco-2016-2025.json`, una adquisición real ya existente del punto (-26.786, -60.443), Chaco, serie 2016–2025. MAGyP se deja ausente de forma explícita. Fecha de evaluación fija: `2026-11-15T18:00:00Z`; 120 ha; región norte; suelo molisol profundo; secano; antecesor soja1; prioridad conservar humedad; horizonte 3; sin rotación declarada ni observaciones satelitales agregadas.

Salida completa: `docs/OPTIMIZADOR_EJEMPLO.json`. Generadas 109; evaluadas 109; viables 109; motor conserva detalle de las mejores 8 y la interfaz muestra las mejores 3. Completitud 0.9 (MAGyP sin puntuar).

| Orden | Secuencia del catálogo | S(r) |
|---|---|---|
| 1 | Maíz → Girasol → Trigo + soja2 | 0.8295253292989467 |
| 2 | Trigo + soja2 → Girasol → Maíz | 0.8295253292989467 |
| 3 | Maíz → Trigo + soja2 → Girasol | 0.8276734774470949 |

El desempate usa el ID de secuencia de manera determinista. Estos valores son indicadores del modelo existente, no predicciones de rendimiento. La etiqueta de doble cultivo conserva una limitación heredada descrita abajo.

## Fuentes efectivas

| Fuente | Uso real | Ausencia o falta de vigencia |
|---|---|---|
| NASA POWER diaria | Climatología térmica, precipitación y ETo FAO-56 | Criterios climáticos/hídricos sin puntuar; advertencia y completitud menor |
| MAGyP estático | Estabilidad regional (CV, series con al menos 8 campañas); descripción regional | Estabilidad `null`; no bloquea generación |
| SAOCOM humedad volumétrica | Almacenamiento inicial 0–50 cm solo con fecha, unidad, calidad, CC/PMP y compatibilidad temporal válidas | No participa; se documenta supuesto del modelo |
| IMERG / CONAE | Percentil API y variabilidad diaria reciente con suficientes muestras | Diagnóstico ausente; nunca se suma la precipitación a POWER |
| Sentinel-2 | Cambio de NDVI observado con serie suficiente | Imagen disponible no implica indicador; no altera puntaje de rotaciones futuras |
| Sentinel-1 / MODIS y otras misiones | Contexto y visualización; no criterios adicionales de rotación | Sin efectos inventados sobre humedad, carbono o rendimiento |

`loading` se describe como consulta pendiente y se reevalúa al completar; `no_data`, `stale`, fechas futuras y unidades/calidad inválidas no se usan como observaciones actuales. Fuentes, resolución, fechas y enlaces permanecen en la sección expandible.

## Validación

- `npm test`: 86/86 pruebas aprobadas, incluidas siete nuevas pruebas que cubren los casos exigidos y renderizado real de los componentes desde el adaptador.
- `npm run lint`: aprobado. Este script ejecuta `tsc --noEmit`; el repositorio no tiene un linter adicional configurado.
- `npm run build`: aprobado. Permanece el aviso de bundle mayor a 500 kB.
- `npm run smoke:optimizer`: aprobado y salida versionada.
- Suite Playwright ampliada: conserva las comprobaciones de mapa, satélites, registro, exportación y cambio de lote; añade flujo del optimizador sin historial/MAGyP y persistencia tras recarga. En el entorno local Chromium no pudo iniciarse (`socket() failed: Operation not permitted`); el navegador compartido no accedió a localhost. Se incorporó GitHub Actions para correr la suite completa en un runner estándar. Su resultado debe consultarse en la ejecución del commit; no se considera una validación de navegador aprobada por haber compilado.
- No se ha confirmado aquí la disponibilidad en vivo de NASA/CONAE/MAGyP; las pruebas reproducibles usan fixtures identificados, con proveedores simulados en navegador.

## Límites pendientes

- No hay parametrización de ventanas para sur/Cuyo. Es un bloqueo real para recomendar allí; requiere fuentes agronómicas regionales y validación, no un fallback arbitrario.
- El motor v1.1.0 calcula el balance de trigo + soja2 con el cultivo primario, no la demanda conjunta; la interfaz lo advierte. No interpretar su posición en el ranking como ventaja hídrica demostrada del doble cultivo.
- Balance mensual simplificado, propiedades por textura, humedad profunda al 50% y parámetros del catálogo son supuestos. No existe calibración experimental por lote ni modelo de carbono/beneficio económico validado.
- El calendario es nominal por campaña y el generador usa el comienzo de la primera ventana documentada; no optimiza todas las fechas de siembra ni representa labores ya realizadas.
- Una falla inesperada de cálculo queda registrada, y una falla de integración no se presenta como resultado científico. Reintentar tras recuperar datos vuelve a consultar POWER porque las fallas ya no quedan cacheadas permanentemente.
