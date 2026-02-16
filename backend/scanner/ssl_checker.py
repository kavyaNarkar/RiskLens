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

            if expiry_date < datetime.utcnow():
                issues.append({
                    "name": "SSL Certificate Expired",
                    "severity": "Critical",
                    "category": "Transport Security"
                })

    except:
        issues.append({
            "name": "SSL Certificate Validation Failed",
            "severity": "Medium",
            "category": "Transport Security"
        })

    return issues
