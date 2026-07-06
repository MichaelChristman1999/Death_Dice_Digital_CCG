#!/usr/bin/env python3
"""Development server with no-cache headers so edits are always picked up."""
import http.server
import socketserver

PORT = 5501  # V2 runs alongside V1 (5500)

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # suppress access logs


# Threaded so concurrent asset requests (and the live-preview browser's keep-alive
# connections) don't block each other — a single-threaded server stalls on these.
class ThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

with ThreadingServer(('', PORT), NoCacheHandler) as httpd:
    print(f'Serving on http://localhost:{PORT}')
    httpd.serve_forever()
