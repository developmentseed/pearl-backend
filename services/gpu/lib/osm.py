import json
import re
import logging
import tempfile
import requests
import mercantile
from vt2geojson.tools import vt_bytes_to_geojson
import urllib3
from requests.adapters import HTTPAdapter

from tiletanic import tileschemes

tiler = tileschemes.WebMercator()

LOGGER = logging.getLogger("server")


class OSM:
    def __init__(self, url):
        self.url = url

        self.requests = requests.Session()
        adapter = HTTPAdapter(
            max_retries=urllib3.util.Retry(
                total=10,
                backoff_factor=0.1,
                allowed_methods=False,
                status_forcelist=[429, 500, 502, 503, 504],
            )
        )

        self.requests.mount("https://", adapter)
        self.requests.mount("http://", adapter)

        self.tilejson = self.meta()

        self.cache = False

    def download(self, bounds):
        cache = tempfile.NamedTemporaryFile(delete=False, mode="w")

        tiles = mercantile.tiles(*bounds, 17)

        for tile in tiles:
            geojson = self.tile2geojson(
                self.tile(tile.x, tile.y, tile.z), tile.x, tile.y, tile.z
            )

            for feat in geojson.get("features", []):
                cache.write(json.dumps(feat) + "\n")

        cache.close()

        self.cache = cache.name

        LOGGER.info("ok - Cached OSM " + self.cache)

    def extract(self, cls):
        if self.cache is False:
            raise Exception("OSM#download() must be called to generate cache")

        extract = tempfile.NamedTemporaryFile(delete=False, mode="w")

        includes = cls.get("include", [])
        excludes = cls.get("exclude", [])

        mode = "undetermined"
        if len(includes) > 0 and len(excludes) > 0:
            raise Exception("includes and excludes options are mutually exclusive")
        elif len(includes) > 0:
            mode = "include"
        elif len(excludes) > 0:
            mode = "exclude"

        tags = []
        for ele in cls.get("tagmap", []):
            tags.append({
                "key": ele.get("key", ""),
                "value": re.compile(ele.get("value", ""))
            })

        with open(self.cache) as f:
            if len(tags) == 0:
                LOGGER.info("ok - Empty Layer (no tags): {}: {}".format(cls.get("name"), extract.name))
            else:
                for feat in f.readlines():
                    feat = json.loads(feat)
                    # Filter Here

                    if (
                        feat["geometry"]["type"] != "Polygon"
                        and feat["geometry"]["type"] != "MultiPolygon"
                    ):
                        continue

                    match = False
                    for tag in tags:
                        pvalue = feat["properties"].get(tag["key"])
                        if pvalue is None:
                            continue

                        if not tag["value"].match(pvalue):
                            continue

                        match = True

                    if mode == "include":
                        for i_id in includes:
                            if feat["properties"]["@id"] != i_id:
                                match = False
                    elif mode == "exclude":
                        for e_id in excludes:
                            if feat["properties"]["@id"] == i_id:
                                match = False

                    if match is True:
                        extract.write(json.dumps(feat) + "\n")

        LOGGER.info("ok - Cached {}: {}".format(cls.get("name"), extract.name))

        return extract.name

    def tile2geojson(self, vt, x, y, z):
        return vt_bytes_to_geojson(vt, x, y, z)

    def meta(self):
        LOGGER.info("ok - GET " + self.url)
        r = self.requests.get(self.url)

        r.raise_for_status()

        LOGGER.info("ok - Received " + self.url)

        return r.json()

    def tile(self, x, y, z):
        url = (
            self.tilejson.get("tiles")[0]
            .replace("{z}", str(z))
            .replace("{x}", str(x))
            .replace("{y}", str(y))
        )

        LOGGER.info("ok - GET " + url)
        r = self.requests.get(url)

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)

        return r.content
