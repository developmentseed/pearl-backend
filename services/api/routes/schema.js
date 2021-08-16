'use strict';

const Err = require('../lib/error');

async function router(schema) {
    /**
     * @api {get} /api/schema List Schemas
     * @apiVersion 1.0.0
     * @apiName ListSchemas
     * @apiGroup Schemas
     * @apiPermission public
     *
     * @apiDescription
     *     List all JSON Schemas in use
     *     With no parameters this API will return a list of all the endpoints that have a form of schema validation
     *     If the url/method params are used, the schemas themselves are returned
     *
     *     Note: If url or method params are used, they must be used together
     *
     * @apiSchema (Query) {jsonschema=../schema/req.query.ListSchema.json} apiParam
     * @apiSchema {jsonschema=../schema/res.ListSchema.json} apiSuccess
     */
    await schema.get('/schema', {
        query: 'req.query.ListSchema.json',
        body: 'res.ListSchema.json'
    }, async (req, res) => {
        try {
            if (req.query.url && req.query.method) {
                res.json(schema.query(req.query.method, req.query.url));
            } else if (req.query.url || req.query.method) {
                throw new Err(400, null, 'url & method params must be used together');
            } else {
                return res.json(schema.list());
            }
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}

module.exports = router;
