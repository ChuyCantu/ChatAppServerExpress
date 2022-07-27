const app = require("./app");
const http = require("http");

// Store port in Express
const port = process.env.PORT;
app.set("port", port);

// Create HTTP Server
const server = http.createServer(app);

server.listen(port, () => {
    console.log(`Server running and listening to port ${port}\n`);
});