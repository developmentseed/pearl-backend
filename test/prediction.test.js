const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const test = require('tape');

const API = process.env.API || 'http://localhost:2000';
const SOCKET = process.env.SOCKET || 'ws://localhost:1999';

const { connect } = require('./init');
const Worker = require('./worker');

state = connect(test, API);

const worker = new Worker(test, {
    instance: 1
});

worker.start();

const flow = [{
    message: 'model#checkpoint',
    data: {
        name: 'Seneca Rocks, WV',
        id: 1
    }
},{
    message: 'model#aoi',
    data: {
        id: 1,
        live: true,
        name: 'Seneca Rocks, WV',
        checkpoint_id: 1,
        bounds: [ -79.38446044921875, 38.82901019751964, -79.3707275390625, 38.83756825896614 ],
        total: 20
    }
},{
    message: 'model#prediction',
    data: {
        aoi: 1,
        bounds: [ -79.38446044921875, 38.83542884007304, -79.3817138671875, 38.83756825896614 ],
        x: 36633,
        y: 50169,
        z: 17,
        total: 20,
        processed: 0
    }
},{
    message: 'model#prediction',
    data: {
        aoi: 1,
        bounds: [ -79.38446044921875, 38.833289356866885, -79.3817138671875, 38.83542884007304 ],
        x: 36633,
        y: 50170,
        z: 17,
        total: 20,
        processed: 1
    }
},{
    message: 'model#prediction',
    data: {
        aoi: 1,
        bounds: [ -79.38446044921875, 38.833289356866885, -79.3817138671875, 38.83542884007304 ],
        x: 36633,
        y: 50170,
        z: 17,
        total: 20,
        processed: 2
    }
},{
    message: 'model#prediction',
    data: {
        aoi: 1,
        bounds: [ -79.38446044921875, 38.833289356866885, -79.3817138671875, 38.83542884007304 ],
        x: 36633,
        y: 50170,
        z: 17,
        total: 20,
        processed: 3
    }
},{
    message: 'model#prediction',
    data: {
        aoi: 1,
        bounds: [ -79.3817138671875, 38.83542884007304, -79.37896728515625, 38.83756825896614 ],
        x: 36634,
        y: 50169,
        z: 17,
        total: 20,
        processed: 4
    }
},{
    message: 'model#prediction',
    data: {
        aoi: 1,
        bounds: [ -79.38446044921875, 38.833289356866885, -79.3817138671875, 38.83542884007304 ],
        x: 36633,
        y: 50170,
        z: 17,
        total: 20,
        processed: 5
    }
},{
    message: 'model#prediction',
    data: {
        aoi: 1,
        bounds: [ -79.38446044921875, 38.833289356866885, -79.3817138671875, 38.83542884007304 ],
        x: 36633,
        y: 50170,
        z: 17,
        total: 20,
        processed: 6
    }
},{
    message: 'model#prediction',
    data: {
        aoi: 1,
        bounds: [ -79.38446044921875, 38.833289356866885, -79.3817138671875, 38.83542884007304 ],
        x: 36633,
        y: 50170,
        z: 17,
        total: 20,
        processed: 7
    }
},{
    message: 'model#prediction',
    data: {
        aoi: 1,
        bounds: [ -79.38446044921875, 38.833289356866885, -79.3817138671875, 38.83542884007304 ],
        x: 36633,
        y: 50170,
        z: 17,
        total: 20,
        processed: 8
    }
},{
    message: 'model#prediction',
    data: {
        aoi: 1,
        bounds: [ -79.38446044921875, 38.833289356866885, -79.3817138671875, 38.83542884007304 ],
        x: 36633,
        y: 50170,
        z: 17,
        total: 20,
        processed: 9
    }
},{
    message: 'model#prediction',
    data: {
        aoi: 1,
        bounds: [ -79.38446044921875, 38.833289356866885, -79.3817138671875, 38.83542884007304 ],
        x: 36633,
        y: 50170,
        z: 17,
        total: 20,
        processed: 10
    }
},{
    message: 'model#prediction',
    data: {
        aoi: 1,
        bounds: [ -79.38446044921875, 38.833289356866885, -79.3817138671875, 38.83542884007304 ],
        x: 36633,
        y: 50170,
        z: 17,
        total: 20,
        processed: 11
    }
},{
    message: 'model#prediction',
    data: {
        aoi: 1,
        bounds: [ -79.38446044921875, 38.833289356866885, -79.3817138671875, 38.83542884007304 ],
        x: 36633,
        y: 50170,
        z: 17,
        total: 20,
        processed: 12
    }
},{
    message: 'model#prediction',
    data: {
        aoi: 1,
        bounds: [ -79.38446044921875, 38.833289356866885, -79.3817138671875, 38.83542884007304 ],
        x: 36633,
        y: 50170,
        z: 17,
        total: 20,
        processed: 13
    }
},{
    message: 'model#prediction',
    data: {
        aoi: 1,
        bounds: [ -79.38446044921875, 38.833289356866885, -79.3817138671875, 38.83542884007304 ],
        x: 36633,
        y: 50170,
        z: 17,
        total: 20,
        processed: 14
    }
},{
    message: 'model#prediction',
    data: {
        aoi: 1,
        bounds: [ -79.38446044921875, 38.833289356866885, -79.3817138671875, 38.83542884007304 ],
        x: 36633,
        y: 50170,
        z: 17,
        total: 20,
        processed: 15
    }
},{
    message: 'model#prediction',
    data: {
        aoi: 1,
        bounds: [ -79.38446044921875, 38.833289356866885, -79.3817138671875, 38.83542884007304 ],
        x: 36633,
        y: 50170,
        z: 17,
        total: 20,
        processed: 16
    }
},{
    message: 'model#prediction',
    data: {
        aoi: 1,
        bounds: [ -79.38446044921875, 38.833289356866885, -79.3817138671875, 38.83542884007304 ],
        x: 36633,
        y: 50170,
        z: 17,
        total: 20,
        processed: 17
    }
},{
    message: 'model#prediction',
    data: {
        aoi: 1,
        bounds: [ -79.38446044921875, 38.833289356866885, -79.3817138671875, 38.83542884007304 ],
        x: 36633,
        y: 50170,
        z: 17,
        total: 20,
        processed: 18
    }
},{
    message: 'model#prediction',
    data: {
        aoi: 1,
        bounds: [ -79.38446044921875, 38.833289356866885, -79.3817138671875, 38.83542884007304 ],
        x: 36633,
        y: 50170,
        z: 17,
        total: 20,
        processed: 19
    }
},{
    message: 'model#prediction#complete',
    data: {
        aoi: 1
    }
}].reverse();

test('gpu connection', (t) => {
    state.connected = false;
    let close = false;

    const ws = new WebSocket(SOCKET + `?token=${state.instance.token}`);

    sent = false;
    ws.on('message', (msg) => {
        msg = JSON.parse(String(msg));

        if (msg.message === 'info#disconnected') {
            return;
        } else if (msg.message === 'info#connected') {
            sent = true;
            t.ok('Sending model#prediction');
            ws.send(fs.readFileSync(path.resolve(__dirname, './fixtures/seneca-rocks/model#prediction.json')));
        } else {
            if (msg.message === 'model#prediction') delete msg.data.image;
            t.deepEquals(msg, flow.pop());
        }
    });

    ws.on('error', (err) => {
        t.error(err, 'no errors');
    });

    ws.on('close', () => {
        if (close) {
            t.end();
        } else {
            t.notOk('Failed to satisfy test flow');
            t.end();
        }
    });
});
