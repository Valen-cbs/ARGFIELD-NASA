# Revisión de argfield-para-mariano.zip frente al main actual

Fecha: 15/11/2026. Base examinada: `310a0fac01646a7cabea1b7c1477590815485718` (`feat: integrate quantitative rotation engine and satellite observations`), posterior a `1966d6c` (registro/despliegue) y a la auditoría `97d6b27`.

Archivo recibido: 20 archivos, 246.995 bytes descomprimidos. SHA-256 del ZIP: `62d95ef3d421e4296ea38ead0cf5e18550857f29301de2ee928f8bbcb916cddc`. No contiene un historial Git ni un commit base, por lo que sus fechas internas no demuestran que derive del main más reciente. La revisión se hizo por contenido, dependencias, comportamiento y pruebas, no por timestamps.

## Veredicto

**Sirve como propuesta de experiencia por cultivo y de resumen meteorológico. No está actualizado respecto del motor integrado y no puede aplicarse como un reemplazo completo.** Incorpora un motor alternativo con otros pesos, cinco criterios y supuestos de agua distintos. Sustituye App, tipos y pantallas que actualmente conectan el motor v1.1.0 de siete criterios, MAGyP, comparación declarada y validaciones de observaciones.

El informe de Astra aportado en la conversación coincide con `docs/CIERRE_INTEGRACION_MOTOR.md` de esta base. Se conserva esa arquitectura: fórmulas, pesos, datasets, validaciones SAOCOM/IMERG/NDVI, restricciones y comparación actual/alternativas. No se agregan servicios, dependencias, backend ni otro motor. Las 71 pruebas existentes de esa integración pasan antes y después de esta adaptación.

La auditoría integral anterior describe el commit `aa6dadc`, no el estado actual: ya no sería correcto afirmar que main solo contiene tres plantillas genéricas o que ninguna evidencia ambiental influye. Se conserva como diagnóstico histórico, con su versión explícita.

## Qué sucede al superponer el ZIP

Se creó una copia aislada del main (`git worktree`, fuera del directorio de implementación), se superpusieron los 20 archivos y se ejecutó TypeScript. **11 errores**: `FarmProfile` del ZIP elimina `currentRotation` y `maxMonthlyIrrigationMm`, usados por `FarmRegistryView`, `rotationEngineAdapter` y las pruebas de observaciones. También desaparecen del `npm test` del ZIP las suites `engine.test.ts` y `observations.test.ts`, y sus scripts auxiliares de engine/MAGyP. Eso permitiría omitir controles relevantes al sustituir package.json.

Los **10 tests propios** de `cropAdvisor.test.ts` sí pasan en la copia. Cubren su calendario, parser, avisos y motor alternativo con fixtures sintéticos. No prueban compatibilidad de aplicación con los cambios de Astra, calibración agronómica, disponibilidad de proveedores ni que se preserven sus resultados.

## Matriz de los 20 archivos

