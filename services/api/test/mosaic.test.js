import test from 'tape';
import Flight from './flight.js';

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls', true);

test('GET /api/mosaic', async(t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/mosaic',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        delete res.body.mosaics[0].created;
        delete res.body.mosaics[0].updated;
        t.deepEquals(res.body, {
            mosaics: [{
                id: '87b72c66331e136e088004fba817e3e8',
                name: 'naip.latest',
                params: { assets: 'image', asset_bidx: 'image|1,2,3', collection: 'naip' },
                mosaic_ts_start: null,
                mosaic_ts_end: null,
                source_id: 1
            }]
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/imagery', async(t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/imagery',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        for (const s of res.body.imagery_sources) {
            delete s.created;
            delete s.updated;
        }


        t.deepEquals(res.body, {
            total: 2,
            imagery_sources: [{
                id: 1,
                name: 'NAIP'
            },{
                id: 2,
                name: 'Sentinel-2'
            }]
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/mosaic?sourceid=1', async(t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/mosaic?sourceid=1',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        delete res.body.mosaics[0].created;
        delete res.body.mosaics[0].updated;
        t.deepEquals(res.body, {
            mosaics: [{
                id: '87b72c66331e136e088004fba817e3e8',
                name: 'naip.latest',
                params: { assets: 'image', asset_bidx: 'image|1,2,3', collection: 'naip' },
                mosaic_ts_start: null,
                mosaic_ts_end: null,
                source_id: 1
            }]
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/mosaic?sourceid=2', async(t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/mosaic?sourceid=2',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.deepEquals(res.body, {
            mosaics: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/mosaic/naip.latest', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/mosaic/naip.latest',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, false);

        t.equals(res.statusCode, 404, 'status: 404');
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.landing(test);
