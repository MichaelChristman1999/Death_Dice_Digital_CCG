#!/usr/bin/env python3
"""Development server with no-cache headers so edits are always picked up."""
from functools import partial
import http.server
import socketserver
from pathlib import Path

PORT = 5500
MAX_PORT = 5510
HOST = '127.0.0.1'
ROOT = Path(__file__).resolve().parent

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

Handler = partial(NoCacheHandler, directory=str(ROOT))

def main():
    last_error = None

    for port in range(PORT, MAX_PORT + 1):
        try:
            httpd = ThreadingServer((HOST, port), Handler)
        except OSError as exc:
            last_error = exc
            print(f'Port {port} unavailable; trying next port...', flush=True)
            continue

        with httpd:
            if port != PORT:
                print(f'Port {PORT} was blocked, so the server switched ports.', flush=True)
            print(f'Serving {ROOT} on http://localhost:{port}', flush=True)
            httpd.serve_forever()
            return

    raise SystemExit(
        f'Could not start the server on ports {PORT}-{MAX_PORT}. Last error: {last_error}'
    )

if __name__ == '__main__':
    main()
