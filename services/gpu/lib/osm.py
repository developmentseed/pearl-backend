import json
import tempfile
import requests
from vt2geojson.tools import vt_bytes_to_geojson
import urllib3
from requests.adapters import HTTPAdapter

from tiletanic import tileschemes
tiler = tileschemes.WebMercator()

LOGGER = logging.getLogger("server")

class OSM:
    def __init__(self, url):
        self.url = url;

        self.requests = requests.Session()
        adapter = HTTPAdapter(
            max_retries=urllib3.util.Retry(
                total=10,
                backoff_factor=0.1,
                allowed_methods=False,
                status_forcelist=[429, 500, 502, 503, 504]
            )
        )

        self.requests.mount('https://', adapter)
        self.requests.mount('http://', adapter)

        self.tilejson = self.meta()

    def download(self, bounds):
        f = tempfile.NamedTemporaryFile(delete=False)

        tiles = mercantile.tiles(*bounds, 17)
        for tile in tiles:
            geojson = self.tile2geojson(self.tile(tile.x, tile.y, tilx.z), tile.x, tile.y, tile.z)

            for (feat in geojson):
                f.write(json.dumps(feat) + '\n')

        f.close()

        return f.name

    def tile2geojson(self, vt, x, y, z):
        return vt_bytes_to_geojson(vt, x, y, z)


    def meta(self):
        LOGGER.info("ok - GET " + self.url)
        r = self.requests.get(self.url)

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)

        return r.json();

    def tile(self, x, y, z):
        url = self.tilejson.get('tiles')[0].replace('{z}', str(z)).replace('{x}', str(x)).replace('{y}', str(y))


        LOGGER.info("ok - GET " + url)
        r = self.requests.get(url)

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)

        return r.content

