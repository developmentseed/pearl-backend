'use strict';
/**
 * @class
 */
class Mosaic {

    static mosaics = {
        'naip.latest': {
            id: '87b72c66331e136e088004fba817e3e8',
            default_params: {
                assets: 'image',
                asset_bidx: 'image|1,2,3',
                collection: 'naip'
            }
        }
    };

    /**
     * Return a list of Mosaics
     */
    static list() {
        return Object.keys(this.mosaics);
    }

    /**
     * Return mosaic SearchID
     *
     * @param {String} mosaic - Mosaic Name
     */
    static get_id(mosaic) {
        if (this.mosaics[mosaic]  === undefined) throw new Err(404, null, `Mosaic ${mosaic} not found`);
        return this.mosaics[mosaic].id;
    }

    /**
     * Return defaults query parameters
     *
     * @param {String} mosaic - Mosaic Name
     */
     static get_query(mosaic) {
        if (this.mosaics[mosaic]  === undefined) throw new Err(404, null, `Mosaic ${mosaic} not found`);
        return this.mosaics[mosaic].default_params;
    }
}

module.exports = Mosaic;
