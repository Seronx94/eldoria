import {expect,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
export async function registerCharacter(page:Page,name:string,profession:'knight'|'mage'|'archer'):Promise<void> {
 await page.locator('#account-email').fill(`test-${randomUUID()}@example.test`);await page.locator('#account-password').fill('Test password 42');await page.locator('#register-account').click();await expect(page.locator('#account-summary')).toContainText('konto bezpłatne');
 await page.locator('#character-name').fill(name);await page.locator('#character-profession').selectOption(profession);await page.locator('#create-character').click();await expect(page.locator('.character-card').filter({hasText:name})).toBeVisible();
}
