import { PrismaClient, ModuleType } from '@prisma/client';

const prisma = new PrismaClient();

const LINUX_BASH_MD = `
## Module 1: Linux Administration & Advanced Bash Scripting

Linux is the foundational operating system of the cloud. A Cloud Security Architect must possess complete mastery over the Linux file system, permissions, and automation scripting. We are moving far beyond \`ls\` and \`cd\`.

### 1. In-Depth File System Navigation & Permissions
Understanding the Linux hierarchical structure is paramount. 
*   \`/etc\`: Configuration files (e.g., \`/etc/passwd\`, \`/etc/shadow\`).
*   \`/var\`: Variable data, crucially log files (\`/var/log/auth.log\`, \`/var/log/syslog\`).
*   \`/tmp\` & \`/dev/shm\`: World-writable directories often used by attackers to drop payloads.

**Advanced Permissions (SUID/SGID/Sticky Bit):**
Standard \`rwx\` (Read/Write/Execute) permissions are basic. You must understand special permissions.
*   **SUID (Set Owner User ID):** An executable runs with the privileges of the file owner (often root), not the user executing it. Find SUID binaries: \`find / -perm -4000 -type f 2>/dev/null\`
*   **SGID (Set Group ID):** Files created in the directory inherit the group ownership of the directory.
*   **Sticky Bit:** Only the file owner (or root) can delete or rename files in a directory, common on \`/tmp\`.

**Access Control Lists (ACLs):**
Fine-grained control beyond UGO (User/Group/Other). Use \`getfacl\` and \`setfacl\` to assign permissions to specific users or groups independent of the file's primary ownership.

### 2. Powerful CLI text processing
Security auditing heavily relies on text manipulation. You must master these utilities:
*   **\`grep\`, \`egrep\`, \`fgrep\`:** Searching with POSIX and Extended Regular Expressions.
*   **\`awk\`:** A complete programming language designed for text processing and data extraction. 
    *   *Example (Extracting usernames from /etc/passwd):* \`awk -F: '{print $1}' /etc/passwd\`
*   **\`sed\`:** Stream Editor for filtering and transforming text.
    *   *Example (Replacing a string in a file):* \`sed -i 's/old_config/new_config/g' target_file.conf\`

### 3. Advanced Bash Scripting for Automation
Why Bash over Python? Bash is native to every Linux environment. No dependencies required.

**Key Scripting Concepts for Security:**
1.  **Variables & Parameter Expansion:** Manipulating variables without external tools (e.g., \`\${var##*.}\` to get a file extension).
2.  **Conditional Logic (\`if\`, \`case\`):** Handling different states (e.g., *if root, proceed; else exit*).
3.  **Loops (\`for\`, \`while\`, \`until\`):** Essential for tasks like iterating through a list of IP addresses.
4.  **Functions:** Reusing code blocks for modular scripts.
5.  **Job Control & Redirection:** Managing \`stdout\`, \`stderr\`, and running processes in the background (\`&\`, \`nohup\`, \`tmux\`).

**Example: Automated Log Auditor Script Snippet**
\`\`\`bash
#!/bin/bash
# A simple, yet effective script to detect failed SSH logins.
LOG_FILE="/var/log/auth.log"
THRESHOLD=5
IP_LIST=$(grep "Failed password" $LOG_FILE | awk '{print $(NF-3)}' | sort | uniq -c)

while read count ip; do
    if [ "$count" -gt "$THRESHOLD" ]; then
        echo "[WARNING] IP $ip failed to login $count times."
        # Here we could trigger an iptables block:
        # iptables -A INPUT -s $ip -j DROP
    fi
done <<< "$IP_LIST"
\`\`\`

### Module Review & Q&A
**Q: How do you gracefully kill a hung process?**
> A: First use \`kill -15 (SIGTERM)\` to allow the process to clean up. Only if it fails should you escalate to the forceful \`kill -9 (SIGKILL)\`.

**Q: Why should a security architect care about the sticky bit on \`/tmp\`?**
> A: Without the sticky bit, any user could delete another user's files in the shared \`/tmp\` directory, leading to potential denial of service or race condition exploits.
`;

