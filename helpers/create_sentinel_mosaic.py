import httpx

# Search against the Planetary Computer STAC API
endpoint = "https://planetarycomputer.microsoft.com"

# Define your temporal range
daterange = {"interval": ["2022-01-12T10:25:31Z", "2023-01-30T23:59:59Z"]}

# ##### Register Search query
search_request = {
    "filter": {
        "op": "and",
        "args": [
            {"op": "anyinteracts", "args": [{"property": "datetime"}, daterange]},
            {"op": "=", "args": [{"property": "collection"}, "sentinel-2-l2a"]},
            {"op": "<=", "args": [{"property": "eo:cloud_cover"}, 50]},
            {"op": "<=", "args": [{"property": "s2:snow_ice_percentage"}, 50]},
        ],
    },
    "filter-lang": "cql2-json",
}

response = httpx.post(
    f"{endpoint}/api/data/v1/mosaic/register",
    json=search_request,
).json()
searchid = response["searchid"]
print('searchid', searchid)