| Archivo del ZIP | Evaluación | Decisión aplicada |
| --- | --- | --- |
| `.gitignore` | Ajuste de herramientas, sin aporte funcional necesario. | Se mantiene el actual. |
| `package.json` | Reduce las suites a satélites + advisor y pierde scripts del motor vigente. | No se copia. Se suma nuestra suite de regresiones al comando actual. |
| `src/App.tsx` | Retira `useRotationEngine` y conecta otro generador/POWER. | Se conserva el adaptador actual; se comparte su estado con Inicio/exportación y se agrega pronóstico normalizado. |
| `DemoBadge.tsx` | Ajustes de texto; no resuelven por sí mismos la procedencia de resultados. | Se conserva; el aviso de exportación se corrige según los datos realmente exportados. |
| `ExportReportModal.tsx` | Mejora mensajes, pero exporta planes del generador alternativo sin el contrato completo del actual. | Se adapta la idea de claridad; nuevo constructor puro exporta baseline, scores nulos, pesos, exclusiones y proveniencia. |
| `FarmProfileView.tsx` | Reemplazo amplio con tarjetas y fechas; consume el otro motor. | Se conserva registro y estructura actual. Se elimina su secuencia fija por prioridad y se muestra el plan del motor común. |
| `RotationStrategies.tsx` | UI de cinco criterios; elimina `EngineComparison` y su línea de base declarada. | Se conserva la pantalla actual y su comparación de siete criterios. |
| `home/CropAdviceCard.tsx` | Idea útil: revisar por cultivo y declarar siembra. Depende del advisor, calendario y rotaciones alternativos. | No se activa; requiere contrato por lote y etapa observada/declarada antes de emitir consejos específicos. |
| `home/WeekOutlook.tsx` | Idea útil: semana legible. Mezcla ET0, suelo y ventanas de pulverización. | Se reimplementa con lluvia, ET0 de referencia y extremos disponibles; datos incompletos explícitos y ES/EN. |
| `data/cropCalendar.ts` | Calendarios para todos los nombres y valores Kc; ampliación grande, sin referencias por etapa/región/umbral. | Se mantiene fuera de producción hasta validación de parámetros y ajuste al catálogo piloto. |
| `data/rotationCrops.ts` | Nuevo catálogo con necesidades, zonas, valor productivo y penalizaciones propios. | No se duplica el catálogo agronómico vigente. |
| `services/climateContext.ts` | Segundo acceso POWER (tres años completos + actual), otra caché y agregación. | Se conserva `src/engine/climate.ts` con su historia y trazabilidad. |
| `services/cropAdvisor.ts` | Reglas por fase, pero confunde supuestos con condición del lote y valida insuficientemente las lecturas. | No se activa completo; se documentan casos para futura integración por etapas. |
| `services/fieldForecast.ts` | Buena separación del pronóstico; parser filtra fechas y luego usa índices anteriores. | Adaptado: fechas reales y ordenadas, alineación preservada, negativos/no finitos como faltantes, totales completos. |
| `services/rotationEngine.ts` | Segundo motor, cinco criterios, agua asumida y score productivo distinto de MAGyP. | No se incorpora. |
| `services/rotationOptimizer.ts` | Envuelve el motor alternativo y conserva un ranking legacy con constantes. | Se conserva el actual fallback; los planes principales siguen viniendo de `rotationEngineAdapter`. |
| `services/weatherAlerts.ts` | Extiende variables y devuelve forecast, pero conserva problemas de fechas y sumas parciales. | Se adapta incrementalmente: ET0 y forecast; continuidad, vigencia, independencia lluvia/calor, cancelación/timeout. |
| `types/index.ts` | Añade fecha/suelo/lote pero elimina contratos nuevos del main. | No se reemplazan tipos; se evita perder rotación y volumen de riego. |
| `tests/browser/crops.spec.ts` | Testea una UI y consejos que no existen en el main actual; fixtures, no proveedores reales. | No se copia como test de la app actual. Se actualiza la expectativa de modo del export existente. |
| `tests/cropAdvisor.test.ts` | Útil para entender intenciones; sus 10 tests no detectan las regresiones de integración. | Ejecutado en aislamiento. Se añaden 8 regresiones sobre la adaptación real. |

## Contradicciones técnicas y científicas

### Motor, datos y significado del puntaje

En `ZIP/services/rotationEngine.ts:23`, los pesos se definen para agua, clima, suelo, diversidad y producción. No corresponden a los siete criterios S(r) del main. El criterio productivo suma un atributo `crop.value` y lo divide por horizonte: **no es el rendimiento ni la estabilidad regional MAGyP**. Es otro modelo, no una mejora equivalente ni una nueva presentación de sus resultados.

En `:242`, `if (irrigated) supply = Math.max(supply, crop.waterNeed)` garantiza abastecimiento por tener riego disponible. El main exige volumen mensual declarado y no aporta agua si falta ese dato. El ZIP usa ajustes como -60/-30/+40 mm según una categoría de percentil y +60 por barbecho, sin conversión θ→agua útil con CC/PMP y profundidad. Tampoco conserva la condición SAOCOM de mes/año de la primera campaña.

Si falta clima, el motor alternativo asigna ratio hídrico 0.75 y clima 0.65 para producir puntajes. Esos valores no equivalen a un resultado con datos completos; el main conserva completitud, criterios ausentes y razones. Conservar un aviso genérico no hace comparables ambas metodologías.

