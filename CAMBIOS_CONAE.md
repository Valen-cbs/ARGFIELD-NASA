# Cambios para la entrega

## 1. Modo simple (nuevo, es la pantalla de inicio)

Pensado para el productor: letra grande, botones grandes, semáforos con palabra y una sola sugerencia por semana. Usa **solo datos reales**:

| Dato | Fuente | Cómo se muestra |
| --- | --- | --- |
| Humedad del suelo (zona de raíces ~1 m y superficie) | NASA POWER, parámetros `GWETROOT` y `GWETTOP` (comunidad AG) | % y comparación con el mismo mes de los años desde 2005 (seco / normal / húmedo) |
| Lluvia de los últimos 7 y 30 días y lo normal | NASA POWER, `PRECTOTCORR` diario y mensual | mm y comparación con lo normal |
| Pronóstico 7 días, helada, viento para pulverizar | Open-Meteo | semáforos y lista de días |
| Capas satelitales | CONAE (WMS) | pestaña Mapa |

Pantallas: **Inicio** (sugerencia de la semana + 4 semáforos + avisos), **Agua** (humedad, lluvia, pronóstico), **Qué sembrar** (3 rotaciones ordenadas según la prioridad elegida y el agua del suelo) y **Mapa** (capas de CONAE).

Arriba a la derecha está el botón **Modo técnico**, que abre la vista completa anterior. Desde ahí, el botón **Modo simple** vuelve.

Las reglas están en `src/services/simpleAdvisor.ts`. Los umbrales son orientativos: hay que validarlos con un agrónomo.

## 2. Capas reales de CONAE en el Mapa

Panel "Capas CONAE": estatus hídrico, humedad SAOCOM 0–50 cm, humedad vs. lo normal, SMAP, lluvia diaria, áreas inundadas y focos de calor (VIIRS y GOES). Tiene selector de día (1 a 7), transparencia, referencias y el botón **Probar valor en mi lote**.

Nombres de capas tomados de https://catalogos.conae.gov.ar/catalogo/catalogoGeoServiciosOGC.html

## 3. Servidor intermedio (proxy)

NASA POWER y CONAE pueden no permitir pedidos directos desde el navegador (CORS). La app intenta directo y, si falla, usa rutas `/proxy/...` del mismo sitio. Ya están configuradas para:

- **En la compu:** `npm run dev` (en `vite.config.ts`).
- **Vercel:** `vercel.json`.
- **Netlify:** `netlify.toml`.

En otro hosting sin proxy, el pronóstico (Open-Meteo) y el mapa funcionan igual; la humedad de NASA puede no cargar y la app lo avisa.

## 4. Modo técnico

Los números de las tarjetas, alertas, clima y optimizador del modo técnico **siguen siendo simulados** (`src/services/dataLoader.ts`). Por eso llevan la etiqueta "Demo" y un aviso arriba.

## Cómo correrlo

```
npm install
npm run dev
```

Se arregló el conflicto de dependencias: ya no hace falta `--legacy-peer-deps`.

## Para verificar con internet

1. Inicio en modo simple: que aparezcan los semáforos con datos (la primera carga puede tardar unos segundos).
2. Si dice "Sin dato" en Agua, abrir la consola del navegador (F12) y buscar el aviso `[ARGFIELD] Datos reales con errores`.
3. Mapa: probar cada capa y qué día (1 o 7) es el más reciente.
4. Probar "Probar valor en mi lote".
