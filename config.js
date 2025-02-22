const { Pool } = require("pg");

const config = {
    user: "postgres",
    host: "localhost",
    password: "123456",
    database: "jwt_clase",
    port: 5432,
    allowExitOnIdle: true
};

const pool = new Pool(config)