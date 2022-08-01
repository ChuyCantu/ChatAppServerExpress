const { Server } = require("socket.io");
const passport = require("passport");
const { QueryTypes } = require("sequelize");
const { db, User, FriendRelation, friendRelationStatus, Message } = require("../services/db");
const friendrelation = require("../../db/models/friendrelation");

const setupChatMiddleware = (io = Server, sessionMiddleware) => {
    const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);

    io.use(wrap(sessionMiddleware));
    io.use(wrap(passport.initialize()));
    io.use(wrap(passport.session()));

    io.use((socket, next) => {
        if (socket.request.user) {
            next();
        }
        else {
            console.log("Unauthorized connection refused");
            next(new Error("Unauthorized"));
        }
    });
};

const setupChatEvents = (io = Server) => {
    io.on("connect", async (socket) => {
        const user = socket.request.user;

        //+ Join room by id:
        socket.join(user.id);

        console.log(`\nUser ${socket.request.user.username} connected\n`);

        socket.on("disconnect", () => {
            console.log(`\nUser ${socket.request.user.username} disconnected\n`);
        });

        socket.on("send-friend-request", async ({ to }) => {
            if (user.username === to) {
                // TODO: Tell requester that user cannot friend himself (send-friend-request-reply)?
                return;
            }

            // Check the users don't have a friend relation yet
            const receiver = await User.findOne({
                attributes: [ "id" ],
                where: { username: to }
            });

            if (!receiver) {
                // TODO: Tell requester that user does not exist (send-friend-request-reply)?
                return;
            }

            let user1, user2;
            if (user.id < receiver.id) {
                user1 = user.id;
                user2 = receiver.id;
            }
            else {
                user1 = receiver.id;
                user2 = receiver.id;
            }

            const friendRelation = await db.query(
                `select id from friend_relations
                where (user1_id = :user1 and user2_id = :user2)`,
                {
                    replacements: { user1: user1, user2: user2 }
                }
            );

            if (friendRelation[0].length > 0) {
                // TODO: Tell the requester that it's not possible to send request (send-friend-request-reply)?

                return;
            }

            // Write request into database
            let friendRelationData = { };
            if (user.id < receiver.id) {
                friendRelationData = {
                    user1_id: user.id,
                    user2_id: receiver.id,
                    relation_status: friendRelationStatus.pending_f_t
                }
            }
            else {
                friendRelationData = {
                    user1_id: receiver.id,
                    user2_id: user.id,
                    relation_status: friendRelationStatus.pending_t_f
                }
            }
            const friendRelationInsert = await FriendRelation.create(friendRelationData);
            // try {
            //     friendRelationInsert.save();
            // }
            // catch (err) {
            //     console.log("Error saving friend relation:", err);

            //     // TODO: Tell the user something went wrong (send-friend-request-reply)?
            //     return;
            // }

            socket.to(receiver.id).emit("new-friend-request", { 
                // from: {
                id: friendRelationInsert.id,
                user: {
                    id: user.id,
                    username: user.username
                }
                // } 
            });

            socket.emit("send-friend-request-reply", {
                requestSent: true,
                friendRelation: {
                    id: friendRelationInsert.id,
                    user: {
                        id: user.id,
                        username: user.username
                    }
                }
            });
        });

        socket.on("accept-friend-request", async (friendRequest) => {
            const friendRelation = await FriendRelation.findOne({ where: { id: friendRequest.id } });
            if (friendRelation) 
                await friendRelation.update({ relation_status: friendRelationStatus.friends });
            
            socket.to(friendRequest.user.id).emit("friend-request-accepted", {
                id: friendRequest.id,
                user: {
                    id: user.id,
                    username: user.username
                }
            });
        });

        socket.on("reject-friend-request", async (friendRequest) => {
            const friendRelation = await FriendRelation.findOne({ where: { id: friendRequest.id } });
            if (friendRelation) 
                friendRelation.destroy();

            socket.to(friendRequest.user.id).emit("friend-request-rejected", {
                id: friendRequest.id,
                user: {
                    id: user.id,
                    username: user.username
                }
            });
        });

        socket.on("cancel-pending-request", async (friendRequest) => {
            const friendRelation = await FriendRelation.findOne({ where: { id: friendRequest.id } });
            if (friendRelation) 
                friendRelation.destroy();

            socket.to(friendRequest.user.id).emit("friend-request-canceled", {
                id: friendRequest.id,
                user: {
                    id: user.id,
                    username: user.username
                }
            });
        });

        socket.on("delete-friend", async (friend) => {
            const friendRelation = await FriendRelation.findOne({ where: { id: friend.id } });
            if (friendRelation) 
                friendRelation.destroy();

            socket.to(friend.user.id).emit("friend-deleted", {
                id: friend.id,
                user: {
                    id: user.id,
                    username: user.username
                }
            });
        });

        socket.on("send-friend-message", async (messageReq) => {
            const messageData = {
                from: user.id,
                to: messageReq.to,
                content: messageReq.content
            };

            const messageInsert = await Message.create(messageData);

            const message = { ...messageData, sentAt: messageInsert.sentAt };

            socket.to(message.to).emit("new-friend-message", message);
            socket.emit("new-friend-message", message);
        });

        //+ Load contacts and messages
        const friendRelations = await db.query(
            `select fr.id, fr.user1_id, u1.username as username1, 
                fr.user2_id, u2.username as username2, fr.relation_status
            from friend_relations as fr
            inner join users as u1 on u1.id = fr.user1_id
            inner join users as u2 on u2.id = fr.user2_id
            where fr.user1_id = :user or fr.user2_id = :user`,
            { 
                type: QueryTypes.SELECT ,
                replacements: { user: user.id }
            }
        );
        const friends = [];
        const pendingRequests = [];
        const friendRequests = [];
        for (let relation of friendRelations) {
            if (relation.relation_status === friendRelationStatus.friends) {
                if (user.id == relation.user1_id) {
                    friends.push({
                        id: relation.id,
                        user: {
                            id: relation.user2_id,
                            username: relation.username2
                        }
                    });
                }
                else {
                    friends.push({
                        id: relation.id,
                        user: {
                            id: relation.user1_id,
                            username: relation.username1
                        }
                    });
                }
            }
            else if (relation.relation_status === friendRelationStatus.pending_f_t) {
                if (user.id === relation.user1_id) {
                    pendingRequests.push({
                        id: relation.id,
                        user: {
                            id: relation.user2_id,
                            username: relation.username2
                        }
                    });
                }
                else {
                    friendRequests.push({
                        id: relation.id,
                        user: {
                            id: relation.user1_id,
                            username: relation.username1
                        }
                    });
                }
            }
            else if (relation.relation_status === friendRelationStatus.pending_t_f) {
                if (user.id === relation.user1_id) {
                    friendRequests.push({
                        id: relation.id,
                        user: {
                            id: relation.user2_id,
                            username: relation.username2
                        }
                    });
                }
                else {
                    pendingRequests.push({
                        id: relation.id,
                        user: {
                            id: relation.user1_id,
                            username: relation.username1
                        }
                    });
                }
            }
        }
        
        socket.emit("friend-relations-loaded", {
            friends,
            pendingRequests,
            friendRequests
        });

        // const lastFriendsMessage = await Message.findAll();
        // socket.emit("last-friends-message-loaded", lastFriendsMessage);
    });
};

module.exports = {
    setupChatEvents,
    setupChatMiddleware
};