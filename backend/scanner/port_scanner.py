import socket
from urllib.parse import urlparse

def scan_ports(url):
    issues = []
    parsed = urlparse(url)
    host = parsed.hostname

    common_ports = [21, 22, 3306]

    for port in common_ports:
        try:
            sock = socket.socket()
            sock.settimeout(1)
            result = sock.connect_ex((host, port))
            sock.close()

            if result == 0:
                issues.append({
                    "name": f"Port {port} Open",
                    "severity": "High",
                    "category": "Port Exposure"
                })
        except:
            continue

    return issues
