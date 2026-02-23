import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

// Base directory for all sandboxes
const SANDBOX_BASE = path.resolve(__dirname, '../../sandboxes');

// Ensure base sandbox directory exists
if (!fs.existsSync(SANDBOX_BASE)) {
    fs.mkdirSync(SANDBOX_BASE, { recursive: true });
}

// Helper to get or create a user's sandbox
const getUserSandbox = (userId: string) => {
    const userSandbox = path.join(SANDBOX_BASE, userId);
    if (!fs.existsSync(userSandbox)) {
        fs.mkdirSync(userSandbox, { recursive: true });
        // Seed default directories
        ['Desktop', 'Downloads', 'Documents'].forEach(dir => {
            fs.mkdirSync(path.join(userSandbox, dir), { recursive: true });
        });
    }
    return userSandbox;
};

// Ensure path stays within user sandbox
const isPathSafe = (basePath: string, testPath: string) => {
    const resolvedPath = path.resolve(testPath);
    return resolvedPath.startsWith(basePath);
};

// Virtualise the real Windows path into a Linux-style path for the terminal UI
const virtualPath = (realPath: string, userSandbox: string): string => {
    if (realPath === userSandbox) return '~';
    const relative = path.relative(userSandbox, realPath).replace(/\\/g, '/');
    return `~/${relative}`;
};

// Parse a virtual path (~/...) back to a real absolute path
const resolveVirtualPath = (virtualCwd: string, userSandbox: string, dir: string): string => {
    if (dir === '~' || dir === '/home/user') return userSandbox;
    if (dir.startsWith('~/')) {
        return path.join(userSandbox, dir.slice(2));
    }
    if (dir.startsWith('/')) {
        // Absolute Linux-style path: treat root as sandbox
        return path.join(userSandbox, dir.slice(1));
    }
    // Relative: resolve against the real cwd using virtualCwd -> realpath
    const realCwd = virtualCwd === '~' ? userSandbox
        : virtualCwd.startsWith('~/')
            ? path.join(userSandbox, virtualCwd.slice(2))
            : userSandbox;
    return path.resolve(realCwd, dir);
};

