import axios from 'axios';

async function testSandbox() {
    try {
        console.log("Registering sandbox user...");
        const regRes = await axios.post('http://localhost:5000/api/auth/register', {
            email: "sandbox123@test.local",
            username: "sandbox123",
            password: "password"
        });

        const token = regRes.data.token;
        console.log("Got token:", token.substring(0, 20) + "...");

        console.log("Testing Lab execution 'ls'...");
        const execRes = await axios.post('http://localhost:5000/api/labs/execute',
            { command: 'ls' },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log("LS Output:", execRes.data);

        console.log("Testing Lab write 'nano'...");
        const writeRes = await axios.post('http://localhost:5000/api/labs/write',
            { filename: 'test_nano.txt', content: 'hello from api' },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log("Write Output:", writeRes.data);

        console.log("Testing Lab read 'nano'...");
        const readRes = await axios.post('http://localhost:5000/api/labs/read',
            { filename: 'test_nano.txt' },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log("Read Output:", readRes.data);

        console.log("Verifying LS again...");
        const execRes2 = await axios.post('http://localhost:5000/api/labs/execute',
            { command: 'ls' },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log("LS Output:", execRes2.data);

    } catch (err: any) {
        console.error("Test failed:", err.response?.data || err.message);
    }
}

testSandbox();
