import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

console.log('Testing connection to:', process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':****@'));

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function test() {
    try {
        await client.connect();
        console.log('Successfully connected to PostgreSQL!');
        const res = await client.query('SELECT NOW()');
        console.log('Database time:', res.rows[0]);
        await client.end();
    } catch (err: any) {
        console.error('Connection Error:', err.message);
        if (err.code) console.error('Error Code:', err.code);
        process.exit(1);
    }
}

test();
