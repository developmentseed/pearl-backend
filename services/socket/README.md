<h1 align=center>LULC GPU Infrastructure</h1>

<p align=center>GPU Infrastructure for the LULC project</p>

## Deployment

### Environment Variables

#### `SigningSecret`

The `SigningSecret` environment variable must be the same value as that of the api server.
Documentation on this variable exists in the [API README](/services/api/README.md#signingsecret)

## API

The connection URL is supplied to the user upon a successful response from the instance API.

```
POST /instance

{
    "url": "<url here>",
    "token": "<token here>"
}
```

Once a new instance has been created, a new socket can be created using the supplied URL and
authentication token. The connection url should be created in the following format:

```
<url>?token=<token>
```

The websocket will then validate the instance token and accept or deny the connection.

### Message Format

There are two styles of message formats that can be delivered or received by the router.

The first is an `action` message. It is sent from the client => GPU or the GPU => client
when an action is expected to be performed by the recipient.

```json
{
    "action": "<category>#<optional action>",
    "data": {}
}
```

The second is the `message` type. It is sent from the client => GPU or the GPU => client
either in response to an action  (ie returning requested data) or generally during the
course of a session as informational messages

```json
{
    "message": "<category>#<optional action>",
    "data": {}
}
```

### Supported Messages

| Message                       | Notes |
| ----------------------------- | ----- |
| `info#connection`             |       |
| `info#disconnection`          |       |
| `model#prediction`            | PNG Inference |
| `error`                       |       |

#### error

```json
{
    "message": "error",
    "data": {
        "error": "Short, user safe error message",
        "detailed": "More detailed debug message as to what is happening"
    }
}
```

#### model#prediction

If the AOI is in live mode, the `bounds` and `image` param will be returned,
otherwise only the `total` & `processed` tags will be returned

```json
{
    "message": "model#prediction",
    "data": {
        "bounds": [ 1, 1, 1, 1]
        "image": "<base64 encoded png>",
        "total": 123,
        "processed": 23
    }
}
```

#### model#prediction#progress

```json
{
    "message": "model#prediction",
    "data": {
        "total": 123,
        "processed": 5
    }
}
```

#### info#connection

```json
{
    "message": "info#connection",
}
```

#### info#disconnection

```json
{
    "message": "info#disconnection",
}
```

### Supported Actions

| Action                | Notes |
| --------------------- | ----- |
| `instance#terminate`  |       |
| `model#prediction`    | Inference a GeoJSON polygon |
| `model#checkpoint`    | Save a checkpoint to the Db |
| `model#reset`         |       |
| `model#undo`          |       |


#### instance#terminate

```JSON
{
    "action": "instance#terminate"
}
```

#### model#checkpoint

```JSON
{
    "action": "model#checkpoint"
}
```

#### model#prediction

Submit a GeoJSON Polygon for inferencing.

```JSON
{
    "action": "model#prediction",
    "data": {
        "polygon": {
            "type": "Polygon",
            "coordinates": []
        }
    }
}
```

#### model#reset

```JSON
{
    "action": "model#reset"
}
```

#### model#undo

```JSON
{
    "action": "model#reset"
}
```
