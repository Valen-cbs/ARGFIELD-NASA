import { expect, test } from '@playwright/test';
import { MAGYP_CROPS } from '../../src/data/magypCrops';

for (const crops of [['Ajo'], ['Yerba mate', 'Caña de azúcar'], [...MAGYP_CROPS]]) {
  test(`crop management covers ${crops.length} registered crops including ${crops[0]}`, async ({ page }) => {
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname.startsWith('/proxy/')) {
        await route.abort();
        return;
      }
      await route.continue();
    });
    await page.addInitScript(crops => {
      localStorage.clear();
      localStorage.setItem('field_shift_landing_seen', 'true');
      localStorage.setItem('field_shift_active_tab', 'optimizador');
      localStorage.setItem('field_shift_farm_profile', JSON.stringify({
        location: { name: 'Cobertura de cultivos', lat: -26.786, lng: -60.443, province: 'Chaco', region: 'norte' },
        fieldSizeHectares: crops.length * 10, currentCrop: 'soybean', soilType: 'sandy_loam', irrigation: 'dryland', priority: 'conserve_moisture',
        cropAllocations: crops.map(crop => ({ crop, hectares: 10 }))
      }));
    }, crops);
    await page.goto('/');
    await page.getByRole('button', { name: 'Optimizador', exact: true }).click();
    const recommendations = page.getByRole('region', { name: 'Recomendaciones por cultivo' });
    await expect(recommendations.locator('article')).toHaveCount(crops.length);
    for (const crop of crops) {
      const card = recommendations.locator('article').filter({ has: page.getByRole('heading', { name: crop, exact: true }) });
      await expect(card).toHaveCount(1);
      await expect(card.locator('ol li')).toHaveCount(4);
    }
    if (crops.length < 3) {
      await expect(page.getByRole('heading', { name: 'Optimizá tus cultivos' })).toBeVisible();
      await page.getByRole('button', { name: 'Detalles del motor', exact: true }).click();
      await expect(page.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
      await expect(page.getByRole('dialog')).toContainText('Detalles del motor');
      await expect(page.getByRole('dialog')).toContainText('Respuesta completa del motor · JSON');
      await expect(page.getByRole('dialog').getByRole('region', { name: 'Recomendaciones por cultivo' }).locator('article')).toHaveCount(crops.length);
    }
  });
}
