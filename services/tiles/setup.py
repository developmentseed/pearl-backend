"""Setup titiler."""

from setuptools import find_packages, setup

inst_reqs = [
    "cogeo-mosaic @ git+https://github.com/developmentseed/cogeo-mosaic.git",
    "aiocache[redis]",
    "titiler==0.1.0a14",
    "rasterio~=1.2",
    "ujson",
    "tilebench",
]

extra_reqs = {
    "test": ["pytest", "pytest-cov", "pytest-asyncio", "requests"],
}


setup(
    name="dynamic_tiler",
    version="0.0.1",
    description=u"LULC Dynamic Map Tile Services",
    python_requires=">=3",
    packages=find_packages(exclude=["tests*"]),
    include_package_data=True,
    zip_safe=False,
    install_requires=inst_reqs,
    extras_require=extra_reqs,
)
