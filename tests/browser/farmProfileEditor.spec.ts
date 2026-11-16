import { expect, test } from '@playwright/test';

test('farm editor reuses the landing setup and saves the edited farm', async ({ page }) => {
  const profile = {
    location: { name: 'Campo de prueba', lat: -34, lng: -60, province: 'Buenos Aires', region: 'centro' },
    producerName: 'Productor de prueba',
    fieldSizeHectares: 100,
    currentCrop: 'garlic',
    cropAllocations: [{ crop: 'Ajo', hectares: 60 }],
    soilType: 'mollisol_deep',
    irrigation: 'dryland',
    irrigationAvailable: false,
    priority: 'maximize_margin'
  };
  await page.addInitScript(({ profile }) => {
    localStorage.clear();
    localStorage.setItem('argfield_registered_farms', JSON.stringify([{ id: 'farm-test', profile }]));
    localStorage.setItem('argfield_active_farm', 'farm-test');
  }, { profile });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
      await route.abort();
      return;
    }
    await route.continue();
  });
  await page.goto('/');

  await page.locator('#sidebar-edit-farm-icon-btn').click();
  const dialog = page.getByRole('dialog', { name: 'Editar estancia' });
  await expect(dialog.getByRole('heading', { name: '¿Dónde está tu campo?' })).toBeVisible();
  await expect(dialog.getByLabel('Dirección o Localidad')).toHaveValue('Campo de prueba');

  await dialog.getByRole('button', { name: 'Continuar', exact: true }).click();
  const totalArea = dialog.getByRole('spinbutton', { name: 'Superficie total' });
  await expect(totalArea).toHaveValue('100');
  await totalArea.fill('120');
  await dialog.getByRole('button', { name: 'Continuar', exact: true }).click();

  const garlicArea = dialog.getByRole('spinbutton', { name: 'Superficie Ajo' });
  await expect(garlicArea).toHaveValue('60');
  await garlicArea.fill('80');
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(dialog).toHaveCount(0);

  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('field_shift_farm_profile') ?? 'null');
    return saved?.fieldSizeHectares;
  })).toBe(120);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('field_shift_farm_profile') ?? 'null'));
  expect(saved.cropAllocations).toEqual([{ crop: 'Ajo', hectares: 80 }]);
  expect(saved.priority).toBe('maximize_margin');
});
