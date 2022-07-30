const app = require("./app");
const http = require("http");
const socketIO = require("socket.io");

 const setupChatEvents = require("./chat/events");

// Store port in Express
const port = process.env.PORT;
app.set("port", port);

// Create HTTP Server
const server = http.createServer(app);
const io = new socketIO.Server(server, {
    cors: { origin: "http://localhost:4200" }
});

//+ Set socket io server events
setupChatEvents(io);

server.listen(port, () => {
    console.log(`Server running and listening to port ${port}\n`);
});

