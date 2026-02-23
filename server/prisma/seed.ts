import { PrismaClient, UserRole } from '@prisma/client';
import argon2 from 'argon2';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const academyDataPath = path.join(__dirname, '../academy_content.json');
let SCRAPED_COURSES: any[] = [];

if (fs.existsSync(academyDataPath)) {
    const rawData = fs.readFileSync(academyDataPath, 'utf8');
    SCRAPED_COURSES = JSON.parse(rawData);
}

const COURSES = [
    {
        title: "OWASP Top 10: Web Vigilante",
        slug: "owasp-top-10-web-vigilante",
        description: "Master the 10 most critical web application security risks. This isn't just a list; it's your playbook for defense. Includes interactive quizzes and specialized verification modules.",
        level: "INTERMEDIATE",
        thumbnailUrl: "https://ui-avatars.com/api/?name=OWASP+10&background=00a651&color=000",
        modules: [
            {
                title: "01. Injection: The Digital Syringe",
                type: "TEXT",
                content: `
# Injection Attacks
**"Untrusted data is the root of all evil."**

Injection flaws, such as SQL, NoSQL, OS, and LDAP injection, occur when untrusted data is sent to an interpreter as part of a command or query. The attacker's hostile data can trick the interpreter into executing unintended commands or accessing data without proper authorization.

### The Mechanism
Imagine asking a robot to "Delete file X".
Now imagine an attacker says: "Delete file X; AND Delete ALL files."
If the robot blindly processes the command, you lose everything.

### Code Example (Vulnerable)
\`\`\`javascript
const query = "SELECT * FROM accounts WHERE custID='" + request.getParameter("id") + "'";
\`\`\`
If \`id\` is \`' OR '1'='1\`, the query becomes:
\`SELECT * FROM accounts WHERE custID='' OR '1'='1'\`
This returns **ALL** accounts.

### Mitigation
*   **Prepared Statements (with Parameterized Queries)**
*   **Input Validation** (Allow-listing)
*   **Escaping** user input.
`
            },
            {
                title: "02. Broken Authentication: Identity Theft 101",
                type: "TEXT",
                content: `
# Broken Authentication
Application functions related to authentication and session management are often implemented incorrectly, allowing attackers to compromise passwords, keys, or session tokens, or to exploit other implementation flaws to assume other users' identities.

### Common Flaws
*   Permitting automated attacks like **Credential Stuffing**.
*   Default, weak, or well-known passwords ("admin/admin").
*   Weak or ineffective "Forgot Password" processes.
*   Plain text, non-encrypted, or weekly hashed passwords.

### The Fix
*   Implement **Multi-Factor Authentication (MFA)**.
*   Do not ship with default credentials.
*   Enforce weak-password checks.
*   Limit or delay failed login attempts.
`
            },
            {
                title: "03. Interactive Challenge: Injection Mastery",
                type: "QUIZ",
                content: JSON.stringify([
                    {
                        question: "Which of the following is the BEST defense against SQL Injection?",
                        options: [
                            "Sanitizing input by removing quotes",
                            "Using Prepared Statements (Parameterized Queries)",
                            "Using Stored Procedures only",
                            "Encrypting the database"
                        ],
                        correctAnswer: 1,
                        explanation: "Prepared Statements ensure that the interpreter distinguishes between code and data, preventing the attacker from changing the query logic."
                    },
                    {
                        question: "If an attacker inputs `' OR '1'='1` into a login field, what is their likely goal?",
                        options: [
                            "To crash the server (DoS)",
                            "To bypass authentication by making the query evaluate to true",
                            "To encrypt the database",
                            "To inject a virus"
                        ],
                        correctAnswer: 1,
                        explanation: "This is a classic SQL injection tautology. '1'='1' is always true, causing the database to return records (often the first admin record) without a valid password."
                    },
                    {
                        question: "Blind SQL Injection differs from standard SQL Injection because:",
                        options: [
                            "It only works on Oracle databases",
                            "It uses audio signals",
                            "The database does not return data errors or results directly to the web page",
                            "It requires the attacker to be blindfolded"
                        ],
                        correctAnswer: 2,
                        explanation: "In Blind SQLi, the attacker infers data by asking true/false questions and observing the application's response (time delays or content changes)."
                    }
                ])
            }
        ]
    },
    {
        title: "Linux Fundamentals: The Command Line",
        slug: "linux-fundamentals-cli",
        description: "From basic navigation to piping and redirection. Master the CLI and file system navigation based on the 'Linux Fundamentals' curriculum.",
        level: "BEGINNER",
        thumbnailUrl: "https://ui-avatars.com/api/?name=Linux+CLI&background=FCC624&color=000",
        modules: [
            {
                title: "01. System Navigation (The Basics)",
                type: "TEXT",
                content: `
# Module 1: System Navigation
**Objective:** Learn to move around the Linux file system like a pro hacker.

### The Terminal
The terminal is your cockpit. It accepts text commands and returns text output.

### Essential Commands
*   \`pwd\` (**P**rint **W**orking **D**irectory): Shows where you are.
    \`\`\`bash
    $ pwd
    /home/operative
    \`\`\`
*   \`ls\` (**L**i**s**t): Shows files in the current directory.
    *   \`ls -la\`: Show **all** files (hidden ones start with .) in **long** format.
*   \`cd\` (**C**hange **D**irectory): Moves you to a new location.
    *   \`cd /var/log\`: Go to absolute path.
    *   \`cd ..\`: Move up one level.
    *   \`cd ~\`: Go home.

### Lab Exercise
1.  Open your local terminal.
2.  Type \`cd /tmp\` to go to the temporary folder.
3.  Type \`pwd\` to verify.
4.  Type \`ls -la\` to see what's there.
`
            },
            {
                title: "02. File Manipulation (Creation & Destruction)",
                type: "TEXT",
                content: `
# Module 2: File Manipulation
**Objective:** Master file creation, copying, and deletion.

### Creating Files
*   \`touch filename.txt\`: Creates an empty file or updates timestamp.
*   \`mkdir new_folder\`: Creates a directory.

### Moving & Copying
*   \`cp source dest\`: Copy a file.
    *   \`cp -r folder new_folder\`: Copy a directory recursively.
*   \`mv source dest\`: Move (rename) a file.
    \`\`\`bash
    $ mv secret.txt .hidden_secret
    \`\`\`

### Destruction
*   \`rm file\`: Delete a file. **There is no Recycle Bin.**
*   \`rm -rf folder\`: Force delete a folder and everything inside it. **Use with caution.**
`
            },
            {
                title: "03. Information Extraction (Grep & Pipes)",
                type: "TEXT",
                content: `
# Module 3: Information Extraction
**Objective:** Extract information from files and search for specific data. This is critical for finding flags and credentials.

### Reading Content
*   \`cat file.txt\`: Dump entire file to screen.
*   \`head -n 5 file.txt\`: Show first 5 lines.
*   \`tail -f log.txt\`: Watch a file grow in real-time (great for logs).

### Searching (Grep)
*   \`grep "string" file\`: Search for a string in a file.
    \`\`\`bash
    $ grep "password" /var/www/html/config.php
    \`\`\`
*   \`grep -r "TODO" .\`: Search recursively in current directory.

### The Pipe (\`|\`)
Passes the output of one command to another.
\`\`\`bash
$ cat access.log | grep "404" | wc -l
# Count how many 404 errors are in the log
\`\`\`
`
            },
            {
                title: "04. Permissions & Access Control",
                type: "TEXT",
                content: `
# Module 4: Permissions
**Objective:** Learn how file permissions work and how to modify them.

### Structure: \`rwx\`
*   **r**ead (4)
*   **w**rite (2)
*   **x**ecute (1)

### Chmod (Change Mode)
*   \`chmod +x script.sh\`: Make executable.
*   \`chmod 777 file\`: Give everyone everything (Dangerous).
*   \`chmod 600 key.pem\`: Only owner can read/write (Secure).

### Chown (Change Owner)
*   \`chown user:group file\`: Change ownership.
    \`\`\`bash
    $ sudo chown www-data:www-data /var/www/html
    \`\`\`
`
            },
            {
                title: "05. Process Control (Task Manager)",
                type: "TEXT",
                content: `
# Module 5: Process Control
**Objective:** Control running programs and background processes.

### Viewing Processes
*   \`ps aux\`: Snapshot of all running processes.
*   \`top\` / \`htop\`: Real-time task manager.

### Killing Processes
*   \`kill [PID]\`: Ask a process to stop.
*   \`kill -9 [PID]\`: Force kill (Murder) a process.

### Backgrounding
*   \`Ctrl+Z\`: Pause current foreground process.
*   \`bg\`: Resume paused process in background.
*   \`fg\`: Bring background process to foreground.
`
            },
            {
                title: "06. Advanced Challenge: The Admin",
                type: "QUIZ",
                content: JSON.stringify([
                    {
                        question: "You need to find the word 'Sherk' inside a massive log file named 'server.log' and count how many times it appears. Which command sequence is correct?",
                        options: [
                            "cat server.log > grep 'Sherk' > count",
                            "grep 'Sherk' server.log | wc -l",
                            "find 'Sherk' in server.log",
                            "ls -la server.log | grep 'Sherk'"
                        ],
                        correctAnswer: 1,
                        explanation: "`grep` searches for the string, and the pipe `|` sends the output to `wc -l` (word count -lines), which counts the matches."
                    },
                    {
                        question: "A script `miner.sh` is freezing your CPU. You identified its PID is 1337. It won't close with a normal kill command. How do you force it to stop immediately?",
                        options: [
                            "kill 1337",
                            "stop 1337",
                            "kill -9 1337",
                            "rm miner.sh"
                        ],
                        correctAnswer: 2,
                        explanation: "`kill -9` sends the SIGKILL signal, which the process cannot ignore or catch. It forces immediate termination."
                    },
                    {
                        question: "True or False: `rm -rf /` is a safe command to run to clean up temporary files.",
                        options: [
                            "True",
                            "False"
                        ],
                        correctAnswer: 1,
                        explanation: "FALSE. `rm -rf /` will attempt to recursively force-delete the entire root file system, destroying the OS."
                    }
                ])
            }
        ]
    },
    {
        title: "Web Penetration Testing: VAPT Tools",
        slug: "web-vapt-tools",
        description: "A deep dive into Web Application Penetration Testing tools and workarounds. Covers Burp Suite, Zap, and manual exploitation techniques.",
        level: "ADVANCED",
        thumbnailUrl: "https://ui-avatars.com/api/?name=Web+VAPT&background=e34c26&color=fff",
        modules: [
            {
                title: "01. Burp Suite: The Intercepting Proxy",
                type: "TEXT",
                content: `
# Burp Suite
The industry standard for web application security testing.

### Core Components
1.  **Proxy**: Intercepts HTTP traffic between your browser and the target.
2.  **Repeater**: Manually modify and resend requests to test for vulnerabilities.
3.  **Intruder**: Automate attacks (brute force, fuzzing).
4.  **Decoder**: Encode/decode data (Base64, URL, Hex).

### Setting Up
Configure your browser to proxy traffic through \`127.0.0.1:8080\`, then install the PortSwigger CA certificate to intercept HTTPS traffic.
`
            },
            {
                title: "02. Reconnaissance & Mobile VAPT",
                type: "TEXT",
                content: `
# Mobile VAPT
Testing mobile apps (Android/iOS) often requires bypassing SSL Pinning.

### Tools
*   **Frida**: Dynamic instrumentation toolkit for hooking into apps.
*   **Objection**: Runtime mobile exploration toolkit (powered by Frida).
*   **MobSF**: Automated static analysis framework.

### Common Workflow
1.  Decompile APK (static analysis).
2.  Patch APK to allow debugging.
3.  Use Frida to bypass Root Detection and SSL Pinning.
4.  Intercept traffic with Burp Suite.
`
            },
            {
                title: "03. Challenge: Tool Selection",
                type: "QUIZ",
                content: JSON.stringify([
                    {
                        question: "Which Burp Suite tool is BEST for manually modifying a captured request and resending it multiple times to test logic?",
                        options: [
                            "Intruder",
                            "Repeater",
                            "Sequencer",
                            "Comparer"
                        ],
                        correctAnswer: 1,
                        explanation: "Repeater is designed specifically for the manual 'edit and resend' workflow."
                    },
                    {
                        question: "What tool would you use to dynamically bypass SSL Pinning on a mobile application at runtime?",
                        options: [
                            "Wireshark",
                            "Nmap",
                            "Frida",
                            "John the Ripper"
                        ],
                        correctAnswer: 2,
                        explanation: "Frida allows you to inject scripts into running processes to hook functions and bypass security controls like SSL pinning."
                    }
                ])
            }
        ]
    }
];

