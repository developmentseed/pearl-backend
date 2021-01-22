'use strict';

class PublicError {
    constructor(status, err, safe, print = true) {
        // Wrap postgres errors to ensure stack trace (line nums) are returned
        if (err && err.severity) err = new Error(err);

        if (print && ![400, 401, 404].includes(status)) console.error(err ? err : 'Error: ' + safe);

        this.status = status;
        this.err = err;
        this.safe = safe;
    }

    static respond(err, res, messages = []) {
        if (err instanceof PublicError) {

            res.status(err.status).json({
                status: err.status,
                message: err.safe,
                messages: messages
            });
        } else {
            console.error(err);

            res.status(500).json({
                status: 500,
                message: 'Internal Server Error',
                messages: messages
            });
        }
    }
}

module.exports = PublicError;
