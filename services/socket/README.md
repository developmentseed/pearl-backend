<h1 align=center>LULC WebSocket Infrastructure</h1>

<p align=center>WebSocket Infrastructure for the LULC project</p>

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
| `model#retrain`               | Retrain Model & PNG Inference |
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

#### model#retrain

If the AOI is in live mode, the `bounds` and `image` param will be returned,
otherwise only the `total` & `processed` tags will be returned

```json
{
    "message": "model#retrain",
    "data": {
        "name": 'Checkpoint & AOI name',
        "classes": [{
            "name": "Structure",
            "color": "#f76f73",
            "geometry": {
                "type": "GeometryCollection",
                "geometries": [
                    {
                        "type": "MultiPoint",
                        "coordinates": [
                            [-79.376936712501418, 38.834394753436762],
                            [-79.377090146278206, 38.834530999727654]
                        ]
                    },
                    {
                        "type": "Polygon",
                        "coordinates": [
                            [
                            [
                                -79.38049077987671,
                                38.83848752076715
                            ],
                            [
                                -79.37873125076294,
                                38.83848752076715
                            ],
                            [
                                -79.37873125076294,
                                38.8397243269996
                            ],
                            [
                                -79.38049077987671,
                                38.8397243269996
                            ],
                            [
                                -79.38049077987671,
                                38.83848752076715
                            ]
                            ]
                        ]
                    }
                ]
            }
        }]
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
| `connection#extend`   | Reset instance termination counter |
| `model#status`        | Return the current status of the instance |
| `model#abort`         | Abort a currently running prediction |
| `model#checkpoint`    | Load a given checkpoint onto the model |
| `model#prediction`    | Inference a GeoJSON polygon |
| `model#reset`         |       |


#### instance#terminate

```JSON
{
    "action": "instance#terminate"
}
```

#### model#checkpoint

Load a given checkpont onto the model.

Note: The checkpoint must be part of the same project

```JSON
{
    "action": "model#checkpoint",
    "data": {
        "id": 123
    }
}
```

#### model#prediction

Submit a GeoJSON Polygon for inferencing.

```JSON
{
    "action": "model#prediction",
    "name": "Checkpoint/AOI name",
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
