const { app, sessionMiddleware } = require("./app");
const http = require("http");
const socketIO = require("socket.io");
const env = process.env.NODE_ENV || "development";

const { setupChatEvents, setupChatMiddleware } = require("./chat/events");

// Store port in Express
const port = process.env.PORT;
app.set("port", port);

// Create HTTP Server
const server = http.createServer(app);
const io = new socketIO.Server(server, {
    cors: { 
        credentials: true, 
        origin: env === "development" ? "http://localhost:4200" : "https://nd-chatapp.herokuapp.com" 
    }
});

//+ Set socket io server events
setupChatMiddleware(io, sessionMiddleware);
setupChatEvents(io);

server.listen(port, () => {
    console.log(`Server running and listening to port ${port}\n`);
});

