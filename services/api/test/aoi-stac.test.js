import test from 'tape';
import Flight from './flight.js';
import fs from 'fs';
import { sql } from 'slonik';

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls', true);

flight.fixture(test, 'model.json', 'ingalls');
flight.fixture(test, 'project.json', 'ingalls');
flight.fixture(test, 'checkpoint.json', 'ingalls');

test('POST /api/project/1/aoi', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                name: 'Test AOI',
                checkpoint_id: 1,
                bounds: {
                    type: 'Polygon',
                    coordinates: [[
                        [-79.37724530696869, 38.83428180092151],
                        [-79.37677592039108, 38.83428180092151],
                        [-79.37677592039108, 38.83455550411051],
                        [-79.37724530696869, 38.83455550411051],
                        [-79.37724530696869, 38.83428180092151]
                    ]]
                }
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            area: 1238,
            storage: false,
            project_id: 1,
            checkpoint_id: 1,
            bookmarked: false,
            bookmarked_at: null,
            patches: [],
            name: 'Test AOI',
            px_stats: {},
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            bounds: {
                type: 'Polygon',
                bounds: [
                    -79.37724530696869,
                    38.83428180092151,
                    -79.37677592039108,
                    38.83455550411051
                ],
                coordinates: [[
                    [-79.37724530696869, 38.83428180092151],
                    [-79.37677592039108, 38.83428180092151],
                    [-79.37677592039108, 38.83455550411051],
                    [-79.37724530696869, 38.83455550411051],
                    [-79.37724530696869, 38.83428180092151]
                ]]
            }
        });

    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('[meta] Set aoi.storage: true', async (t) => {
    try {
        await flight.config.pool.query(sql`
            UPDATE
                aois
            SET
                storage = true
        `, []);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.landing(test);
