<h1 align=center>LULC GPU Infrastructure</h1>

<p align=center>GPU Infrastructure for the LULC project</p>

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

```json
{
    "action": "<category>:<action>",
    "data": {}
}
```

### Supported Actions

| Action | Notes |
| ------ | ----- |
| 'auth:init' |       |
| 'auth:extend'  |       |
