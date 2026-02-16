def map_attack(issue_name):
    attack_map = {
        "HTTPS Not Enabled": "Man-in-the-Middle (MITM)",
        "Missing CSP Header": "Cross-Site Scripting (XSS)",
        "Missing HSTS Header": "SSL Strip Attack",
        "Missing X-Frame-Options": "Clickjacking",
        "Missing X-Content-Type-Options": "MIME Sniffing Attack",
        "Server Header Exposed": "Reconnaissance & Fingerprinting",
        "Port 21 Open": "FTP Brute Force Attack",
        "Port 22 Open": "SSH Brute Force Attack",
        "Port 3306 Open": "Database Intrusion",
        "SSL Certificate Expired": "Spoofing / MITM Risk",
        "SSL Certificate Validation Failed": "Certificate Forgery Risk",
    }

    for key in attack_map:
        if key in issue_name:
            return attack_map[key]

    return "Unknown Attack Vector"


def calculate_risk(issues):
    score = 0

    severity_weights = {
        "Low": 5,
        "Medium": 15,
        "High": 25,
        "Critical": 40
    }

    attack_summary = []

    for issue in issues:
        score += severity_weights.get(issue["severity"], 0)
        attack_type = map_attack(issue["name"])
        issue["attack_type"] = attack_type
        attack_summary.append(attack_type)

    attack_summary = list(set(attack_summary))

    if score < 30:
        level = "Low"
    elif score < 60:
        level = "Medium"
    else:
        level = "High"

    return score, level, attack_summary