async function main() {
    // 1. Create Admin User
    const passwordHash = await argon2.hash('password123');
    const admin = await prisma.user.upsert({
        where: { email: 'admin@cyberacademy.com' },
        update: {},
        create: {
            email: 'admin@cyberacademy.com',
            username: 'admin',
            passwordHash,
            role: UserRole.ADMIN,
            firstName: 'System',
            lastName: 'Admin'
        }
    });

    console.log('Admin user ready:', admin.email);

    // 2. Clear Legacy/Extracted Content
    // We want to remove any course NOT in our new curated list.

    const validSlugs = COURSES.map(c => c.slug);
    const deleted = await prisma.course.deleteMany({
        where: {
            slug: { notIn: validSlugs }
        }
    });
    console.log(`Cleaned up ${deleted.count} legacy/PDF courses.`);

    // 3. Seed Curated Courses
    for (const courseData of COURSES) {
        const course = await prisma.course.upsert({
            where: { slug: courseData.slug },
            update: {
                title: courseData.title,
                description: courseData.description,
                thumbnailUrl: courseData.thumbnailUrl
            },
            create: {
                title: courseData.title,
                slug: courseData.slug,
                description: courseData.description,
                instructorId: admin.id,
                isPublished: true,
                price: 0,
                thumbnailUrl: courseData.thumbnailUrl
            }
        });

        console.log(`Seeded Course: ${course.title}`);

        // Reset modules for this course to ensure perfect sync with our curated data
        await prisma.module.deleteMany({ where: { courseId: course.id } });

        for (let i = 0; i < courseData.modules.length; i++) {
            const mod = courseData.modules[i];
            await prisma.module.create({
                data: {
                    courseId: course.id,
                    title: mod.title,
                    type: mod.type as any,
                    content: mod.content,
                    orderIndex: i
                }
            });
        }
        console.log(` > Synced ${courseData.modules.length} modules for ${course.title}`);
    }

    // 4. Seed Scraped Academy Content
    for (const scrapedCourse of SCRAPED_COURSES) {
        const slug = scrapedCourse.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        const course = await prisma.course.upsert({
            where: { slug: slug },
            update: {
                title: scrapedCourse.title,
                description: scrapedCourse.description,
            },
            create: {
                title: scrapedCourse.title,
                slug: slug,
                description: scrapedCourse.description,
                instructorId: admin.id,
                isPublished: true,
                price: 0,
            }
        });

        console.log(`Seeded Scraped Course: ${course.title}`);

        // Reset modules for this course
        await prisma.module.deleteMany({ where: { courseId: course.id } });

        for (let i = 0; i < scrapedCourse.modules.length; i++) {
            const mod = scrapedCourse.modules[i];
            await prisma.module.create({
                data: {
                    courseId: course.id,
                    title: mod.title,
                    type: mod.type as any || 'TEXT',
                    content: mod.content,
                    orderIndex: mod.orderIndex || i
                }
            });
        }
        console.log(` > Synced ${scrapedCourse.modules.length} scraped modules for ${course.title}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