// @ts-ignore
router.post('/execute', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    let { command, cwd } = req.body;
    const userSandbox = getUserSandbox(userId);

    // Safety checks for MVP Lab (Do not allow destructive commands)
    const blockedCommands = ['rm', 'mv', 'wget', 'nc', 'bash', 'sh', 'nano', 'vim', 'shutdown', 'reboot', 'del', 'format'];
    const cmdBase = command.trim().split(' ')[0].toLowerCase();

    if (blockedCommands.includes(cmdBase)) {
        res.json({ output: `bash: ${cmdBase}: command not found\n`, cwd: cwd || '~' });
        return;
    }

    // ---------------------------------------------------------------
    // Work out the real CWD from the virtual path the frontend sent
    // ---------------------------------------------------------------
    const virtualCwd: string = cwd || '~';
    let realCwd: string;
    if (virtualCwd === '~' || !virtualCwd) {
        realCwd = userSandbox;
    } else if (virtualCwd.startsWith('~/')) {
        realCwd = path.join(userSandbox, virtualCwd.slice(2));
    } else {
        realCwd = userSandbox; // fallback
    }

    // Jail check
    if (!isPathSafe(userSandbox, realCwd)) {
        realCwd = userSandbox;
    }

    // ---------------------------------------------------------------
    // Intercept Linux commands natively (no CMD/shell calls needed)
    // ---------------------------------------------------------------

    // --- ls ---
    if (cmdBase === 'ls') {
        try {
            // Parse flags and target dir from args, e.g. ls -la ~/Desktop
            const parts = command.trim().split(/\s+/).slice(1);
            const flags = parts.filter((p: string) => p.startsWith('-')).join('');
            const showLong = flags.includes('l');
            const showAll = flags.includes('a');
            const targetArg = parts.find((p: string) => !p.startsWith('-'));
            const listPath = targetArg ? resolveVirtualPath(virtualCwd, userSandbox, targetArg) : realCwd;

            if (!isPathSafe(userSandbox, listPath)) {
                res.json({ output: `ls: cannot access '${targetArg}': Permission denied\n`, cwd: virtualCwd });
                return;
            }

            let entries = fs.readdirSync(listPath, { withFileTypes: true });

            // Filter hidden files unless -a
            if (!showAll) {
                entries = entries.filter(e => !e.name.startsWith('.'));
            }

            if (showLong) {
                // Long format: permissions  links  owner  group  size  date  name
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const formatMode = (isDir: boolean) => isDir ? 'drwxr-xr-x' : '-rw-r--r--';
                const formatDate = (d: Date) => `${months[d.getMonth()]} ${String(d.getDate()).padStart(2)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

                let output = showAll ? `total ${entries.length + 2}\n` : `total ${entries.length}\n`;

                if (showAll) {
                    const now = new Date();
                    output += `drwxr-xr-x  2 root root 4096 ${formatDate(now)} .\n`;
                    output += `drwxr-xr-x  3 root root 4096 ${formatDate(now)} ..\n`;
                }

                for (const e of entries) {
                    const stat = fs.statSync(path.join(listPath, e.name));
                    const mode = formatMode(e.isDirectory());
                    const size = String(stat.size).padStart(6);
                    const date = formatDate(stat.mtime);
                    const name = e.isDirectory() ? `\x1b[1;34m${e.name}\x1b[0m` : e.name;
                    output += `${mode}  2 root root ${size} ${date} ${name}\n`;
                }
                res.json({ output, cwd: virtualCwd });
            } else {
                // Short format — colour dirs blue, 4 per row
                if (entries.length === 0) { res.json({ output: '', cwd: virtualCwd }); return; }
                const names = entries.map(e => e.isDirectory() ? `\x1b[1;34m${e.name}\x1b[0m` : e.name);
                let output = '';
                for (let i = 0; i < names.length; i++) {
                    output += names[i].padEnd(20);
                    if ((i + 1) % 4 === 0) output += '\n';
                }
                if (!output.endsWith('\n')) output += '\n';
                res.json({ output, cwd: virtualCwd });
            }
        } catch (err: any) {
            res.json({ output: `ls: ${err.message}\n`, cwd: virtualCwd });
        }
        return;
    }

    // --- pwd ---
    if (cmdBase === 'pwd') {
        res.json({ output: virtualCwd + '\n', cwd: virtualCwd });
        return;
    }

    // --- cd ---
    if (cmdBase === 'cd') {
        const dir = command.trim().split(/\s+/)[1];
        if (!dir || dir === '~') {
            res.json({ output: '', cwd: '~' });
            return;
        }

        const targetReal = resolveVirtualPath(virtualCwd, userSandbox, dir);

        if (!isPathSafe(userSandbox, targetReal)) {
            res.json({ output: `bash: cd: ${dir}: Permission denied\n`, cwd: virtualCwd });
            return;
        }

        if (!fs.existsSync(targetReal) || !fs.statSync(targetReal).isDirectory()) {
            res.json({ output: `bash: cd: ${dir}: No such file or directory\n`, cwd: virtualCwd });
            return;
        }

        const newVirtualCwd = virtualPath(targetReal, userSandbox);
        res.json({ output: '', cwd: newVirtualCwd });
        return;
    }

    // --- cat ---
    if (cmdBase === 'cat') {
        const filename = command.trim().split(/\s+/)[1];
        if (!filename) {
            res.json({ output: 'cat: missing operand\n', cwd: virtualCwd });
            return;
        }
        const filePath = resolveVirtualPath(virtualCwd, userSandbox, filename);
        if (!isPathSafe(userSandbox, filePath)) {
            res.json({ output: `cat: ${filename}: Permission denied\n`, cwd: virtualCwd });
            return;
        }
        if (!fs.existsSync(filePath)) {
            res.json({ output: `cat: ${filename}: No such file or directory\n`, cwd: virtualCwd });
            return;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        res.json({ output: content + '\n', cwd: virtualCwd });
        return;
    }

    // --- mkdir ---
    if (cmdBase === 'mkdir') {
        const dirName = command.trim().split(/\s+/)[1];
        if (!dirName) {
            res.json({ output: 'mkdir: missing operand\n', cwd: virtualCwd });
            return;
        }
        const newDir = resolveVirtualPath(virtualCwd, userSandbox, dirName);
        if (!isPathSafe(userSandbox, newDir)) {
            res.json({ output: `mkdir: cannot create directory '${dirName}': Permission denied\n`, cwd: virtualCwd });
            return;
        }
        fs.mkdirSync(newDir, { recursive: true });
        res.json({ output: '', cwd: virtualCwd });
        return;
    }

    // --- touch ---
    if (cmdBase === 'touch') {
        const fname = command.trim().split(/\s+/)[1];
        if (!fname) {
            res.json({ output: 'touch: missing file operand\n', cwd: virtualCwd });
            return;
        }
        const fpath = resolveVirtualPath(virtualCwd, userSandbox, fname);
        if (!isPathSafe(userSandbox, fpath)) {
            res.json({ output: `touch: '${fname}': Permission denied\n`, cwd: virtualCwd });
            return;
        }
        fs.writeFileSync(fpath, '', { flag: 'a' });
        res.json({ output: '', cwd: virtualCwd });
        return;
    }

    // --- echo ---
    if (cmdBase === 'echo') {
        const rest = command.trim().slice(5);
        // Handle echo "text" > file
        const redirectMatch = rest.match(/^(.*)>\s*(\S+)$/);
        if (redirectMatch) {
            const text = redirectMatch[1].trim().replace(/^"|"$/g, '');
            const fname = redirectMatch[2].trim();
            const fpath = resolveVirtualPath(virtualCwd, userSandbox, fname);
            if (!isPathSafe(userSandbox, fpath)) {
                res.json({ output: `bash: ${fname}: Permission denied\n`, cwd: virtualCwd });
                return;
            }
            fs.writeFileSync(fpath, text + '\n', 'utf8');
            res.json({ output: '', cwd: virtualCwd });
        } else {
            res.json({ output: rest.trim().replace(/^"|"$/g, '') + '\n', cwd: virtualCwd });
        }
        return;
    }

    // --- whoami ---
    if (cmdBase === 'whoami') {
        res.json({ output: 'root\n', cwd: virtualCwd });
        return;
    }

    // --- hostname ---
    if (cmdBase === 'hostname') {
        res.json({ output: 'academy\n', cwd: virtualCwd });
        return;
    }

    // --- uname ---
    if (cmdBase === 'uname') {
        const flag = command.trim().split(/\s+/)[1];
        if (flag === '-a') {
            res.json({ output: 'Linux academy 6.1.0-kali7-amd64 #1 SMP Debian (x86_64) GNU/Linux\n', cwd: virtualCwd });
        } else {
            res.json({ output: 'Linux\n', cwd: virtualCwd });
        }
        return;
    }

    // --- help ---
    if (cmdBase === 'help') {
        const helpText = [
            'Available commands:',
            '  ls [dir]      - list files',
            '  pwd           - print working directory',
            '  cd <dir>      - change directory',
            '  cat <file>    - display file contents',
            '  echo <text>   - print text (supports > redirect)',
            '  mkdir <dir>   - create directory',
            '  touch <file>  - create empty file',
            '  nano <file>   - edit a file',
            '  whoami        - print current user',
            '  uname [-a]    - print system info',
            '  clear         - clear terminal',
        ].join('\n');
        res.json({ output: helpText + '\n', cwd: virtualCwd });
        return;
    }

    // ---------------------------------------------------------------
    // Unrecognized command
    // ---------------------------------------------------------------
    res.json({ output: `bash: ${cmdBase}: command not found\n`, cwd: virtualCwd });
});

// @ts-ignore
router.post('/write', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    const { filename, content, cwd } = req.body;
    const userSandbox = getUserSandbox(userId);
    const virtualCwd: string = cwd || '~';
    const realCwd = virtualCwd === '~' || !virtualCwd ? userSandbox
        : virtualCwd.startsWith('~/') ? path.join(userSandbox, virtualCwd.slice(2))
            : userSandbox;

    if (!isPathSafe(userSandbox, realCwd)) {
        res.status(403).json({ error: 'Permission denied' });
        return;
    }

    const filePath = resolveVirtualPath(virtualCwd, userSandbox, filename);
    if (!isPathSafe(userSandbox, filePath)) {
        res.status(403).json({ error: 'Permission denied to write outside sandbox' });
        return;
    }

    try {
        fs.writeFileSync(filePath, content, 'utf8');
        res.json({ success: true, message: `[ Saved 1 file ]` });
    } catch (err) {
        console.error("Nano write error:", err);
        res.status(500).json({ error: 'Failed to write file' });
    }
});

// @ts-ignore
router.post('/read', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    const { filename, cwd } = req.body;
    const userSandbox = getUserSandbox(userId);
    const virtualCwd: string = cwd || '~';

    const filePath = resolveVirtualPath(virtualCwd, userSandbox, filename);
    if (!isPathSafe(userSandbox, filePath)) {
        res.status(403).json({ error: 'Permission denied to read outside sandbox' });
        return;
    }

    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            res.json({ content });
        } else {
            res.json({ content: '' }); // New file
        }
    } catch (err) {
        console.error("Nano read error:", err);
        res.status(500).json({ error: 'Failed to read file' });
    }
});

export default router;
