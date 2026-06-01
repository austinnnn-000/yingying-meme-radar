from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import URLError
from urllib.request import Request, urlopen
import json
import os
import sys


PORT = int(os.environ.get("PORT") or (sys.argv[1] if len(sys.argv) > 1 else 4175))


def fetch_json(url):
    request = Request(url, headers={"User-Agent": "YingyingMemeRadar/0.1"})
    with urlopen(request, timeout=12) as response:
        return json.loads(response.read().decode("utf-8"))


class Handler(SimpleHTTPRequestHandler):
    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.startswith("/api/market"):
            queries = ["solana meme", "base meme", "pepe"]
            try:
                pairs = []
                for query in queries:
                    url = "https://api.dexscreener.com/latest/dex/search?q=" + query.replace(" ", "%20")
                    pairs.extend(fetch_json(url).get("pairs") or [])
                self.send_json({"pairs": pairs[:36]})
            except (URLError, TimeoutError, ValueError) as exc:
                self.send_json({"error": str(exc), "pairs": []}, status=502)
            return

        if self.path.startswith("/api/news"):
            try:
                payload = fetch_json("https://min-api.cryptocompare.com/data/v2/news/?lang=EN")
                self.send_json(payload)
            except (URLError, TimeoutError, ValueError) as exc:
                self.send_json({"error": str(exc), "Data": []}, status=502)
            return

        return super().do_GET()


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"嘤嘤雷达运行中：http://127.0.0.1:{PORT}/index.html")
    server.serve_forever()
