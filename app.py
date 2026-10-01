from flask import Flask, render_template, send_from_directory, Response, request

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")




@app.route("/robots.txt")
def robots():
    base_url = request_base_url()
    body = (
        "User-agent: *\\n"
        "Allow: /\\n"
        "Disallow: /static/\\n"
        f"Sitemap: {base_url}/sitemap.xml\\n"
    )
    return Response(body, mimetype="text/plain")


@app.route("/sitemap.xml")
def sitemap():
    base_url = request_base_url()
    body = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>{base_url}/</loc>
  </url>
</urlset>"""
    return Response(body, mimetype="application/xml")


def request_base_url():
    from flask import request
    return request.url_root.rstrip("/")


@app.route("/manifest.webmanifest")
def manifest():
    return send_from_directory(
        app.static_folder,
        "manifest.webmanifest",
        mimetype="application/manifest+json",
    )


@app.route("/sw.js")
def service_worker():
    response = send_from_directory(
        app.static_folder,
        "sw.js",
        mimetype="application/javascript",
    )
    response.headers["Cache-Control"] = "no-cache"
    return response


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False
    )