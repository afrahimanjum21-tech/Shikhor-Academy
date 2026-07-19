import { Sequelize } from 'sequelize';
import mysql2 from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_DATABASE || 'uttoron_coaching',
  process.env.DB_USERNAME || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    dialectModule: mysql2,
    logging: process.env.APP_ENV === 'development' ? console.log : false,
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: false,
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

export default sequelize;
