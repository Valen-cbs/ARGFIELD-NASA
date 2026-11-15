import { expect, Page, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { CONAE_LAYERS, resolveLayerName } from '../../src/data/conaeLayers';
import { SATELLITE_PRODUCTS } from '../../src/data/satelliteProducts';

const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64');
const today = new Date().toISOString().slice(0, 10);
const dateFor = (id: string) => id === 'smap' ? '2023-11-21' : today;

async function mockProviders(page: Page, options: { missingSoil?: boolean; dry?: boolean; tab?: string; delayedSlot?: boolean; delayedFarm?: boolean; delayedStac?: boolean; outsideSoil?: boolean; cloudy?: boolean } = {}) {
  await page.addInitScript(({ tab }) => {
    localStorage.clear();
    localStorage.setItem('field_shift_landing_seen', 'true');
    localStorage.setItem('field_shift_active_tab', tab);
    localStorage.setItem('field_shift_farm_profile', JSON.stringify({
      location: { name: 'Lote de prueba', lat: -35, lng: -60, province: 'Buenos Aires', region: 'centro', basinId: 'salado_bonaerense', basinName: 'Cuenca de prueba', mainRiver: 'Río de prueba' },
      fieldSizeHectares: 120, currentCrop: 'soybean', soilType: 'mollisol_deep', irrigation: 'dryland', priority: 'conserve_moisture'
    }));
  }, { tab: options.tab ?? 'home' });

  let proxyRequests = 0;
  // All provider responses are synthetic fixtures. No farm coordinates leave localhost.
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') { await route.abort(); return; }
    if (!url.pathname.startsWith('/proxy/')) { await route.continue(); return; }
    proxyRequests++;
    const request = url.searchParams.get('REQUEST')?.toLowerCase();
    if (request === 'getcapabilities') {
      const layers = CONAE_LAYERS.flatMap(layer => Array.from({ length: layer.days ? layer.seriesLength ?? 7 : 1 }, (_, index) => {
        const name = resolveLayerName(layer, index + 1).split(':').at(-1);
        return layer.id === 'lluvia_imerg_mensual'
          ? `<Layer queryable="1"><Name>${name}</Name><Title>PA mensual GPM-IMERG 2026-10</Title><Abstract>Precipitación de 2026-10-01 a 2026-10-31.</Abstract></Layer>`
          : `<Layer queryable="1"><Name>${name}</Name><Title>Producto ${dateFor(layer.id)}</Title>${options.outsideSoil && layer.id === 'saocom_humedad' ? '<EX_GeographicBoundingBox><westBoundLongitude>-65</westBoundLongitude><eastBoundLongitude>-61</eastBoundLongitude><southBoundLatitude>-39</southBoundLatitude><northBoundLatitude>-30</northBoundLatitude></EX_GeographicBoundingBox>' : ''}</Layer>`;
      })).join('');
      await route.fulfill({ contentType: 'text/xml', body: `<WMS_Capabilities><Capability><Layer>${layers}</Layer></Capability></WMS_Capabilities>` }); return;
    }
    if (request === 'getfeatureinfo') {
      const name = url.searchParams.get('QUERY_LAYERS') ?? '';
      if (options.delayedSlot && name.endsWith('DSS_MSM_1')) await new Promise(resolve => setTimeout(resolve, 700));
      const secondFarm = Number((url.searchParams.get('BBOX') ?? '').split(',')[1]) < -35.5;
      if (options.delayedFarm && !secondFarm && name.includes('DSS_MSM')) await new Promise(resolve => setTimeout(resolve, 1000));
      let value = name.includes('DSS_PSM') ? options.dry ? 10 : 50 : name.includes('SMAP') || name.includes('SMOS') ? 0.21 : name.includes('PA1D') ? 0 : name.includes('PA1M') ? 48 : name.includes('FIM') ? 15 : name.endsWith('DSS_MSM_2') ? 32 : 24.5;
      if (options.delayedFarm && secondFarm && name.includes('DSS_MSM')) value = 36;
      const field = name.includes('DSS_PSM') ? 'PERCENTIL_HUMEDAD_DE_SUELO' : /DSS_MSM|SMAP|SMOS/.test(name) ? 'HUMEDAD_DE_SUELO' : name.includes('PA1D') ? 'PA1D' : name.includes('PA1M') ? 'PA1M' : name.includes('FIM') ? 'INCIDENCIA_FUSARIOSIS_TRIGO' : 'GRAY_INDEX';
      await route.fulfill({ json: { features: options.missingSoil && name.includes('DSS_MSM') ? [] : [{ properties: { [field]: value } }] } }); return;
    }
    if (url.pathname.endsWith('/search')) {
      if (options.delayedStac) await new Promise(resolve => setTimeout(resolve, 1200));
      const collection = url.searchParams.get('collections');
      const product = SATELLITE_PRODUCTS.find(p => p.kind === 'stac' && p.collection === collection);
      const assets = product?.kind === 'stac' ? Object.fromEntries(product.assets.map(a => [a, {}])) : {};
      await route.fulfill({ json: { features: [{ id: `test_${collection}`, properties: { datetime: `${today}T00:00:00Z`, 's2:processing_baseline': '05.00' }, assets, bbox: [-61, -36, -59, -34] }] } }); return;
    }
    if (url.pathname.includes('/item/point/')) {
      const collection = url.searchParams.get('collection');
      const names = collection === 'sentinel-2-l2a' ? ['B04', 'B08', 'SCL'] : collection === 'sentinel-1-rtc' ? ['vv'] : ['LST_Day_1km', 'QC_Day'];
      await route.fulfill({ json: { band_names: names.map(n => `${n}_b1`), values: names.length === 3 ? [2000, 5000, options.cloudy ? 9 : 4] : names.length === 1 ? [0.1] : [15000, 0] } }); return;
    }
    await route.fulfill({ contentType: 'image/png', body: transparentPng });
  });
  return { requestCount: () => proxyRequests };
}