const NETWORK_MD = `
## Module 2: Network Fundamentals, HTTP Analysis & Security

Networks are the arteries of the cloud. A Cloud Security Architect must comprehend how data moves, how IP addressing works, and how to capture and analyze network traffic (especially HTTP) to identify anomalies and attacks.

### 1. The OSI & TCP/IP Models Deep Dive
You must move beyond memorizing the layers and understand how they interact in practice.
*   **Layer 2 (Data Link):** MAC addresses and switches. Attacks include ARP Spoofing/Poisoning (leading to Man-in-the-Middle) and MAC Flooding. Security: Port Security, Dynamic ARP Inspection (DAI).
*   **Layer 3 (Network):** IP addresses and routers. Attacks include IP Spoofing, Route Hijacking. Security: Access Control Lists (ACLs), IPsec.
*   **Layer 4 (Transport):** TCP (Connection-oriented, reliable) vs. UDP (Connectionless, fast). Attacks include SYN Floods (DoS/DDoS), UDP Floods. Security: Stateful Firewalls, SYN Cookies.
*   **Layer 7 (Application):** HTTP, DNS, SMTP. This is where most modern cloud vulnerabilities exist.

### 2. Advanced IP Addressing & Subnetting (IPv4 & IPv6)
Subnetting is critical for isolating cloud resources (e.g., placing databases in private subnets, web servers in public ones).

**IPv4 Subnetting Essentials:**
*   **CIDR Notation (Classless Inter-Domain Routing):** Forget classes (A, B, C). Understand that \`/24\` means 24 network bits and 8 host bits (256 addresses).
*   **Calculating Subnets:** You must quickly determine the Network Address, Broadcast Address, and Usable Host Range.
    *   *Example:* Given \`192.168.10.50 /28\`
        *   Block size = 16.
        *   Network = \`192.168.10.48\`
        *   Broadcast = \`192.168.10.63\`
        *   Usable Range = \`192.168.10.49 - 192.168.10.62\`

**IPv6: The Inevitable Shift**
*   Huge address space (128-bit). No more NAT (Network Address Translation).
*   Understanding structural components: Routing Prefix, Subnet ID, Interface ID.
*   Security implications: Neighbor Discovery Protocol (NDP) replaces ARP, bringing its own set of vulnerabilities (NDP Spoofing).

### 3. HTTP Traffic Analysis (C1A - HTTP Capture File)
The provided \`http.cap\` file represents the core of application-layer analysis. As an architect, you must dissect HTTP requests and responses.

**Anatomy of an HTTP Request:**
1.  **Request Line:** Method (\`GET\`, \`POST\`, \`PUT\`), URI (\`/login\`), Protocol Version (\`HTTP/1.1\`).
2.  **Headers:** Crucial metadata. 
    *   \`Host\`: Defines the target virtual host. (Manipulating this is the basis of Host Header Injection).
    *   \`User-Agent\`: Client software.
    *   \`Cookie\`: Session management.
    *   \`Authorization\`: Used in Basic/Bearer token auth.
3.  **Body (Optional):** Present in \`POST\`/\`PUT\`, contains data like JSON payloads.

**Analyzing PCAP files (Wireshark/tshark):**
You don't just look for plaintext passwords. You look for:
*   **Anomalous Headers:** Hidden internal IPs leaking.
*   **Unexpected Verbs:** \`TRACE\` leading to Cross-Site Tracing (XST).
*   **SQL/XSS Payloads:** Obfuscated strings within URI parameters or JSON bodies.
*   **Status Codes:** 500 Internal Server Error might indicate a successful SQL injection breaking a backend query.

### Module Review & Q&A
**Q: How does a Layer 3 firewall differ from a Layer 7 WAF?**
> A: A L3 firewall filters based on IP addresses and ports (e.g., Block IP x.x.x.x on port 22). A Layer 7 Web Application Firewall (WAF) inspects the HTTP payload itself, blocking requests containing SQL injection strings or malicious JSON.

**Q: In our \`http.cap\` analysis, what indicates a successful login if the credentials are sent via POST?**
> A: While you see the POST request with the credentials, the success is indicated by the server's response. Often, a \`302 Redirect\` to a dashboard page, coupled with the server issuing a \`Set-Cookie\` header containing a session token, signifies authentication success.
`;

