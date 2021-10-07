import requests
from vt2geojson.tools import vt_bytes_to_geojson
import urllib3
from requests.adapters import HTTPAdapter

from tiletanic import tileschemes
tiler = tileschemes.WebMercator()

LOGGER = logging.getLogger("server")

class OSM:
    def __init__(self):
        self.url = ''

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

    def tile(self, x, y, z):
        url = self.url + "/api"

        LOGGER.info("ok - GET " + url)
        r = self.requests.get(ur)

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)

        return vt_bytes_to_geojson(r.content, x, y, z)