test('home shows provider readings, actual historical dates and decoded Sentinel/MODIS values', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mockProviders(page);
  await page.goto('/');
  await expect(page.getByTestId('reading-saocom_humedad')).toContainText('24,5');
  await expect(page.getByTestId('reading-smap')).toContainText('Dato antiguo');
  await expect(page.getByTestId('reading-smap')).toContainText('2023');
  await expect(page.getByTestId('reading-sentinel2_ndvi')).toContainText('0,6');
  await expect(page.getByTestId('reading-modis_lst')).toContainText('26,85');
  await expect(page.getByTestId('reading-lluvia_imerg')).toContainText('0');
  await expect(page.getByTestId('reading-saocom_percentil')).toContainText('50');
  await expect(page.getByTestId('reading-fusarium')).toContainText('15');
  await expect(page.getByTestId('reading-lluvia_imerg_mensual')).toContainText('48');
  await expect(page.getByTestId('reading-lluvia_imerg_mensual')).toContainText(/31.*oct.*2026/);
  expect(errors).toEqual([]);
});

test('missing point data stays missing even when transparent map images load successfully', async ({ page }) => {
  await mockProviders(page, { missingSoil: true, tab: 'mapa' });
  await page.goto('/');
  const panel = page.getByRole('region', { name: 'Capas satelitales' });
  await expect(panel.getByTestId('reading-saocom_humedad')).toContainText('Sin dato en el punto');
  await expect(panel).toContainText('Imágenes recibidas; cobertura sin confirmar');
  await expect(panel).not.toContainText('Capa cargada');
  await panel.getByRole('button', { name: 'Vigor vegetal · Sentinel-2', exact: true }).click();
  await expect(panel.getByTestId('reading-sentinel2_ndvi')).toContainText('0,6');
  await expect(panel).toContainText('Mapa: escena en color natural');
});

