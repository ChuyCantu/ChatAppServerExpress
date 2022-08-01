'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('friend_relations', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user1_id: {
        type: Sequelize.INTEGER
      },
      user2_id: {
        type: Sequelize.INTEGER
      },
      relation_status: {
        type: Sequelize.TEXT
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('friend_relations');
  }
};