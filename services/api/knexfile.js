const Config = require('./lib/config');

const config = Config.env()

module.exports = {
  client: 'postgresql',
  connection: config.Postgres,
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
