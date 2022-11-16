export default {
    client: 'postgresql',
    connection: process.env.Postgres || 'postgres://postgres@localhost:5432/lulc',
    pool: {
        min: 2,
        max: 10
    },
    migrations: {
        tableName: 'knex_migrations',
        stub: 'migrations/migration.stub',
        directory: String(new URL('./migrations', import.meta.url)).replace('file://', '')
    }
};
