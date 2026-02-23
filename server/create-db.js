const { Client } = require('pg');
require('dotenv').config();

// Connect to default 'postgres' database to create new DB
const connectionString = process.env.DATABASE_URL.replace('cyberacademy_lms', 'postgres');

const client = new Client({
    connectionString: connectionString,
});

async function createDB() {
    try {
        await client.connect();
        console.log('Connected to \'postgres\' database.');

        // Check if DB exists
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'cyberacademy_lms'");
        if (res.rowCount === 0) {
            console.log('Database does not exist. Creating...');
            await client.query('CREATE DATABASE cyberacademy_lms');
            console.log('Database \'cyberacademy_lms\' created successfully!');
        } else {
            console.log('Database already exists.');
        }
    } catch (err) {
        console.error('Error creating database:', err.message);
    } finally {
        await client.end();
    }
}

createDB();
