<h1 align=center>LULC API Infrastructure</h1>

<p align=center>API Infrastructure for the LULC project</p>

The API portion of the LULC project handles authentication and stateful data
that exists in the database.

## Development

To setup a development environment for the API it is recommended to run the ExpressJS server outside Docker, with the remaining parts of the stack in containers. You can start them with Docker Compose from the repository root directory:

```sh
docker-compose up --build postgis socket tiler cache
```

Make sure you are running the required Node.js version included in [.nvmrc](.nvmrc) or activate it with [nvm](https://github.com/nvm-sh/nvm):

```sh
nvm i
```

Start the development server:

```sh
npm run dev
```

The API will be available at http://localhost:2000 and restart on every change.

## API Documentation

It is generally recommended to run the bootstrap scripts described in the main project README

If it is deisred to generate documentation direction, use the following command

```sh
npm run doc
```

See the main README for how to view API documentation once generated

## Deployment

### Azure Resources

#### Blob Storage

A basic blob storage resource must be created with the following containers:

| Container | Notes |
| --------- | ----- |
| `models`  | Storage of raw base model data |

Notes:

- Each storage container can be set to `Private` as the `AZURE_STORAGE_CONNECTION_STRING` envronment
variable will be used to connect.

### Environment Variables

In development mode it is easier to add a `.env` to this folder to set environment variables, as the server loads them using [dotenv](https://www.npmjs.com/package/dotenv) module.

#### Authentication with Auth0

Create an API in Auth0 and set the following environment variables:

- AUTH0_ISSUER_BASE_URL
- AUTH0_CLIENT_ID
- AUTH0_AUDIENCE

#### `AZURE_STORAGE_CONNECTION_STRING` [optionalish]

Required in order to upload & save base models. If the `AZURE_STORAGE_CONNECTION_STRING` env var
is not set, API endpoints that utilize this functionality are simply disabled.

#### `SigningSecret` [required: prod]

A string value that is used to securely sign session cookies, API Tokens, and Instance Sessions

Not required in a dev environment, an insecure default is provided.

#### `Postgres` [optional]

The postgres connection string required to connect to the lulc database, provided in the following format

_Formatted Value:_
```
postgres://<user>@<ip|host>:<port>/<db name>
```

_Default Value:_
```
postgres://postgres@localhost:5432/lulc
```

#### `Port` [optional]

Optionally sets a non-default port. All infrastructure is set to use the 2000 as the default port.

## API

All JSON paths can be found in the `./index.js` file in this directory. Each
path must have an [APIDoc](https://apidocjs.com/) section.

Paths that accept user data are also required to have a [json schema](https://json-schema.org/)
to enforce validity. This JSON schema can also be used to help automatically
generate API Docs. JSON schemas can all be found in the `./schema` directory

```js
/**
 * @api {post} /api/login Create Session
 * @apiVersion 1.0.0
 * @apiName login
 * @apiGroup Login
 * @apiPermission user
 *
 * @apiDescription
 *     Log a user into the service and create an authenticated cookie
 *
 * @apiSchema (Body) {jsonschema=./schema/login.json} apiParam
 */
router.post(
    '/login',
    validate({ body: require('./schema/login.json') }),
    async (req, res) => {
        // business login
    }
);
```

## Database

![database diagram](./doc/db.png)
