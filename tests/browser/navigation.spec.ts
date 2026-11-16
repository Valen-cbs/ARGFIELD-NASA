import { expect, test } from '@playwright/test';

test('sidebar follows the requested order and keeps alerts disabled', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('field_shift_active_tab', 'alertas');
    localStorage.setItem('field_shift_farm_profile', JSON.stringify({
      location: { name: 'Campo de prueba', lat: -34, lng: -60, province: 'Buenos Aires', region: 'centro' },
      fieldSizeHectares: 100,
      currentCrop: 'soybean',
      soilType: 'mollisol_deep',
      irrigation: 'dryland',
      priority: 'conserve_moisture'
    }));
  });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
      await route.abort();
      return;
    }
    await route.continue();
  });
  await page.goto('/');

  const navigation = page.locator('aside[aria-label="Menú Institucional"] nav');
  const itemIds = await navigation.locator('button').evaluateAll(buttons => buttons.map(button => button.id));
  expect(itemIds).toEqual([
    'nav-item-home',
    'nav-item-optimizador',
    'nav-item-clima',
    'nav-item-mapa',
    'nav-item-fuentes',
    'nav-item-alertas'
  ]);
  await expect(navigation.getByRole('button', { name: /Alertas.*Próximamente/ })).toBeDisabled();
  await expect(page.getByRole('heading', { name: 'Inicio', exact: true })).toBeVisible();
});