El segundo hook POWER también cambia el período y variables respecto de `engine/climate.ts`; puede consultar datos adicionales y producir climatologías distintas dentro de la misma app. Incorporar las tarjetas del ZIP copiando App no permite conservar simultáneamente el comportamiento cuantitativo actual.

### Vigencia y representatividad de observaciones

Experimento ejecutado en el ZIP sin modificarlo: `deriveWaterSignal` recibió una lectura `saocom_percentil`, `status=available`, valor 10, fecha `2020-01-01`, `cached=true`; devolvió **`state=seco`**. `usable` solo comprueba estado, no-null y existencia de fecha. No revalida antigüedad, unidades, rango o punto. El main sí revalida la admisión en motor. No sería seguro reemplazar ese control por una bandera `available`.

El fallback de `estatus_hidrico` sirve como diagnóstico del índice de precipitación antecedente; no es una medición de humedad volumétrica. La etiqueta “Agua en el suelo” y las correcciones en mm del ZIP le asignan un significado más fuerte que el producto. MODIS, SMAP, SMOS y radar tampoco deben convertirse en suelo local o agua radicular fuera de sus límites.

### Calendario y tareas operativas

La fecha de siembra declarada es un dato útil; la etapa obtenida sumando días o siguiendo meses típicos es una **estimación**, no una observación fenológica. Un test que comprueba el día 45 de una tabla no valida duración real por variedad, temperatura y zona. El ZIP generaliza ciertos cereales, cítricos y variedades estadísticas a fichas compartidas: abarcar 41 nombres no demuestra 41 modelos agronómicos validados.

Los umbrales de helada/calor y tareas como fertilizar, secar una cobertura o intervenir en floración necesitan referencias y condiciones. El texto “consume el cultivo” para `Kc × ET0` es excesivo: FAO-56 describe ETc estándar, que debe ajustarse para condiciones no estándar/estrés. ET0 sola representa una superficie de referencia, **no la evaporación real del lote ni una dosis de riego**. Esta adaptación muestra esa distinción expresamente.

Las ventanas de pulverización se deducen de viento, humedad, temperatura y lluvia; no verifican inversión térmica, producto, etiqueta, deriva, receptores ni las condiciones del equipo. No se activan como autorización operativa. Además, un experimento con horas 06, 08, 10 y 12 devolvió “6 a 9 h”: el algoritmo cuenta índices como horas sin validar continuidad horaria.

### Parser y datos faltantes

Experimento del ZIP: fechas `['2026-11-15','invalid','2026-11-17']` y lluvia `[1,90,3]` produjeron lluvia **90 para el 17/11**. Filtrar fechas antes de leer los arrays desplaza las mediciones. El parser adaptado rechaza el calendario inválido, no desplaza valores.

Sumar tres días con 40 mm no permite informar “120 mm en siete días”. Tampoco tres fechas alternadas equivalen a tres días consecutivos de calor. La versión adaptada exige los siete días consecutivos para un total semanal, permite un episodio diario con datos parciales y evalúa calor/lluvia por separado. `null` nunca se convierte en cero.

## Cambios implementados

1. `fieldForecast.ts`: normalización diaria mínima de la idea del ZIP. Valida fechas, secuencia, finitud, no negatividad de lluvia/ET0 y períodos completos. Filtra pronósticos fuera de la fecha de referencia sin desplazar sus series.
2. `weatherAlerts.ts`: expone forecast además del resumen, solicita ET0 a Open-Meteo con unidades métricas por defecto, valida vigencia y continuidad, y cancela solicitudes con timeout. Deshabilitar consultas oculta el payload inmediatamente. Ya no suprime un aviso de lluvia porque falta temperatura ni viceversa.
3. `WeekOutlook.tsx`: resumen en Inicio con lluvia y ET0 de siete días y extremos disponibles. Indica días/fechas, falta de datos y que ET0 no es consumo del cultivo, humedad ni necesidad de riego. Reutiliza la solicitud del dashboard; no agrega otra llamada POWER ni servicio.
4. `FarmProfileView.tsx` y `App.tsx`: Inicio recibe el mismo estado del motor que Optimizador. Se retira el switch de secuencias fijas por prioridad. La prioridad sigue disparando evaluación a través del adaptador vigente.
5. `exportReport.ts` y modal: conserva el `EngineResult` completo, incluida baseline excluida/score null, datos usados, pesos, criterios, advertencias y exclusiones. Informa versión y estado, con modo `model` o `qualitative`, en lugar de declarar todo demo. Los planes legacy se conservan por compatibilidad; el objeto de evaluación es la fuente de los valores cuantitativos y sus nulos.
6. Documentación: corrección de dos descripciones antiguas de SMAP/SAOCOM en `motor-rotaciones.md` para coincidir con el código y el cierre de Astra. No se altera la auditoría histórica ni sus evidencias. README enlaza esta revisión.