test('switching series cancels an old response and preserves the selected product value', async ({ page }) => {
  await mockProviders(page, { delayedSlot: true, tab: 'mapa' });
  await page.goto('/');
  const panel = page.getByRole('region', { name: 'Capas satelitales' });
  await panel.getByRole('button', { name: '2', exact: true }).click();
  await expect(panel.getByTestId('reading-saocom_humedad')).toContainText('32');
  await expect(panel.getByTestId('reading-saocom_humedad')).not.toContainText('24,5');
  await page.waitForTimeout(900);
  await expect(panel.getByTestId('reading-saocom_humedad')).toContainText('32');
});

test('offline shows saved readings explicitly and stops provider requests', async ({ page }) => {
  const mock = await mockProviders(page, { dry: true });
  await page.goto('/');
  await expect(page.getByTestId('reading-modis_lst')).toContainText('26,85');
  await expect(page.getByTestId('reading-saocom_percentil')).toContainText('Dato vigente');
  await page.locator('#sidebar-offline-icon-btn').click();
  await expect(page.getByTestId('reading-saocom_percentil')).toContainText('guardado');
  const count = mock.requestCount();
  await page.waitForTimeout(250);
  expect(mock.requestCount()).toBe(count);
  await page.locator('#nav-item-alertas').click();
  await expect(page.getByText('No se registran alertas bajo este filtro')).toBeVisible();
  await expect(page.getByText(/Los productos sin cobertura, antiguos o sin fecha/)).toBeVisible();
});

test('sources show country flags, agency logos and retain Amazonia-1 without CBERS-4A', async ({ page }) => {
  await mockProviders(page, { tab: 'fuentes' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Fuentes satelitales' })).toBeVisible();
  await expect(page.getByText('Amazonia-1', { exact: true })).toBeVisible();
  await expect(page.getByText('CBERS-4A', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'NASA' }).locator('img')).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'País' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Agencia/s' })).toBeVisible();
});

test('farm registration saves location and crop allocations across reloads', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('argfield-registry-test-started')) {
      localStorage.clear();
      localStorage.setItem('field_shift_landing_seen', 'true');
      localStorage.setItem('field_shift_active_tab', 'home');
      localStorage.setItem('field_shift_is_offline', 'true');
      localStorage.setItem('field_shift_farm_profile', JSON.stringify({
        location: { name: 'Estancia anterior', lat: -35, lng: -60, province: 'Buenos Aires', region: 'centro', basinId: 'salado_bonaerense', basinName: 'Cuenca de prueba', mainRiver: 'Río de prueba' },
        fieldSizeHectares: 100, currentCrop: 'soybean', soilType: 'mollisol_deep', irrigation: 'dryland', priority: 'conserve_moisture'
      }));
      sessionStorage.setItem('argfield-registry-test-started', 'true');
    }
  });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return route.continue();
    if (url.hostname === 'nominatim.openstreetmap.org') return route.fulfill({ json: [{ name: 'Pergamino', lat: '-33.8940', lon: '-60.5730', display_name: 'Pergamino, Buenos Aires, Argentina', address: { state: 'Buenos Aires' } }] });
    return route.abort();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Gestionar estancias' }).click();
  await page.getByRole('button', { name: /Nueva estancia/ }).click();
  await page.getByLabel('Productor (opcional)').fill('Carlitos');
  await page.getByLabel('Nombre de la estancia').fill('La Esperanza');
  await page.getByLabel('Ubicación · OpenStreetMap').fill('Pergamino');
  await page.getByRole('button', { name: 'Pergamino · Buenos Aires' }).click();
  await page.getByLabel('Superficie total').fill('100');
  await page.locator('section').filter({ hasText: 'Cultivos actuales' }).getByRole('checkbox', { name: /Soja 1ra/ }).check();
  await page.getByLabel('Superficie Soja 1ra').fill('70');
  await page.getByRole('button', { name: 'Guardar estancia' }).click();
  await expect(page.getByRole('heading', { name: 'La Esperanza', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'La Esperanza', exact: true })).toBeVisible();
  await expect(page.getByText('Soja 1ra · 70 ha')).toBeVisible();
});

