const { Client } = require('pg');
require('dotenv').config();

// Use DATABASE_URL as is (connecting to cyberacademy_lms)
const connectionString = process.env.DATABASE_URL;

console.log('Testing connection to:', connectionString.replace(/:([^:@]+)@/, ':****@'));

const client = new Client({
    connectionString: connectionString,
});

async function test() {
    try {
        await client.connect();
        console.log('Successfully connected to cyberacademy_lms!');
        const res = await client.query('SELECT NOW()');
        console.log('Database time:', res.rows[0]);
        await client.end();
    } catch (err) {
        console.error('Connection Error:', err.message);
        if (err.code) console.error('Error Code:', err.code);
        process.exit(1);
    }
}

test();
