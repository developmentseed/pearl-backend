## Authentication

### UI Flow

Initial authentication must always first be performed with a successful POST to the `/login` endpoint.

### Programatic Flow

Once a token has been generated via the tokens endpoint, scripted calls to the API can be made by using the
auth header. This header must be included with all calls to the API.

Note: Basic authentication is not supported by any API endpoint. A valid API token must generated for programatic access

_Example_
```
Authorization: Bearer <api token>
```
