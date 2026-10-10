import { test, expect, type Page } from '@playwright/test';
async function start(page: Page, walk = false) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Rozpocznij' })).toBeVisible();
  if (walk) await page.getByLabel('Spacer bez potworów').check();
  await page.getByRole('button', { name: 'Rozpocznij' }).click();
  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#hud')).toHaveAttribute('data-position', '13,11');
  await page.waitForTimeout(500);
  for (let i = 0; i < 7; i++) { await page.keyboard.press('ArrowUp'); await page.waitForTimeout(220); }
  await page.getByRole('button', { name: /Przejdź/ }).click();
  await expect(page.locator('#hud')).toHaveAttribute('data-map', 'grove');
  await expect(page.locator('#hud')).toHaveAttribute('data-position', '13,11');
  await page.waitForTimeout(500);
}
async function selectRat(page: Page, offsetX: number, offsetY: number) {
  const viewport = page.viewportSize()!;
  const small = viewport.height <= 600;
  const top = small ? 60 : 76, bottom = small ? 104 : 168;
  const zoom = viewport.width >= 1000 && viewport.height >= 600 ? 2 : 1;
  // Player is centered by the camera. Use the creature's real rendered position.
  const x = viewport.width / 2 + offsetX * 32 * zoom;
  const y = top + (viewport.height - top - bottom) / 2 + (offsetY * 32 - 16) * zoom;
  await page.locator('canvas').click({ position: { x, y } });
  await expect(page.locator('#target-label')).toContainText('Szczur');
}
test('menu, assets, real combat loop and restart', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /ELDORIA/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('menu.png') });
  await start(page);
  await page.screenshot({ path: testInfo.outputPath('scene.png') });
  await selectRat(page, 1, -2);
  await page.getByRole('button', { name: /Iskra/ }).click();
  await expect(page.locator('#hp-label')).toContainText('42 MP');
  await page.waitForTimeout(1550);
  await page.getByRole('button', { name: /Iskra/ }).click();
  await expect(page.locator('#objective')).toHaveText('1 / 3');
  await page.getByRole('button', { name: 'Idź w prawo' }).click();
  await expect(page.locator('#hud')).toHaveAttribute('data-position', '14,11');
  await page.getByRole('button', { name: /Cel/ }).click();
  await expect(page.locator('#target-label')).toContainText('Żuk');
  await page.waitForTimeout(1550);
  for (let i = 0; i < 3; i++) { await page.getByRole('button', { name: /Iskra/ }).click(); await page.waitForTimeout(1550); }
  await expect(page.locator('#objective')).toHaveText('2 / 3');
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: /Łup/ }).click();
  for (let i = 0; i < 6; i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(220); }
  for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(220); }
  await page.getByRole('button', { name: /Cel/ }).click();
  await expect(page.locator('#target-label')).toContainText('Wilk');
  await page.getByRole('button', { name: /Iskra/ }).click();
  for (let i = 0; i < 6; i++) { await page.getByRole('button', { name: /Miecz/ }).click(); await page.waitForTimeout(850); if (i === 2) await page.getByRole('button', { name: /Mikstura/ }).click(); }
  await expect(page.locator('#objective')).toHaveText('3 / 3');
  await expect(page.getByText('Próba ukończona', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('complete.png') });
  await page.getByRole('button', { name: 'Zbierz pozostały łup' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /Łup/ }).click();
  await page.getByRole('button', { name: 'Plecak' }).click();
  await expect(page.locator('#bag')).toBeVisible();
  await expect(page.locator('#bag-gold')).toContainText('6 złota');
  await expect(page.locator('#bag-slots')).toContainText('Skóra wilka');
  await page.getByRole('button', { name: 'Zamknij' }).click();
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Rozpocznij' }).click();
  await expect(page.locator('#objective')).toHaveText('0 / 3');
  expect(errors).toEqual([]);
});
test('keyboard is cardinal, blur clears movement, rotation retains position', async ({ page }) => {
  await start(page);
  await page.keyboard.down('ArrowLeft'); await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(420);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.keyboard.up('ArrowLeft'); await page.keyboard.up('ArrowUp');
  const position = await page.locator('#hud').getAttribute('data-position');
  await page.waitForTimeout(500); await expect(page.locator('#hud')).toHaveAttribute('data-position', position!);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#rotate')).toBeVisible();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#rotate')).not.toBeVisible();
  await expect(page.locator('#hud')).toHaveAttribute('data-position', position!);
});
test('five return journeys use explicit gates without duplicated controls', async ({ page }) => {
  test.setTimeout(90000);
  await start(page, true);
  for (let leg = 0; leg < 10; leg++) {
    await page.waitForTimeout(220);
    for (let i = 0; i < 7; i++) { await page.keyboard.press('ArrowUp'); await page.waitForTimeout(220); }
    await expect(page.locator('#hud')).toHaveAttribute('data-position', '13,4');
    await page.getByRole('button', { name: /Przejdź/ }).click();
    await expect(page.locator('#hud')).toHaveAttribute('data-map', leg % 2 === 0 ? 'courtyard' : 'grove');
    await expect(page.locator('#hud')).toHaveAttribute('data-position', '13,11');
    await page.getByRole('button', { name: /Przejdź/ }).click();
    await expect(page.locator('#hud')).toHaveAttribute('data-position', '13,11');
  }
});
test('simultaneous touch movement and cast; pointercancel stops held direction', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-landscape', 'Real emulated multitouch uses the mobile project');
  await start(page); await selectRat(page, 1, -2);
  const session = await page.context().newCDPSession(page);
  const button = await page.getByRole('button', { name: 'Idź w lewo' }).boundingBox();
  const cast = await page.getByRole('button', { name: /Iskra/ }).boundingBox();
  if (!button || !cast) throw new Error('Missing touch controls');
  const movementTouch = { x: button.x + button.width / 2, y: button.y + button.height / 2, id: 1 };
  const castTouch = { x: cast.x + cast.width / 2, y: cast.y + cast.height / 2, id: 2 };
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [movementTouch] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [movementTouch, castTouch] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [movementTouch] });
  await expect(page.locator('#hp-label')).toContainText('42 MP');
  await expect(page.locator('#hud')).toHaveAttribute('data-position', '12,11');
  await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  const position = await page.locator('#hud').getAttribute('data-position');
  await page.waitForTimeout(500); await expect(page.locator('#hud')).toHaveAttribute('data-position', position!);
  await session.detach();
});

test('style review screenshots and touch control sizes', async ({ page }, testInfo) => {
  await start(page, true);
  for (let i = 0; i < 5; i++) { await page.keyboard.press('ArrowUp'); await page.waitForTimeout(220); }
  await page.waitForTimeout(700);
  await page.screenshot({ path: testInfo.outputPath('style-review.png') });
  expect(await page.locator('canvas').evaluate(canvas => getComputedStyle(canvas).imageRendering)).toBe('pixelated');
  for (const button of await page.locator('#hud button').all()) {
    if (!(await button.isVisible())) continue;
    const box = await button.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(48); expect(box?.height).toBeGreaterThanOrEqual(48);
  }
});
