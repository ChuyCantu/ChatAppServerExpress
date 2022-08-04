const { Server } = require("socket.io");
const passport = require("passport");
const { QueryTypes, Op } = require("sequelize");
const { db, User, FriendRelation, friendRelationStatus, Message } = require("../services/db");

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

        socket.on("send_friend_request", async ({ to }) => {
            if (user.username === to) {
                // TODO: Tell requester that user cannot friend himself (send_friend_request_reply)?
                return;
            }

            // Check the users don't have a friend relation yet
            const receiver = await User.findOne({
                attributes: [ "id" ],
                where: { username: to }
            });

            if (!receiver) {
                // TODO: Tell requester that user does not exist (send_friend_request_reply)?
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
                // TODO: Tell the requester that it's not possible to send request (send_friend_request_reply)?

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

            //     // TODO: Tell the user something went wrong (send_friend_request_reply)?
            //     return;
            // }

            socket.to(receiver.id).emit("new_friend_request", { 
                // from: {
                id: friendRelationInsert.id,
                user: {
                    id: user.id,
                    username: user.username
                }
                // } 
            });

            // socket
            io.to(user.id).emit("send_friend_request_reply", {
                requestSent: true,
                friendRelation: {
                    id: friendRelationInsert.id,
                    user: {
                        id: receiver.id,
                        username: to
                    }
                }
            });
        });

        socket.on("accept_friend_request", async (friendRequest) => {
            const friendRelation = await FriendRelation.findOne({ where: { id: friendRequest.id } });
            if (friendRelation) 
                await friendRelation.update({ relation_status: friendRelationStatus.friends });
            
            socket.to(friendRequest.user.id).emit("friend_request_accepted", {
                id: friendRequest.id,
                user: {
                    id: user.id,
                    username: user.username
                }
            });
        });

        socket.on("reject_friend_request", async (friendRequest) => {
            const friendRelation = await FriendRelation.findOne({ where: { id: friendRequest.id } });
            if (friendRelation) 
                friendRelation.destroy();

            socket.to(friendRequest.user.id).emit("friend_request_rejected", {
                id: friendRequest.id,
                user: {
                    id: user.id,
                    username: user.username
                }
            });
        });

        socket.on("cancel_pending_request", async (friendRequest) => {
            const friendRelation = await FriendRelation.findOne({ where: { id: friendRequest.id } });
            if (friendRelation) 
                friendRelation.destroy();

            socket.to(friendRequest.user.id).emit("friend_request_canceled", {
                id: friendRequest.id,
                user: {
                    id: user.id,
                    username: user.username
                }
            });
        });

        socket.on("delete_friend", async (friend) => {
            const friendRelation = await FriendRelation.findOne({ where: { id: friend.id } });
            if (friendRelation) 
                friendRelation.destroy();

            socket.to(friend.user.id).emit("friend_deleted", {
                id: friend.id,
                user: {
                    id: user.id,
                    username: user.username
                }
            });

            // Also delete messages
            await db.query(`
                delete from messages 
                where ("from" = :user and "to" = :friend) or
                    ("from" = :friend and "to" = :user)
            `, {
                replacements: { user: user.id, friend: friend.user.id }
            });
        });

        socket.on("delete_account", async () => {
            const toDeleteUser = await User.findOne({ where: { id: user.id } });

            if (!toDeleteUser) return;

            // Delete friend relations
            await db.query(`
                delete from friend_relations 
                where user1_id = :user or user2_id = :user
            `, {
                replacements: { user: user.id }
            });

            // And messages
            await db.query(`
                delete from messages 
                where "from" = :user or "to" = :user
            `, {
                replacements: { user: user.id }
            });

            // And finally the user
            toDeleteUser.destroy();

            socket.disconnect();
        });

        socket.on("send_friend_message", async (messageReq) => {
            const messageData = {
                from: user.id,
                to: messageReq.to,
                content: messageReq.content
            };

            const messageInsert = await Message.create(messageData);

            const message = { id: messageInsert.id, sentAt: messageInsert.sentAt, ...messageData };

            socket.to(message.to).emit("new_friend_message", message);
            // socket.emit("new_friend_message", message);
            io.to(user.id).emit("new_friend_message", message); // Also notify myself and other instances of myself
        });

        socket.on("request_friend_messages", async ({ friendId, offset, limit }) => {
            const messages = await db.query(`
                select id, "from", "to", content, "sentAt", "readAt"
                from messages where ("from" = :user and "to" = :friend) or
                    ("from" = :friend and "to" = :user)
                order by id desc offset :offset limit :limit
            `, {
                type: QueryTypes.SELECT,
                replacements: { user: user.id, friend: friendId, offset: offset, limit: limit }
            });
            
            socket.emit("friend_messages_received", friendId, messages);
        });

        socket.on("notify_typing", async (to, typing) => {
            socket.to(to).emit("friend_typing", user.id, typing);
        });

        // socket.on("notify_messages_read", async (friendId, fromMsgId, toMsgId, timestamp) => {
        //     console.log(friendId, fromMsgId, toMsgId, timestamp);

        //     await db.query(`
        //         update messages set "readAt" = :datetime
        //         where "from" = :friend and "to" = :user
        //         and id >= :from and id <= :to
        //     `,{
        //         replacements: { datetime: timestamp, from: fromMsgId, 
        //             to: toMsgId, user: user.id, friend: friendId 
        //         }
        //     });

        //     // Also update the friend's messages to be read
        //     socket.to(friendId).emit("messages_read", user.id, fromMsgId, toMsgId, timestamp);
        // });
        socket.on("notify_message_read", async (friendId, msgReadId, timestamp) => {
            await db.query(`
                update messages set "readAt" = :datetime
                where id = :msgId
            `,{
                replacements: { 
                    datetime: timestamp, msgId: msgReadId 
                }
            });

            // Also update the friend's messages to be read
            socket.to(friendId).emit("message_read", user.id, msgReadId, timestamp);
        });

        socket.on("notify_messages_read", async (friendId, lastMsgReadId, timestamp) => {
            console.log(friendId, lastMsgReadId, timestamp);

            await db.query(`
                update messages set "readAt" = :datetime
                where "readAt" is null 
                and "from" = :friend and "to" = :user
                and id <= :lastId
            `,{
                replacements: { 
                    datetime: timestamp, lastId: lastMsgReadId, 
                    user: user.id, friend: friendId 
                }
            });

            // Also update the friend's messages to be read
            socket.to(friendId).emit("messages_read", user.id, lastMsgReadId, timestamp);
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
        
        socket.emit("friend_relations_loaded", {
            friends,
            pendingRequests,
            friendRequests
        });

        const lastFriendsMessage = await db.query(`
            select m.id, m.from, m.to, m.content, m."sentAt", m."readAt"
            from messages m left join messages m1 on 
                ( (m.from = m1.from and m.to = m1.to) or (m.from = m1.to and m.to = m1.from) )
                and case when m."sentAt" = m1."sentAt" then m.id < m1.id else m."sentAt" < m1."sentAt" end
            where m1.id is null
            and :user in (m.from, m.to)
        `, {  
            type: QueryTypes.SELECT ,
            replacements: { user: user.id }
        });
        const unreadMessages = await Message.count({
            attributes: [ "from" ],
            where: {
                to: user.id,
                readAt: null
            },
            group: [ "from", "to" ]
        });
        socket.emit("last_friends_message_loaded", lastFriendsMessage, unreadMessages);
    });
};

module.exports = {
    setupChatEvents,
    setupChatMiddleware
};