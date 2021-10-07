import requests
from vt2geojson.tools import vt_bytes_to_geojson
import urllib3
from requests.adapters import HTTPAdapter

from tiletanic import tileschemes
tiler = tileschemes.WebMercator()

LOGGER = logging.getLogger("server")

class OSM:
    def __init__(self):
        self.url = 'https://qa-tiles-server-dev.ds.io/services/z17'

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

    def meta(self):
        LOGGER.info("ok - GET " + self.url)
        r = self.requests.get(self.url)

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)

        return r.json();

    def tile(self, x, y):
        url = self.tilejson.get('tiles')[0].replace('{z}', str(17)).replace('{x}', str(x)).replace('{y}', str(y))


        LOGGER.info("ok - GET " + url)
        r = self.requests.get(url)

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)

        return vt_bytes_to_geojson(r.content, x, y, z)