const WINDOWS_AD_MD = `
## Module 3: Windows Fundamentals & Active Directory Exploitation

While the cloud runs on Linux, the corporate network—and often the identity providers connecting to the cloud (like Azure AD/Entra ID)—runs on Windows Active Directory (AD). Compromising AD often provides the keys to the entire cloud infrastructure.

### 1. Windows OS Fundamentals for Hackers
*   **The Registry:** The central nervous system of Windows. Attackers modify keys for persistence (e.g., \`Run\` / \`RunOnce\` keys) or to disable security features (Windows Defender).
*   **Services (\`services.msc\`):** Background processes. Exploiting misconfigured services (Unquoted Service Paths, Weak Service Permissions) is a primary path to local privilege escalation (SYSTEM level access).
*   **Processes and Threads:** Understanding how \`lsass.exe\` (Local Security Authority Subsystem Service) operates is critical, as it stores user credentials in memory.

### 2. Active Directory Architecture
Active Directory is a directory service that centralizes network management.
*   **Domain Controllers (DCs):** The servers that run AD Domain Services. They hold the "keys to the kingdom."
*   **NTDS.dit:** The database file on the DC that stores all AD data, including user password hashes (NTLM hashes).
*   **Kerberos & NTLM:** The primary authentication protocols. 
    *   *NTLM:* Challenge-response protocol, vulnerable to Pass-the-Hash and relay attacks.
    *   *Kerberos:* Ticket-based system. Highly secure but complex, leading to devastating misconfiguration vulnerabilities (Ticketing attacks).

### 3. Core AD Exploitation Techniques (The Kill Chain)

The goal of AD exploitation is typically Domain Admin or Enterprise Admin.

**Phase 1: Initial Foothold & Enumeration**
Once you have an initial, low-privileged domain user shell (from phishing or web exploitation):
*   **BloodHound / SharpHound:** The most powerful tool for AD recon. It maps the complex web of user rights and group memberships, finding hidden relational paths to Domain Admin.
*   **PowerView (PowerSploit):** PowerShell scripts for deep AD enumeration without triggering standard alerts.

**Phase 2: Privilege Escalation & Lateral Movement**
*   **Kerberoasting:** Requesting Service Principal Name (SPN) tickets (TGS) for service accounts, then cracking the ticket offline to recover the service account's plaintext password.
*   **AS-REP Roasting:** Targeting users who have "Do not require Kerberos preauthentication" set, requesting their TGT, and cracking it offline.
*   **Pass-the-Hash (PtH):** If you dump an NTLM hash from memory (using Mimikatz), you don't need to crack it. You can inject the hash directly into your session to authenticate as that user.

**Phase 3: Domain Dominance**
*   **DCSync:** Simulating a Domain Controller to request credential replication from the real DC, pulling down the hashes for every user in the domain (including the \`krbtgt\` account).
*   **Golden Ticket:** Creating a forged, indestructible Kerberos Ticket Granting Ticket (TGT) valid for years, granting persistent Domain Admin access even if the Domain Admin changes their password.

### Module Review & Q&A
**Q: Why is extracting the \`krbtgt\` hash the ultimate goal in AD exploitation?**
> A: The \`krbtgt\` (Kerberos Ticket Granting Ticket) account key is used to sign all Kerberos tickets in the domain. If an attacker possesses this hash, they can forge "Golden Tickets," granting themselves permanent administrative access to any resource in the domain, bypassing all standard authentication checks.

**Q: How do you mitigate Pass-the-Hash attacks?**
> A: Implementing LAPS (Local Administrator Password Solution) to ensure local admin passwords are unique and rotated, restricting administrative logons to jump servers, and using Credential Guard (which isolates the LSA secrets using virtualization-based security).
`;


