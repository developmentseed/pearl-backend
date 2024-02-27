import test from 'tape';
import Flight from './flight.js';

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls', true);

flight.fixture(test, 'model.json', 'ingalls');
flight.fixture(test, 'project.json', 'ingalls');
flight.fixture(test, 'checkpoint.json', 'ingalls');
flight.fixture(test, 'aoi.json', 'ingalls');
flight.fixture(test, 'timeframe.json', 'ingalls');

test('DELETE /api/project/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1',
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, false);

        t.equals(res.statusCode, 200, 'status: 200');
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.landing(test);
