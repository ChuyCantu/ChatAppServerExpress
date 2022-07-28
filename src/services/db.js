const Sequelize = require("sequelize");
const { DataTypes } = require("sequelize");
const loadUserModel = require("../../db/models/user");

// Service initialization
const connectionString = process.env.DATABASE_URL;
const dialect = process.env.DB_DIALECT;
const db  = new Sequelize(connectionString, {
        dialect,
        repositoryMode: true,
        pool: {
            max: 10,
            min: 0,
            acquire: 20000,
            idle: 5000
        }
    });

const User = loadUserModel(db, DataTypes);

async function testDatabaseConnection(db) {
    try {
        await db.authenticate();
        console.log(`Connection to ${db.getDialect()} has been established successfully.`);
    } catch (error) {
        console.error('ERROR: Unable to connect to the database.', error);
    }
}

module.exports = {
    db,
    testDatabaseConnection,
    User
};