import { expect, test } from '@playwright/test';

test('farm setup wizard preserves data between steps and confirms the farm', async ({ page }) => {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname.startsWith('/proxy/')) {
      await route.abort();
      return;
    }
    await route.continue();
  });
  await page.addInitScript(() => localStorage.clear());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).resolves.toBe(true);

  await expect(page.getByRole('heading', { name: '¿Dónde está tu campo?' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Buscá una localidad');

  await page.getByLabel('Dirección o Localidad').fill('Pergamino');
  await page.getByText('Pergamino', { exact: true }).last().click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Contanos sobre el establecimiento' })).toBeVisible();
  await page.getByRole('spinbutton', { name: 'Superficie total' }).fill('100');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();

  await expect(page.getByRole('heading', { name: '¿Qué estás cultivando?' })).toBeVisible();
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).resolves.toBe(true);
  await page.getByRole('button', { name: 'Ajo', exact: true }).first().click();
  await page.getByRole('spinbutton', { name: 'Superficie Ajo' }).fill('80');
  await expect(page.getByText('20.00 ha', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Anterior', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Superficie total' })).toHaveValue('100');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Superficie Ajo' })).toHaveValue('80');

  await page.getByRole('button', { name: 'Ingresar al sistema', exact: true }).click();
  await expect(page.locator('#landing-confirm-enter-btn')).toHaveCount(0);
  const savedProfile = await page.evaluate(() => JSON.parse(localStorage.getItem('field_shift_farm_profile') ?? 'null'));
  expect(savedProfile.fieldSizeHectares).toBe(100);
  expect(savedProfile.cropAllocations).toEqual([{ crop: 'Ajo', hectares: 80 }]);
  expect(savedProfile.location.name).toBe('Mi establecimiento');
});
