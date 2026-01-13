const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: "*", // Allow local file access or any origin for simplicity
        methods: ["GET", "POST"]
    }
});

app.use(express.static('.')); // Serve current directory files

// Game Rooms State
// Room ID -> { host: socketId, client: socketId, mapData: null, turnData: null }
const rooms = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // 1. Join Game
    socket.on('join_game', (roomId) => {
        if (!rooms[roomId]) {
            // First player becomes Host
            rooms[roomId] = { host: socket.id, client: null };
            socket.join(roomId);
            socket.emit('role_assigned', { role: 'host' });
            console.log(`Room ${roomId} created by Host ${socket.id}`);
        } else if (!rooms[roomId].client) {
            // Second player becomes Client
            rooms[roomId].client = socket.id;
            socket.join(roomId);
            socket.emit('role_assigned', { role: 'client' });
            io.to(rooms[roomId].host).emit('player_joined', { clientId: socket.id });
            console.log(`Client ${socket.id} joined Room ${roomId}`);
        } else {
            // Room full
            socket.emit('error_message', 'Room is full!');
        }
    });

    // 2. Map Sync (Host -> Client)
    socket.on('sync_map', (data) => {
        // data = { roomId, mapState, playersState }
        socket.to(data.roomId).emit('sync_map', data);
    });

    // 3. Client Action Submission (Client -> Host)
    socket.on('submit_actions', (data) => {
        // data = { roomId, actions }
        socket.to(data.roomId).emit('client_actions', data.actions);
    });

    // 4. Replay Sync (Host -> Client) - Send replay actions before execution
    socket.on('sync_replay', (data) => {
        // data = { roomId, replayActions }
        socket.to(data.roomId).emit('sync_replay', data);
    });

    // 5. Turn Resolution (Host -> Client)
    socket.on('turn_complete', (data) => {
        // data = { roomId, newState, battleLog }
        socket.to(data.roomId).emit('turn_update', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Find room user was in
        Object.keys(rooms).forEach(roomId => {
            const r = rooms[roomId];
            if (r.host === socket.id) {
                // Host left, destroy room or notify client
                io.to(roomId).emit('error_message', 'Host disconnected. Room closed.');
                delete rooms[roomId]; // Simple: close room
            } else if (r.client === socket.id) {
                r.client = null;
                io.to(r.host).emit('player_left', socket.id);
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`listening on *:${PORT}`);
});