test('offline retains completed readings while another provider is still pending', async ({ page }) => {
  await mockProviders(page, { delayedStac: true });
  await page.goto('/');
  await expect(page.getByTestId('reading-saocom_humedad')).toContainText('24,5');
  await expect(page.getByTestId('reading-sentinel2_ndvi')).toContainText('Consultando');
  await page.locator('#sidebar-offline-icon-btn').click();
  await expect(page.getByTestId('reading-saocom_humedad')).toContainText('guardado');
  await expect(page.getByTestId('reading-saocom_humedad')).toContainText('24,5');
  await expect(page.getByTestId('reading-sentinel2_ndvi')).toContainText('Sin dato guardado');
});

test('mobile exposes the new layers without overflowing the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockProviders(page, { tab: 'mapa' });
  await page.goto('/');
  await page.locator('#map-conae-layers-btn-mob').click();
  const panel = page.getByRole('region', { name: 'Capas satelitales' });
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: 'Radar · Sentinel-1', exact: true }).click();
  await expect(panel.getByTestId('reading-sentinel1_radar')).toContainText('-10');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('changing farms cannot reuse the previous farm response', async ({ page }) => {
  await mockProviders(page, { delayedFarm: true });
  await page.goto('/');
  await page.locator('#home-edit-location-btn').click();
  await page.getByRole('button', { name: 'Ingreso manual de coordenadas', exact: true }).click();
  await page.getByPlaceholder('-34.6037', { exact: true }).fill('-36');
  await page.getByPlaceholder('-58.3816', { exact: true }).fill('-60');
  await page.getByRole('button', { name: 'Guardar Cambios', exact: true }).click();
  await expect(page.getByTestId('reading-saocom_humedad')).toContainText('36');
  await page.waitForTimeout(1200);
  await expect(page.getByTestId('reading-saocom_humedad')).toContainText('36');
  await expect(page.getByTestId('reading-saocom_humedad')).not.toContainText('24,5');
});

test('JSON export preserves dates, coverage states and the demo status of rotation estimates', async ({ page }) => {
  await mockProviders(page, { missingSoil: true });
  await page.goto('/');
  await expect(page.getByTestId('reading-smap')).toContainText('Dato antiguo');
  await page.locator('#home-export-report-btn').click();
  const downloaded = page.waitForEvent('download');
  await page.locator('#export-json-btn').click();
  const download = await downloaded;
  const report = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(report.rotationStrategiesMode).toBe('demo');
  expect(report.satelliteReadings.find((r: any) => r.productId === 'smap').observedAt).toBe('2023-11-21');
  expect(report.satelliteReadings.find((r: any) => r.productId === 'saocom_humedad').status).toBe('no_data');
  expect(report.satelliteReadings.find((r: any) => r.productId === 'saocom_humedad').value).toBeNull();
  expect(report.satelliteReadings.every((r: any) => r.sourceUrl)).toBe(true);
});

test('coverage and quality failures are explained and the field point can be edited', async ({ page }) => {
  await mockProviders(page, { outsideSoil: true, cloudy: true });
  await page.goto('/');
  await expect(page.getByTestId('reading-saocom_humedad')).toContainText('Fuera de cobertura publicada');
  await expect(page.getByTestId('reading-sentinel2_ndvi')).toContainText('Sin píxel válido por calidad');
  await expect(page.getByTestId('reading-sentinel2_ndvi')).toContainText('Escenas revisadas en este punto: 1');
  await page.getByRole('button', { name: 'Ubicar el punto de mi lote', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Guardar Cambios', exact: true })).toBeVisible();
});
