import {expect,type Page} from '@playwright/test';
/** Follow the actual compact toolbar on touch screens. */
export async function openMenu(page:Page):Promise<void> {
 if(await page.locator('#menu-button').isVisible())await page.locator('#menu-button').click();
 else {if(!await page.locator('#settings-dialog').isVisible())await page.locator('#settings-button').click();await page.locator('#settings-leave').click();}
 await expect(page.locator('#menu')).toBeVisible();
}

/** Offline saving uses the visible toolbar or the safe menu exit on mobile. */
export async function saveOffline(page:Page):Promise<void> {
 if(await page.locator('#save-button').isVisible())await page.locator('#save-button').click();
 else await openMenu(page);
}
