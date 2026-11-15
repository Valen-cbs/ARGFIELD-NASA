import { readFile, writeFile } from 'node:fs/promises';

export async function renderAudit() {
  const report = JSON.parse(await readFile('docs/AUDITORIA_SATELITAL.json', 'utf8'));
  const rows = report.results as Array<{ city: { name: string }; readings: Array<{ productId: string; value: number | null; status: string; observedAt: string | null; missingReason?: string }> }>;
  const value = (city: typeof rows[number], id: string) => {
    const r = city.readings.find(r => r.productId === id)!;
    return r.value === null ? 'Sin dato' : `${r.value}${r.status === 'stale' ? ` (antiguo, ${r.observedAt?.slice(0, 10)})` : ''}`;
  };
  const lines = [
    '# Auditoría regional de datos satelitales', '',
    `Consulta real registrada: ${report.auditedAt} (UTC). Nueve centros urbanos públicos, diez productos por punto: 90 lecturas. No son promedios de ciudades ni de establecimientos.`, '',
    '## Resultados', '',
    '| Punto público | SAOCOM (% vol.) | GPM diario (mm) | NDVI | MODIS (°C superficie) | Productos vigentes / 10 |',
    '| --- | ---: | ---: | ---: | --- | ---: |',
    ...rows.map(c => `| ${c.city.name} | ${value(c, 'saocom_humedad')} | ${value(c, 'lluvia_imerg')} | ${value(c, 'sentinel2_ndvi')} | ${value(c, 'modis_lst')} | ${c.readings.filter(r => r.status === 'available').length} |`), '',
    '## Disponibilidad por producto', '',
    '| Producto | Vigentes | Antiguos | Sin dato | Errores |', '| --- | ---: | ---: | ---: | ---: |',
    ...rows[0].readings.map(p => {
      const readings = rows.map(c => c.readings.find(r => r.productId === p.productId)!);
      const count = (status: string) => readings.filter(r => r.status === status).length;
      return `| ${p.productId} | ${count('available')} | ${count('stale')} | ${count('no_data')} | ${count('error')} |`;
    }), '',
    '## Interpretación y correcciones', '',
    '- GPM diario y mensual respondieron en las nueve ubicaciones. Los ceros de lluvia son valores publicados, no rellenos.',
    '- SAOCOM y fusariosis son productos modelados con máscaras propias. Una ciudad dentro de la región general puede tener NoData; no se infiere cobertura efectiva a partir del nombre de la provincia.',
    '- SMAP y SMOS publicados por CONAE siguen ofreciendo fechas antiguas o valores nulos. No se presentan como mediciones actuales ni se sustituyen por otro satélite sin avisar.',
    '- El radar Sentinel-1 en el punto de Rosario devolvió -32768 (NoData). Ese valor se rechaza antes de calcular dB.',
    '- Se amplió la búsqueda STAC a 24 resultados del último período de 90 días y hasta 12 consultas de píxel, con prioridad cronológica y hasta dos escenas por fecha antes de revisar solapamientos adicionales. Esto permite revisar fechas diferentes sin omitir el compuesto Terra/Aqua alternativo de un mismo período.',
    '- La búsqueda recuperó NDVI del 30 de octubre para Río Gallegos y temperaturas MODIS históricas para Salta y Mendoza. La fecha real y la etiqueta de antigüedad se mantienen; no se inventa una temperatura actual.',
    '- La interfaz distingue estar fuera de la extensión publicada, respuesta NoData, píxel rechazado por calidad, falta de escenas y consulta incompleta. Ofrece ubicar el punto dentro del lote, sin moverlo automáticamente a un lugar con datos.', '',
    '## Reproducir y revisar', '',
    '`npm run audit:satellites` consulta nuevamente estos puntos públicos y actualiza este informe. Requiere Internet; no lee perfiles del usuario. Las respuestas cambian cuando los proveedores actualizan los productos.', '',
    'El archivo [AUDITORIA_SATELITAL.json](AUDITORIA_SATELITAL.json) conserva fechas, valores, escena, fuente, estado y motivos individuales. [AUDITORIA_SATELITAL_ANTES.json](AUDITORIA_SATELITAL_ANTES.json) registra la primera ronda, previa a la ampliación de búsqueda. Estos archivos son evidencia del diagnóstico y no se usan como datos de producción.', '',
    'Referencias: [catálogo oficial de CONAE](https://catalogos.conae.gov.ar/catalogo/catalogoGeoServiciosOGC.html), [API de Planetary Computer](https://planetarycomputer.microsoft.com/api/data/v1/openapi.json).', ''
  ];
  await writeFile('docs/AUDITORIA_SATELITAL.md', lines.join('\n'));
}
