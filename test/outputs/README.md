## Output Schema Format

The output schemas defined in this directory can be used by the `Output` helper class to
make websocket flow testing less of a pain.

This is a very light custom schema around comparing against static JSON fixtures, or JSON Schemas

### Top Level

| Key    | Notes |
| ------ | ----- |
| `data` | **Required** Array containing schema objects |

```json
{
    "data": []
}
```

### Schema Objects

| Key       | Notes |
| --------- | ----- |
| `type`    | **Required** String of `static` or `schema` |
| `data`    | **Required** Static JSON  or JSON Schema to be compared against |
| `items`   | How many times should this fixture be expected  before moving on (default 1) |
