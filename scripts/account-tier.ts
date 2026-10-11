import {Pool} from 'pg';
import {z} from 'zod';
const email=z.email().parse(process.argv[2]).toLowerCase(),tier=z.enum(['free','premium']).parse(process.argv[3]);
if(!process.env.DATABASE_URL)throw new Error('Uruchom npm run db:up lub ustaw DATABASE_URL.');
const pool=new Pool({connectionString:process.env.DATABASE_URL}),client=await pool.connect();
try{
 await client.query('BEGIN');const account=(await client.query<{id:string}>('SELECT id FROM accounts WHERE email=$1 FOR UPDATE',[email])).rows[0];if(!account)throw new Error('Brak konta.');
 const count=Number((await client.query<{count:string}>('SELECT count(*) FROM characters WHERE account_id=$1',[account.id])).rows[0]!.count);if(tier==='free'&&count>3)throw new Error('Konto ma więcej niż 3 postacie. Nie zmieniono uprawnienia.');
 await client.query('UPDATE accounts SET tier=$2 WHERE id=$1',[account.id,tier]);await client.query('COMMIT');console.log(`Zmieniono uprawnienie na ${tier}. Limit: ${tier==='premium'?5:3}.`);
}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();await pool.end();}
