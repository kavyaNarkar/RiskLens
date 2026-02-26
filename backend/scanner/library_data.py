from typing import List

VULNERABILITY_LIBRARY = [
    {
        "id": "https-not-enabled",
        "name": "HTTPS Not Enabled",
        "category": "Transport Security",
        "severity": "Critical",
        "description": "The target website is serving content over unencrypted HTTP (Port 80) instead of secure HTTPS (Port 443).",
        "impact": "All data sent between the user and the server is transmitted in plain text. Attackers can easily intercept passwords, session tokens, and personal data using Man-In-The-Middle (MITM) attacks.",
        "remediation": "Obtain an SSL/TLS certificate from a Certificate Authority (like Let's Encrypt), install it on your web server, and configure a strict 301 redirect from HTTP to HTTPS."
    },
    {
        "id": "missing-csp",
        "name": "Missing CSP Header",
        "category": "Header Security",
        "severity": "High",
        "description": "The Content-Security-Policy (CSP) HTTP response header is missing.",
        "impact": "Without a CSP, the browser has no instructions restricting which scripts can be executed or where resources can be loaded from. This drastically increases the success rate of Cross-Site Scripting (XSS) and data injection attacks.",
        "remediation": "Implement a restrictive CSP that explicitly whitelists trusted domains for executing scripts, loading styles, and submitting forms."
    },
    {
        "id": "missing-hsts",
        "name": "Missing HSTS Header",
        "category": "Header Security",
        "severity": "High",
        "description": "The Strict-Transport-Security (HSTS) header is missing from the server's response.",
        "impact": "Even if HTTPS is enabled, browsers might still attempt an initial HTTP connection before being redirected. This transition window can be exploited via SSL Stripping to downgrade the connection to plain text.",
        "remediation": "Add the Strict-Transport-Security header (e.g., `Strict-Transport-Security: max-age=31536000; includeSubDomains`) so browsers automatically enforce HTTPS before interacting with the server."
    },
    {
        "id": "missing-x-frame-options",
        "name": "Missing X-Frame-Options",
        "category": "Header Security",
        "severity": "Medium",
        "description": "The X-Frame-Options header is absent, allowing the site to be embedded in an <iframe> on other domains.",
        "impact": "An attacker can embed your site within an invisible iframe on a malicious webpage. They can then trick a victim into clicking on items on your site without their knowledge (Clickjacking), potentially leading to unauthorized actions.",
        "remediation": "Set the `X-Frame-Options` header to either `DENY` or `SAMEORIGIN`."
    },
    {
        "id": "missing-x-content-type",
        "name": "Missing X-Content-Type-Options",
        "category": "Header Security",
        "severity": "Low",
        "description": "The X-Content-Type-Options header is missing.",
        "impact": "Browsers may attempt to 'sniff' the MIME type of a response and execute it as a different file type than intended. For example, a disguised image file containing malicious JavaScript could be executed.",
        "remediation": "Set `X-Content-Type-Options: nosniff` on all responses."
    },
    {
        "id": "server-header-exposed",
        "name": "Server Header Exposed",
        "category": "Information Exposure",
        "severity": "Low",
        "description": "The server includes specific version information (e.g., Apache/2.4.41 or nginx/1.18.0) in its HTTP headers.",
        "impact": "While not a direct vulnerability, exposing specific version numbers greatly assists attackers during the reconnaissance phase. They can easily search for known exploits targeting your exact server version.",
        "remediation": "Configure your web server (e.g., `server_tokens off` in Nginx, `ServerSignature Off` and `ServerTokens Prod` in Apache) to suppress version output."
    },
    {
        "id": "port-21-open",
        "name": "Port 21 Open (FTP)",
        "category": "Port Exposure",
        "severity": "High",
        "description": "File Transfer Protocol (FTP) over port 21 is exposed and actively responding.",
        "impact": "Standard FTP transmits credentials and files in cleartext formats. It is highly susceptible to brute-force attacks and network sniffing. Root or anonymous access can lead to total server compromise.",
        "remediation": "Close port 21. If file transfer is required, strictly utilize SFTP (SSH File Transfer Protocol) or FTPS with explicit TLS."
    },
    {
        "id": "port-22-open",
        "name": "Port 22 Open (SSH)",
        "category": "Port Exposure",
        "severity": "Medium",
        "description": "Secure Shell (SSH) is accessible from the public internet.",
        "impact": "An exposed SSH port invites constant automated brute-force attacks. If weak passwords are used, unauthorized individuals may gain remote shell access to the host machine.",
        "remediation": "Restrict SSH access via a firewall (UFW/iptables) to VPN IP ranges or specific whitelisted addresses. Disable password authentication entirely in favor of cryptographic keys."
    },
    {
        "id": "port-3306-open",
        "name": "Port 3306 Open (MySQL)",
        "category": "Port Exposure",
        "severity": "Critical",
        "description": "The default port for MySQL databases is exposed to the public internet.",
        "impact": "Exposing a database port externally allows attackers to directly attempt SQL Injection, credential stuffing, and brute force attacks to compromise backend data systems.",
        "remediation": "Bind the database listener strictly to internal loopback `127.0.0.1` or restrict the port block at the firewall level entirely to authorized internal network segments."
    },
    {
        "id": "ssl-cert-expired",
        "name": "SSL Certificate Expired",
        "category": "SSL/TLS",
        "severity": "Critical",
        "description": "The target's X.509 SSL/TLS certificate has passed its validity window and has expired.",
        "impact": "Browsers will actively block users from visiting the site with privacy warnings. Encrypted communication is no longer guaranteed trusted, severely damaging reputation and enabling MITM attacks.",
        "remediation": "Generate a new CSR, request an updated certificate from your issuing authority, and install it on the load balancer or web server."
    },
    {
        "id": "ssl-cert-expires-soon",
        "name": "SSL Certificate Expires Soon",
        "category": "SSL/TLS",
        "severity": "High",
        "description": "The current SSL certificate is slated to expire within the next 30 days.",
        "impact": "Failure to renew the certificate before expiration will cause browsers to throw security warnings, breaking website trust, APIs, and overall system availability.",
        "remediation": "Begin the renewal process immediately. If possible, utilize automated provisioning solutions like Certbot to handle recurring renewals prior to expiry."
    },
    {
        "id": "domain-expired",
        "name": "Domain Expired",
        "category": "Availability Risk",
        "severity": "Critical",
        "description": "The primary domain name registration has lapsed.",
        "impact": "The website will become inaccessible as DNS records fail. Worse, if the grace period expires, malicious actors can purchase the domain and execute a complete brand takeover, intercepting emails and web traffic permanently.",
        "remediation": "Log in to the domain registrar immediately and pay the registration renewal fee."
    },
    {
        "id": "domain-expires-soon",
        "name": "Domain Expires Soon",
        "category": "Availability Risk",
        "severity": "High",
        "description": "The domain registration is scheduled to expire in less than 30 days.",
        "impact": "An expiring domain threatens critical business infrastructure latency and ownership loss if forgotten.",
        "remediation": "Renew the domain lease at your registrar and strongly recommend turning on 'Auto-Renew' billing."
    }
]

def get_vulnerability_library() -> List[dict]:
    return VULNERABILITY_LIBRARY
