class NetworkManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.roomId = null;
        this.role = null; // 'host' or 'client'
        this.isConnected = false;
        this.opponentId = null;
    }

    connect(roomId) {
        this.roomId = roomId;
        // Connect to the specific server URL
        try {
            this.socket = io("http://192.168.1.100:3001");
        } catch (e) {
            alert("Error: Socket.io not loaded. Make sure server.js is running!");
            return;
        }

        this.socket.on('connect', () => {
            console.log('Connected to server, joining room:', this.roomId);
            this.isConnected = true;
            document.getElementById('connection-status').innerText = "Connected. Joining Lobby...";
            this.joinGame(this.roomId);
        });

        this.socket.on('connect_error', (err) => {
            console.error("Connection failed", err);
            alert("Connection Failed: " + err.message);
        });

        this.socket.on('role_assigned', (data) => {
            this.role = data.role;
            console.log(`Role Assigned: ${this.role.toUpperCase()}`);

            if (this.role === 'host') {
                document.getElementById('connection-status').innerText = `HOSTING Room ${this.roomId}. Waiting for player...`;
                this.game.currentPlayer = 1;
                this.game.myPlayerId = 1;
                this.game.isMultiplayer = true;

                // HOST generates the map
                this.game.map.generate();
                this.game.setup();

                this.game.draw();
                document.getElementById('multiplayer-modal').style.display = 'none';
                updateUI(); // Ensure UI is ready
            } else {
                document.getElementById('connection-status').innerText = `JOINED Room ${this.roomId}. Waiting for Host...`;
                this.game.currentPlayer = 2; // Client is P2 (initially)
                this.game.myPlayerId = 2;
                this.game.isMultiplayer = true;
                // Client waits for map sync
            }
        });

        this.socket.on('player_joined', (data) => {
            if (this.role === 'host') {
                console.log('Player joined! Starting game sync...');
                this.opponentId = data.clientId;
                document.getElementById('connection-status').innerText = "Player Joined! Syncing Map...";
                this.syncMapToClient();
            }
        });

        this.socket.on('sync_map', (data) => {
            if (this.role === 'client') {
                console.log('Received Map Data from Host');
                this.game.deserializeMap(data.mapState);
                this.game.deserializePlayers(data.playersState);

                // Create renderer for client
                if (!this.game.renderer) {
                    this.game.renderer = new Renderer(this.game);
                }

                this.game.loop(); // Start loop and show UI
                document.getElementById('connection-status').innerText = "Map Synced. GAME START!";
            }
        });

        this.socket.on('client_actions', (actions) => {
            if (this.role === 'host') {
                console.log('Received Client Actions:', actions);
                this.game.receivedClientActions = actions;
                this.game.checkTurnReady();
            }
        });

        // Receive replay sync from host - client will play the same replay
        this.socket.on('sync_replay', (data) => {
            if (this.role === 'client') {
                console.log('Received Replay Sync:', data.replayActions.length, 'actions');
                this.game.receiveReplaySync(data.replayActions);
            }
        });

        this.socket.on('turn_update', (data) => {
            if (this.role === 'client') {
                console.log('Received Turn Update');
                this.game.applyTurnUpdate(data.newState, data.battleLog);
            }
        });
    }

    joinGame(roomId) {
        this.roomId = roomId;
        this.socket.emit('join_game', roomId);
    }

    // Host Functions
    syncMapToClient() {
        if (this.role !== 'host') return;

        const mapState = this.game.serializeMap();
        const playersState = this.game.serializePlayers();

        this.socket.emit('sync_map', {
            roomId: this.roomId,
            mapState: mapState,
            playersState: playersState
        });
    }

    // Send replay actions to client so both can watch
    syncReplayToClient(replayActions) {
        if (this.role !== 'host') return;

        // Serialize replay actions for network transfer
        const serializedActions = replayActions.map(item => ({
            pid: item.pid,
            action: item.action
        }));

        this.socket.emit('sync_replay', {
            roomId: this.roomId,
            replayActions: serializedActions
        });
    }

    sendTurnUpdate(newState, battleLog) {
        if (this.role !== 'host') return;
        this.socket.emit('turn_complete', {
            roomId: this.roomId,
            newState: newState,
            battleLog: battleLog
        });
    }

    // Client Functions
    submitActions(actions) {
        if (this.role !== 'client') return;
        console.log("Sending actions to host:", actions);
        this.socket.emit('submit_actions', {
            roomId: this.roomId,
            actions: actions
        });
        document.getElementById('connection-status').innerText = "Actions Sent. Waiting for Host...";
    }
}
