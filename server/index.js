const { Server } = require("socket.io");
const http = require("http");

const PORT = process.env.PORT || 3001;

const server = http.createServer();
const io = new Server(server, {
    cors: {
        origin: "*", // Enable all CORS for Render/Vercel MVP pairing
        methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 1e8 // 100 MB allow large data array transfers
});

let connectedUsers = 0;

io.on("connection", (socket) => {
    connectedUsers++;
    console.log(`🟢 User connected: ${socket.id} (Total: ${connectedUsers})`);

    // Handle cursor movement
    socket.on("cursor_move", (data) => {
        // Broadcast to everyone else EXCEPT the sender
        socket.broadcast.emit("cursor_update", data);
    });

    // Handle new annotations
    socket.on("add_annotation", (data) => {
        // Broadcast annotation to everyone
        io.emit("annotation_added", data);
    });

    // Handle data dataset synchronization (e.g. when one user uploads a file)
    socket.on("sync_data", (payload) => {
        console.log(`📦 Broadcasting data sync from ${socket.id} (${payload.signals?.length || 0} signals)`);
        socket.broadcast.emit("data_synced", payload);
    });

    // Handle visible signals state sync
    socket.on("sync_signals", (visibleSignals) => {
        console.log(`📊 Broadcasting signal sync from ${socket.id}`);
        socket.broadcast.emit("signals_synced", visibleSignals);
    });

    // Handle disconnect to remove cursor
    socket.on("disconnect", () => {
        connectedUsers--;
        console.log(`🔴 User disconnected: ${socket.id} (Total: ${connectedUsers})`);

        // Tell all clients to remove this user's cursor
        // The client uses socket.id as the cursor ID when broadcasting
        io.emit("cursor_remove", socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Collaboration socket server running on port ${PORT}`);
});
