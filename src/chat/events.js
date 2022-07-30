const { Server } = require("socket.io");

const setupChatEvents = (io = Server) => {
    io.on("connect", (socket) => {
        console.log("User connected");
        socket.emit("welcome", "Welcome aboard");
        

        socket.on("disconnect", () => {
            console.log("User disconnected");
        });
    });
};

module.exports = setupChatEvents;