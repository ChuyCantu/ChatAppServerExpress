const Sequelize = require("sequelize");
const { DataTypes } = require("sequelize");
const loadUserModel = require("../../db/models/user");
const loadFriendRelationModel = require("../../db/models/friendrelation");

async function testDatabaseConnection(db) {
    try {
        await db.authenticate();
        console.log(`Connection to ${db.getDialect()} has been established successfully.`);
    } catch (error) {
        console.error('ERROR: Unable to connect to the database.', error);
    }
}

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

//* Model Initialization
const User = loadUserModel(db, DataTypes);
const FriendRelation = loadFriendRelationModel(db, DataTypes);
const friendRelationStatus = { 
    friends: "friends",
    pending_f_t: "pending_f_t", // user1 = requester, user2 = receiver
    pending_t_f: "pending_t_f"  // user1 = receiver, user2 = requester
};

//* Model associations

module.exports = {
    db,
    testDatabaseConnection,
    User,
    FriendRelation,
    friendRelationStatus
};