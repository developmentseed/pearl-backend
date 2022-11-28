import jwt from 'jsonwebtoken';

/**
 * @class
 */
export default class API {
    constructor(base, SigningSecret) {
        this.base = base;

        this.token = 'api.' + jwt.sign({
            t: 'admin'
        }, SigningSecret);

    }

    async meta() {
        const url = new URL(this.base + '/api');

        console.error(`ok - GET ${url}`);
        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
        });

        console.error(`ok - RES ${url} ${res.status}`);

        return await res.json();
    }

    async schemas() {
        const url = new URL(this.base + '/api/websocket');

        console.error(`ok - GET ${url}`);
        const res = await fetch(url);
        console.error(`ok - RES ${url} ${res.status}`);

        return await res.json();
    }

    async deactivate() {
        const url = new URL(this.base + '/api/instance');

        console.error(`ok - DELETE ${url}`);
        const res = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
        });
        console.error(`ok - RES ${url} ${res.status}`);

        return await res.json();
    }

    async instance_state(projectid, instanceid, active) {
        const url = new URL(this.base + `/api/project/${projectid}/instance/${instanceid}`);

        console.error(`ok - PATCH ${url}`);
        const res = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify({
                active: active
            })
        });
        console.error(`ok - RES ${url} ${res.status}`);

        return await res.json();
    }
}