## Verificación de esta sesión

| Comprobación | Resultado |
| --- | --- |
| Main antes de adaptar | 71/71 tests aprobados. |
| Superposición completa del ZIP sobre main aislado | TypeScript: 11 errores por campos eliminados. |
| Tests propios del ZIP | 10/10 aprobados; alcance limitado descrito arriba. |
| Tests después de adaptar | 79/79 aprobados: 71 existentes + 8 nuevos. |
| Nuevas regresiones | Fechas/orden inválido, alineación, null/ceros, parciales, continuidad, independencia de alertas, fechas antiguas/futuras, export con baseline null y proveniencia. |
| `npm run lint` | Correcto (`tsc --noEmit`). |
| `npm run build` | Correcto; JS principal 914.57 kB (gzip 281.33 kB), continúa advertencia de chunk >500 kB. |
| Render del resumen semanal | Render estático ES/EN y estado offline correctos; no sustituye revisión visual en navegador. |
| Navegador | Intento dirigido al export bloqueado antes de ejecutar interacciones: Chrome no está instalado en /opt/google/chrome/chrome. No se atribuye aprobación propia a la prueba de Astra. |

Suite ejecutada con `node --import tsx --test tests/satellite.test.ts tests/engine.test.ts tests/observations.test.ts tests/forecast.test.ts`, equivalente a los archivos declarados en npm test y evitando el socket IPC del launcher tsx restringido aquí. Los fixtures no se usan en producción. No se repitió la auditoría remota de nueve ciudades: este trabajo no modifica proveedores, capas, parsers satelitales ni series del motor. Los resultados vivos reportados por Astra siguen siendo una fotografía, no un compromiso de disponibilidad futura.

## Qué queda para una siguiente iteración

- Integrar fecha de siembra y fase **declarada o estimada** por asignación/lote, con migración de perfiles y fuente por parámetro; reutilizar catálogo y balance actuales. No conectar el motor alternativo para obtener esas tarjetas.
- Revisar los umbrales/calendarios del ZIP con referencias por cultivo y zona antes de activar tareas específicas. Priorizar cultivos piloto en lugar de completar faltantes con constantes.
- Completar la demanda conjunta de trigo + soja de segunda en el motor vigente; el límite sigue visible. Esta revisión no cambia esa fórmula ni la presenta como resuelta.
- Ejecutar el flujo de navegador en un entorno con Chrome habilitado: registro/persistencia → prioridad → comparación → resumen semanal → JSON. Esta sesión aporta verificación estática y de funciones, no observación visual del flujo.

## Referencias

- Base y cierre del compañero: [commit 310a0fa](https://github.com/Valen-cbs/ARGFIELD-NASA/commit/310a0fac01646a7cabea1b7c1477590815485718), `docs/CIERRE_INTEGRACION_MOTOR.md`, `src/engine/`, `rotationEngineAdapter.ts`, `tests/engine.test.ts` y `tests/observations.test.ts`.
- [FAO-56, capítulo 6](https://www.fao.org/4/x0490e/x0490e0b.htm): ETc bajo condiciones estándar; [capítulo 8](https://www.fao.org/4/x0490e/x0490e0e.htm): ajuste por estrés. Consulta de fuentes primarias, sin validación experimental de parámetros propios.
- [Open-Meteo, documentación](https://open-meteo.com/en/docs?past_days=1): ET0 de referencia de superficie bien abastecida de agua. Se usa el proveedor ya existente.

**Decisión final:** integrar las ideas complementarias con contratos y pruebas del main actual; descartar la superposición automática que cambia el modelo y elimina avances. La revisión separa fallas reproducidas, riesgos deducidos y funcionalidades pendientes.
