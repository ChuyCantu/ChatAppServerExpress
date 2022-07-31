const { Server } = require("socket.io");
const passport = require("passport");

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
    io.on("connect", (socket) => {
        console.log(`User ${socket.request.user.username} connected`);
        socket.emit("welcome", "Welcome aboard");

        socket.on("disconnect", () => {
            console.log("User disconnected");
        });
    });
};

module.exports = {
    setupChatEvents,
    setupChatMiddleware
};