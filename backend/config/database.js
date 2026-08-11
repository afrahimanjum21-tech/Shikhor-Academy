import { Sequelize } from 'sequelize';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DB_URL = process.env.DATABASE_URL || '';

const sequelize = DB_URL
  ? new Sequelize(DB_URL, {
      dialect: 'postgres',
      dialectModule: pg,
      logging: process.env.APP_ENV === 'development' ? console.log : false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
      define: {
        timestamps: true,
        underscored: false,
        freezeTableName: false,
      },
      pool: {
        max: 20,
        min: 2,
        acquire: 30000,
        idle: 10000,
      },
    })
  : new Sequelize(
      process.env.DB_DATABASE || 'uttoron_coaching',
      process.env.DB_USERNAME || 'postgres',
      process.env.DB_PASSWORD || '',
      {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        dialect: 'postgres',
        logging: process.env.APP_ENV === 'development' ? console.log : false,
        define: {
          timestamps: true,
          underscored: false,
          freezeTableName: false,
        },
        pool: {
          max: 20,
          min: 2,
          acquire: 30000,
          idle: 10000,
        },
      }
    );

export default sequelize;
