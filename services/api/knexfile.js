const path = require('path');

module.exports = {
    client: 'postgresql',
    connection: process.env.Postgres || 'postgres://postgres@localhost:5432/lulc',
    pool: {
        min: 2,
        max: 10
    },
    migrations: {
        tableName: 'knex_migrations',
        stub: path.resolve(__dirname, 'migrations/migration.stub'),
        directory: path.resolve(__dirname, './migrations')
    }
};
