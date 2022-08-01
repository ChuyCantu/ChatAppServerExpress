'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class FriendRelation extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  FriendRelation.init({
    user1_id: DataTypes.INTEGER,
    user2_id: DataTypes.INTEGER,
    relation_status: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'friend_relation',
  });
  return FriendRelation;
};