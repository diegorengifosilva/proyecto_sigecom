import re

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
            
        # Add modern CSP frame-ancestors to explicitly allow framing from localhost / same origin
        response['Content-Security-Policy'] = "frame-ancestors 'self' http://localhost:* http://127.0.0.1:*"
        
        return response
