import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {existsSync} from 'node:fs';
import {registerCharacter} from './account-navigation';
import {openMenu} from './menu-navigation';
if(!process.env.DATABASE_URL&&existsSync('.eldoria-local/server.env'))process.loadEnvFile('.eldoria-local/server.env');
test('account creates three professions, blocks the fourth, restores a character and exposes compact settings and skills',async({page},info)=>{
 test.setTimeout(180000);const prefix=randomUUID().slice(0,5),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/assets/')&&r.status()>=400)errors.push(r.url());});
 await page.goto('/');const knight=`Knight${prefix}`;await registerCharacter(page,knight,'knight');
 for(const [name,profession]of [[`Archer${prefix}`,'archer'],[`Mage${prefix}`,'mage']] as const){await page.locator('#character-name').fill(name);await page.locator('#character-profession').selectOption(profession);await page.locator('#create-character').click();await expect(page.locator('.character-card').filter({hasText:name})).toBeVisible();}
 await expect(page.locator('#account-summary')).toContainText('3/3');await expect(page.locator('#create-character')).toBeDisabled();
 const forbidden=await page.request.post('/api/characters',{headers:{Origin:new URL(page.url()).origin},data:{name:`Fourth${prefix}`,profession:'knight'}});expect(forbidden.status()).toBe(409);expect((await forbidden.json()).error).toContain('limit');
 await page.screenshot({path:info.outputPath('account-characters.png')});await page.locator('.character-card').filter({hasText:knight}).click();await expect(page.locator('#hud')).toHaveAttribute('data-connection','online');
 await page.keyboard.press('a');await expect(page.locator('#hud')).toHaveAttribute('data-position','31,76');
 await page.locator('#settings-button').click();await expect(page.locator('#settings-dialog')).toBeVisible();await page.locator('#settings-vitals-style').selectOption('arcs');await expect(page.locator('#hud')).toHaveAttribute('data-vitals-style','arcs');await page.screenshot({path:info.outputPath('account-settings.png')});await page.locator('#close-settings').click();
 if(info.project.name==='mobile-landscape'){await expect(page.locator('.topbar .stats')).toBeHidden();await expect(page.locator('.topbar .brand')).toBeHidden();const box=(await page.locator('.topbar').boundingBox())!;expect(box.width).toBeLessThanOrEqual(120);expect(box.height).toBeLessThanOrEqual(60);}
 await page.locator('#bag-button').click();await expect(page.locator('#skills-list')).toContainText('Melee fighting: 10');await expect(page.locator('#skills-list')).toContainText('Distance fighting: 10');await expect(page.locator('#skills-list')).toContainText('Magic level: 0');await page.locator('#skills-list').scrollIntoViewIfNeeded();await expect(page.locator('#skills-list')).toBeInViewport();await page.screenshot({path:info.outputPath('account-skills.png')});await page.locator('#close-bag').click();
 await openMenu(page);await page.locator('.character-card').filter({hasText:knight}).click();await expect(page.locator('#hud')).toHaveAttribute('data-position','31,76');await expect(page.locator('#hud')).toHaveAttribute('data-vitals-style','arcs');await page.screenshot({path:info.outputPath('account-world.png')});await openMenu(page);
 const email=await page.locator('#account-summary').textContent();await page.locator('#logout-account').click();await expect(page.locator('#auth-form')).toBeVisible();await page.locator('#account-email').fill(email!.split(' · ')[0]!);await page.locator('#account-password').fill('Wrong password 42');await page.locator('#login-account').click();await expect(page.locator('#auth-status')).toContainText('Nieprawidłowy');await page.locator('#account-password').fill('Test password 42');await page.locator('#login-account').click();await expect(page.locator('#character-list .character-card')).toHaveCount(3);expect(errors).toEqual([]);
});
test('expired fifteen-minute server idle session closes the real socket and requires a fresh login',async({page})=>{
 test.setTimeout(60000);if(!process.env.DATABASE_URL)throw new Error('Account E2E requires PostgreSQL. Run npm run db:up.');
 await page.goto('/');const name=`Idle${randomUUID().slice(0,5)}`;await registerCharacter(page,name,'mage');
 const email=(await page.locator('#account-summary').textContent())!.split(' · ')[0]!;await page.locator('.character-card').filter({hasText:name}).click();await expect(page.locator('#hud')).toHaveAttribute('data-connection','online');
 // Age only this test account's session to the real boundary; do not wait 15
 // wall-clock minutes or alter the room's clock, commands or authentication.
 const pool=new Pool({connectionString:process.env.DATABASE_URL});try{await page.waitForTimeout(1000);await pool.query("UPDATE sessions SET last_activity=now()-interval '901 seconds' WHERE account_id=(SELECT id FROM accounts WHERE email=$1)",[email]);await expect(page.locator('#menu')).toBeVisible({timeout:15000});await expect(page.locator('#hud')).toBeHidden();await expect(page.locator('#name-error')).toContainText('15 minut');await expect(page.locator('#auth-form')).toBeVisible();await page.locator('#account-email').fill(email);await page.locator('#account-password').fill('Test password 42');await page.locator('#login-account').click();await page.locator('.character-card').filter({hasText:name}).click();await expect(page.locator('#hud')).toHaveAttribute('data-connection','online');await openMenu(page);}finally{await pool.end();}
});
