import axios from 'axios';
import fs from 'fs';

async function checkLabError() {
    let log = '';
    const addLog = (msg: string) => { log += msg + '\n'; console.log(msg); };

    try {
        addLog("Logging into sandbox123...");
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: "sandbox123@test.local",
            password: "password"
        });

        const token = loginRes.data.token;
        addLog("Got token: " + token.substring(0, 20) + "...");

        addLog("Testing Lab execution 'ls'...");
        try {
            const execRes = await axios.post('http://localhost:5000/api/labs/execute',
                { command: 'ls' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            addLog("LS Output SUCCESS: " + execRes.status + " " + JSON.stringify(execRes.data));
        } catch (execErr: any) {
            addLog("LS Output FAILED: " + execErr.response?.status + " " + JSON.stringify(execErr.response?.data || execErr.message));
        }

    } catch (err: any) {
        addLog("Login failed: " + JSON.stringify(err.response?.data || err.message));
    }

    fs.writeFileSync('clean_log.txt', log, 'utf8');
}

checkLabError();
