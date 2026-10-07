#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Servidor estático de desenvolvimento do FGAero Land 2000.

Serve a raiz do projeto com os tipos MIME corretos (incluindo .cur, que o
mimetypes do Python não conhece) e cache desativado — ideal para testar o
cursor personalizado e as páginas durante o desenvolvimento.

    python3 tools/servidor.py [porta]
"""
import http.server, socketserver, sys, os, functools

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORTA = int(sys.argv[1]) if len(sys.argv) > 1 else 8080


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".cur": "image/x-icon",
        ".ico": "image/x-icon",
        ".json": "application/json; charset=utf-8",
        ".webmanifest": "application/manifest+json",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".html": "text/html; charset=utf-8",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_message(self, formato, *args):
        sys.stderr.write("  %s\n" % (formato % args))


class Servidor(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    handler = functools.partial(Handler, directory=RAIZ)
    with Servidor(("0.0.0.0", PORTA), handler) as httpd:
        print(f"FGAero Land 2000 servido em http://0.0.0.0:{PORTA} (raiz: {RAIZ})", flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nencerrado")
