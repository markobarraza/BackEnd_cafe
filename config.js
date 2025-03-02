import "dotenv/config";

import pkg from "pg";
const { Pool } = pkg;

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: 3000,
  database: process.env.DB_NAME,
};

const pool = new Pool(config);

export { pool };
