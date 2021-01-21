<h1 align=center>LULC Infrastructure</h1>

<p align=center>GPU Infrastructure for the LULC project</p>

## Infrastructure

![Diagram](./docs/dia.jpeg)

## Development

Initial development can be bootstrapped by running all of the services via docker-compose

```sh
docker-compose up --build -d
```

This script will ensure that you have a postgres database set up, and will configure and
start all necessary services locally for a fully functional dev environment

## API Documentation

API documentation can be found by opening the following location in your web browser

```
file://<path-to-git-repo>/lulc-infra/api/doc/index.html
```

or ideally, once your development environment has been started, API documentation can be found
by navigating to

```
http://localhost:2000/docs
```

### Deploy and CI

Notes on deploy process and CI integration can be found [here](docs/deploy.md).