const RECON_CLOUD_MD = `
## Module 4: Advanced Reconnaissance & Cloud Security Architecture

Reconnaissance (Recon) is not just port scanning; it is the comprehensive mapping of an organization's digital footprint. In the cloud era, this footprint is dynamic, ephemeral, and often undocumented.

### 1. Modern External Reconnaissance (The Master Slide)
Your goal is to build a complete inventory of exposed assets.

*   **Subdomain Enumeration (Passive & Active):**
    *   *Passive:* Using OSINT (Certificate Transparency Logs like \`crt.sh\`, Shodan, Censys) to find subdomains without touching the target.
    *   *Active:* Bruteforcing subdomains with \`ffuf\` or \`gobuster\` against custom wordlists, combined with permuted generation (e.g., \`altdns\`).
*   **Cloud Asset Discovery:**
    *   Hunting for exposed S3 Buckets, Azure Blobs, or GCP Buckets. Tools like \`cloud_enum\` or \`Slurp\` check predictable naming patterns based on company names or keywords.
    *   Publicly exposed EBS snapshots or AMIs containing source code or hardcoded credentials.
*   **GitHub/GitLab Recon:**
    *   Developers constantly leak secrets (API keys, AWS credentials) into public repositories. Tools like \`trufflehog\` or \`gitleaks\` automate scanning org repos for high-entropy strings or known token formats.

### 2. Penetration Testing Web Applications & APIs (OWASP Top 10)
Once the attack surface is mapped, we target the applications.

**Key Cloud-Era Web Vulnerabilities:**
*   **Server-Side Request Forgery (SSRF):** The "Cloud Killer." Forcing a backend server to make a request to the internal Cloud Instance Metadata Service (IMDS) (e.g., \`http://169.254.169.254/latest/meta-data/\` in AWS) to retrieve temporary IAM credentials.
*   **Insecure Direct Object Reference (IDOR) / BOLA:** Particularly in APIs. Changing a parameter (e.g., \`/api/users/profile/123\` to \`/api/users/profile/124\`) accessing another user's data without authorization checks.
*   **Broken Authentication/Authorization (JWT Issues):** Exploiting JSON Web Tokens (JWT) used heavily in SPAs/APIs. Techniques include changing the algorithm to "None," brute-forcing weak HMAC secrets, or exploiting key confusion vulnerabilities.

### 3. Cloud Security Architecture Principles
A Cloud Architect designs to prevent the attacks we just learned.

*   **Zero Trust Architecture (ZTA):** "Never trust, always verify." Every user, device, and API call must be authenticated and authorized continuously, regardless of network location. No implicit trust granted to internal networks.
*   **Identity and Access Management (IAM) as the New Perimeter:** The firewall is dying; IAM is the new boundary. Implementing Least Privilege strictly using carefully crafted IAM policies (avoiding \`*\` actions).
*   **Microsegmentation & Security Groups:** Isolating workloads. An application server should only be able to communicate with its specific database, not the entire VPC.
*   **Infrastructure as Code (IaC) Security:** Using Terraform or CloudFormation? Scan it *before* deployment using tools like \`checkov\` or \`tfsec\` to catch misconfigurations (like opening Port 22 to \`0.0.0.0/0\`) in the CI/CD pipeline.

### Module Review & Q&A
**Q: How does an attacker exploit an exposed AWS S3 bucket?**
> A: An attacker can list the contents of the bucket, potentially downloading sensitive customer data or database backups. If the bucket has write permissions, they can overwrite files (e.g., replacing JavaScript files used by a web application to inject malicious code, known as Magecart attacks).

**Q: Contrast a traditional DMZ architecture with a Zero Trust model.**
> A: A traditional DMZ uses firewalls to create a "trusted" internal network and an "untrusted" external network. Once inside the trusted zone, lateral movement is usually easy. Zero Trust assumes the network is already compromised; it requires strong identity verification and granular authorization for *every single request* connecting to *any* resource, essentially creating micro-perimeters around individual assets.
`;

