"""Setup titiler."""

from setuptools import find_packages, setup

inst_reqs = [
    "titiler.core==0.3.1",
    "titiler.mosaic==0.3.1",
    "titiler.application==0.3.1",
    "rio-tiler>=2.0.6,<2.1",
    "aiocache[redis]",
    "ujson",
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
