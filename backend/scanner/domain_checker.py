import whois
from datetime import datetime
from urllib.parse import urlparse

def check_domain_expiry(url):
    issues = []
    
    try:
        hostname = urlparse(url).hostname
        if not hostname:
            hostname = url
            
        domain_info = whois.whois(hostname)
        
        expiration_date = domain_info.expiration_date
        
        if expiration_date:
            if isinstance(expiration_date, list):
                expiration_date = expiration_date[0]
                
            delta = expiration_date - datetime.utcnow()
            days_left = delta.days
            
            if days_left < 0:
                issues.append({
                    "name": "Domain Expired",
                    "severity": "Critical",
                    "category": "Availability Risk"
                })
            elif days_left < 30:
                issues.append({
                    "name": f"Domain Expires Soon ({days_left} days)",
                    "severity": "High",
                    "category": "Availability Risk"
                })
    except Exception as e:
        # If whois fails (e.g., rate limited or unsupported TLD), we just don't flag anything
        print(f"WHOIS lookup failed for {url}: {e}")
        pass

    return issues
