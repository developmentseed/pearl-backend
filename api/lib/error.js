'use strict';

class PublicError {
    constructor(status, err, safe, print = true) {
        if (print && status !== 400) console.error(err ? err : 'Error: ' + safe);

        this.status = status;
        this.err = err;
        this.safe = safe;
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
