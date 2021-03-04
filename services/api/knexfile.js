module.exports = {
    client: 'postgresql',
    connection: process.env.Postgres || 'postgres://postgres@localhost:5432/lulc',
    pool: {
        min: 2,
        max: 10
    },
    migrations: {
        tableName: 'knex_migrations',
        stub: 'migration.stub',
        directory: __dirname + '/migrations'
    }
};
