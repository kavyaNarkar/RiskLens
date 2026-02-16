import requests

def analyze_headers(url):
    issues = []

    try:
        response = requests.get(url, timeout=5)
        headers = response.headers

        if "Content-Security-Policy" not in headers:
            issues.append({
                "name": "Missing CSP Header",
                "severity": "High",
                "category": "Header Security"
            })

        if "Strict-Transport-Security" not in headers:
            issues.append({
                "name": "Missing HSTS Header",
                "severity": "Medium",
                "category": "Transport Security"
            })

        if "X-Frame-Options" not in headers:
            issues.append({
                "name": "Missing X-Frame-Options",
                "severity": "Medium",
                "category": "Header Security"
            })

        if "X-Content-Type-Options" not in headers:
            issues.append({
                "name": "Missing X-Content-Type-Options",
                "severity": "Medium",
                "category": "Header Security"
            })

        if "Server" in headers:
            issues.append({
                "name": "Server Header Exposed",
                "severity": "Low",
                "category": "Information Exposure"
            })

    except requests.exceptions.RequestException:
        issues.append({
            "name": "Failed to Fetch Website Response",
            "severity": "Critical",
            "category": "Connection"
        })

    return issues
