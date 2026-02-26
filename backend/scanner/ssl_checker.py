import ssl
import socket
from urllib.parse import urlparse
from datetime import datetime

def check_ssl(url):
    issues = []

    if not url.startswith("https://"):
        issues.append({
            "name": "HTTPS Not Enabled",
            "severity": "High",
            "category": "Transport Security"
        })
        return issues

    try:
        hostname = urlparse(url).hostname
        context = ssl.create_default_context()

        with context.wrap_socket(socket.socket(), server_hostname=hostname) as s:
            s.settimeout(3)
            s.connect((hostname, 443))
            cert = s.getpeercert()

            expiry_date = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
            
            delta = expiry_date - datetime.utcnow()
            days_left = delta.days

            if days_left < 0:
                issues.append({
                    "name": "SSL Certificate Expired",
                    "severity": "Critical",
                    "category": "SSL/TLS"
                })
            elif days_left < 30:
                issues.append({
                    "name": f"SSL Certificate Expires Soon ({days_left} days)",
                    "severity": "High",
                    "category": "SSL/TLS"
                })

    except:
        issues.append({
            "name": "SSL Certificate Validation Failed",
            "severity": "Medium",
            "category": "SSL/TLS"
        })

    return issues
