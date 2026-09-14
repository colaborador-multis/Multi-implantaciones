import http.server
import socketserver
import webbrowser
import os

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def start():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}"
        print(f"===============================================================")
        print(f"  DECATHLON - Sistema de Multiimplantaciones y Ventas")
        print(f"  Servidor iniciado con exito en: {url}")
        print(f"  Directorio raiz: {DIRECTORY}")
        print(f"===============================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido.")

if __name__ == "__main__":
    start()
