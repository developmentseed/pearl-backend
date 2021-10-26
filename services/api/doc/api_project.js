define({
  "name": "Microsoft LULC API",
  "title": "Microsoft LULC API",
  "header": {
    "title": "Authentication",
    "content": "<h2>Authentication</h2>\n<h3>UI Flow</h3>\n<p>Initial authentication must always first be performed with a successful POST to the <code>/login</code> endpoint.</p>\n<h3>Programatic Flow</h3>\n<p>Once a token has been generated via the tokens endpoint, scripted calls to the API can be made by using the\nauth header. This header must be included with all calls to the API.</p>\n<p>Note: Basic authentication is not supported by any API endpoint. A valid API token must generated for programatic access</p>\n<p><em>Example</em></p>\n<pre class=\"prettyprint\">Authorization: Bearer <api token>\n</code></pre>\n"
  },
  "version": "1.0.0",
  "description": "",
  "sampleUrl": false,
  "defaultVersion": "0.0.0",
  "apidoc": "0.3.0",
  "generator": {
    "name": "apidoc",
    "time": "2021-10-26T15:16:41.042Z",
    "url": "https://apidocjs.com",
    "version": "0.29.0"
  }
});
