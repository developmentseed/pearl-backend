'use strict';

const { validationResult } = require('express-validator');

class PublicError {
    constructor(status, err, safe, print = true) {
        if (print && status !== 400) console.error(err ? err : 'Error: ' + safe);

        this.status = status;
        this.err = err;
        this.safe = safe;
    }

    static validate(req, res)  {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            PublicError.respond(
                new PublicError(400, null, 'validation error'),
                res,
                errors.array()
            );

            return true;
        }
    }

    static respond(err, res, locs = []) {
        if (err instanceof PublicError) {

            res.status(err.status).json({
                status: err.status,
                message: err.safe,
                locations: locs
            });
        } else {
            console.error(err);

            res.status(500).json({
                status: 500,
                message: 'Internal Server Error',
                locations: locs
            });
        }
    }
}

module.exports = PublicError;
