const test = require('tape');
const request = require('request');
const { Flight } = require('./util');

const flight = new Flight();

flight.takeoff(test);

let token;
test('user', async (t) => {
    token = (await flight.user(t)).token;
    t.end();
});

test('GET /api/mosaic', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/mosaic',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.deepEquals(res.body, {
            mosaics: [
                'naip.latest'
            ]
        });

        t.end();
    });
});

// test('GET /api/mosaic/naip.latest', (t) => {
//     request({
//         json: true,
//         url: 'http://localhost:2000/api/mosaic/naip.latest',
//         method: 'GET',
//         headers: {
//             Authorization: `Bearer ${token}`
//         }
//     }, (err, res) => {
//         t.error(err, 'no errors');
//         t.equals(res.statusCode, 404, 'status: 404');

//         t.end();
//     });
// });

flight.landing(test);