const CAPSTONE_MD = `
## Module 5: Interactive Capstone & Synthesis

You have traversed Linux internals, Network architecture, Windows Active Directory exploitation, and Cloud Security principles. This final module challenges you to synthesize these concepts.

### Capstone Scenario: "Operation Silent Nebula"
You have been hired to perform a "white-box" penetration test on a hybrid-cloud organization, "NebulaCorp."

**The Architecture:**
*   External footprint hosted on AWS (EC2 instances running a Node.js API, S3 for static assets).
*   A Site-to-Site VPN connects the AWS VPC back to an on-premise Windows Active Directory environment, which manages the identities for the AWS SSO setup.

**The Attack Chain Challenge (Review how the pieces fit together):**
1.  **Reconnaissance:** You must first discover the hidden API endpoint handling PDF generation using subdomain enumeration and JavaScript bundle analysis.
2.  **Web Exploitation (SSRF):** The PDF generator is vulnerable to Server-Side Request Forgery. You use this to hit the AWS Instance Metadata Service (IMDS).
3.  **Cloud Exploitation:** The SSRF provides you with the EC2 instance's IAM role temporary credentials. You configure your local AWS CLI with these keys.
4.  **Lateral Movement (Linux to Windows):** You discover the EC2 instance has SSH access to the on-premise network via the VPN. You find cached AD credentials in memory on a bastion host or find an exposed internal \`SMB\` share.
5.  **AD Exploitation (Domain Dominance):** From the compromised internal foothold, you run BloodHound, identify a path to Domain Admin, execute an AS-REP roasting attack to compromise a highly privileged service account, and ultimately execute a DCSync attack to dump the entire NTDS.dit.

### Final Q&A Self-Assessment
**Q: During the SSRF attack against the AWS API, the server returns an error stating "IMDSv2 token required." How does this change your attack strategy?**
> A: IMDSv1 allowed simple GET requests. IMDSv2 requires a \`PUT\` request with a specific HTTP header (\`X-aws-ec2-metadata-token-ttl-seconds\`) to generate a session token, followed by a GET request utilizing that token header. To bypass IMDSv2, the specific SSRF vulnerability must allow for controlling the HTTP method (PUT) and injecting custom HTTP headers, which is significantly harder than a standard GET-based SSRF.

**Q: You have gained Domain Admin on the on-premise Active Directory. How does this impact the Cloud environment (AWS)?**
> A: Because NebulaCorp uses Active Directory to manage identities for AWS SSO (Single Sign-On or SAML Federation), possessing Domain Admin allows you to compromise the accounts of the AWS Administrators or create "Golden SAML" tickets. This grants you complete administrative control over the entire AWS cloud infrastructure, completely breaking the hybrid boundary.
`;


async function main() {
    console.log('Seeding $20 Value Cloud Security Architecture Course...');

    // Find an instructor/admin
    let instructor = await prisma.user.findFirst({
        where: { role: 'INSTRUCTOR' }
    });

    if (!instructor) {
        instructor = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });
    }

    if (!instructor) {
        console.error('No INSTRUCTOR or ADMIN user found. Run standard seeding first, or create an admin.');
        return;
    }

    // 2. Upsert the Massive Course
    const course = await prisma.course.upsert({
        where: { slug: 'cloud-security-architecture-mastery' },
        update: {},
        create: {
            title: 'Cloud Security Architecture & Pentesting Masterclass',
            slug: 'cloud-security-architecture-mastery',
            description: 'A massive, comprehensive, $20-value course covering Linux administration, Network Analysis, Windows AD Exploitation, and Cloud Architectures (Zero Trust). Synthesized from master slides and deep-dive Pdfs.',
            thumbnailUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80',
            price: 20.00,
            isPublished: true,
            instructorId: instructor.id,
            modules: {
                create: [
                    {
                        title: '1. Linux Administration & Advanced Bash Scripting',
                        type: ModuleType.TEXT,
                        content: LINUX_BASH_MD,
                        orderIndex: 0
                    },
                    {
                        title: '2. Network Fundamentals & HTTP Security Analysis',
                        type: ModuleType.TEXT,
                        content: NETWORK_MD,
                        orderIndex: 1
                    },
                    {
                        title: '3. Windows Fundamentals & Active Directory Exploitation',
                        type: ModuleType.TEXT,
                        content: WINDOWS_AD_MD,
                        orderIndex: 2
                    },
                    {
                        title: '4. Advanced Reconnaissance & Cloud Security Architecture',
                        type: ModuleType.TEXT,
                        content: RECON_CLOUD_MD,
                        orderIndex: 3
                    },
                    {
                        title: '5. Capstone Synthesis & Final Evaluation',
                        type: ModuleType.TEXT,
                        content: CAPSTONE_MD,
                        orderIndex: 4
                    }
                ]
            }
        }
    });

    console.log('Successfully injected massive Cloud Security Architecture course: ', course.title);
    console.log('Value: $20.00 | Contains 5 detailed markdown modules based on provided materials.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
