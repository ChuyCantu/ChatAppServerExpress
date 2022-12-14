'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  User.init({
    username: DataTypes.TEXT,
    hashed_password: DataTypes.BLOB,
    salt: DataTypes.BLOB
  }, {
    sequelize,
    modelName: 'user',
  });
  return User;
};