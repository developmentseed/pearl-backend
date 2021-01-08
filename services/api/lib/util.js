'use strict';

class Param {
    static int(req, res, name) {
        req.params[name] = Number(req.params[name]);
        if (isNaN(req.params[name])) {
            return res.status(400).send({
                status: 400,
                error: `${name} param must be an integer`
            });
        }
    }
}

module.exports = {
    Param
};

