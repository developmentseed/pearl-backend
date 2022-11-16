
const test = require('tape');
const Flight = require('./flight');

const flight = new Flight();

flight.init(test);
flight.takeoff(test);

test('GET /api/websocket', async(t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/websocket',
            method: 'GET'
        }, t);

        t.deepEquals(Object.keys(res.body).sort(), [
            'model#aoi',
            'model#checkpoint',
            'model#osm',
            'model#patch',
            'model#prediction',
            'model#retrain',
            'model#status'
        ].sort());
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.landing(test);
