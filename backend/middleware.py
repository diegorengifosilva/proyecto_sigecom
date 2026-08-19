import re
from urllib.parse import urlparse

class DisableXFrameOptionsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Normalize double slashes in request path_info to make URL routing robust
        if '//' in request.path_info:
            request.path_info = re.sub(r'/+', '/', request.path_info)
            
        response = self.get_response(request)
        
        # Remove X-Frame-Options to allow framing in legacy browsers
        if 'X-Frame-Options' in response:
            del response['X-Frame-Options']
            
        # Add modern CSP frame-ancestors dynamically based on referer, origin and request host
        allowed_origins = ["'self'", "http://localhost:*", "http://127.0.0.1:*"]
        
        # 1. Check HTTP referer
        referer = request.META.get('HTTP_REFERER')
        if referer:
            try:
                parsed = urlparse(referer)
                if parsed.scheme and parsed.netloc:
                    allowed_origins.append(f"{parsed.scheme}://{parsed.netloc}")
            except Exception:
                pass

        # 2. Check HTTP origin header
        origin_header = request.META.get('HTTP_ORIGIN')
        if origin_header and origin_header not in allowed_origins:
            allowed_origins.append(origin_header)

        # 3. Allow same host domain/IP with any port (to allow frontend-backend port mismatch)
        try:
            own_host = request.get_host()
            if own_host:
                host_name = own_host.split(':')[0]
                allowed_origins.append(f"http://{host_name}:*")
                allowed_origins.append(f"https://{host_name}:*")
        except Exception:
            pass

        # Join unique origins
        unique_origins = []
        for orig in allowed_origins:
            if orig not in unique_origins:
                unique_origins.append(orig)

        response['Content-Security-Policy'] = f"frame-ancestors {' '.join(unique_origins)}"
        
        return response
