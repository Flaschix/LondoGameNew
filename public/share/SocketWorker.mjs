export class SocketWorker {

    constructor(socket) {
        this.socket = socket;
        this.lastSentTime = 0;
        this.lastSentTimeCursor = 0;
        this.sendInterval = 75;
    }

    subscribeNewPlayer(context, event) {
        this.socket.on(`newPlayer`, (playerInfo) => {
            event.call(context, playerInfo);
        });
    }

    subscribePlayerDisconected(context, event) {
        this.socket.on('playerDisconnected', (id) => {
            event.call(context, id);
        });
    }

    subscribeExistedPlayers(context, event) {
        this.socket.on('exitstedPlayers', (players) => {
            event.call(context, players);
        });
    }

    subscribePlayerRecconected(context, event) {
        this.socket.on(`playerReconected`, (playerInfo) => {
            event.call(context, playerInfo);
        });
    }

    subscribeCursorMove(context, event) {
        this.socket.on(`cursorMove`, (data) => {
            event.call(context, data);
        });
    }

    emitPlayerReconnect(newPlayerSettings) {
        this.socket.emit('playerReconnect', newPlayerSettings);
    }

    emitGetPlayers() {
        this.socket.emit('getPlayers', null);
    }

    emitCursorMove(data) {
        const currentTime = Date.now();
        if (currentTime - this.lastSentTimeCursor > this.sendInterval) {
            this.socket.emit('cursorMove', data);
            this.lastSentTimeCursor = currentTime;
        }
    }

    unSubscribeAllListeners() {
        this.socket.removeAllListeners('playerDisconnected');
        this.socket.removeAllListeners('exitstedPlayers');
        this.socket.removeAllListeners(`newPlayer`);
        this.socket.removeAllListeners(`playerReconected`);
        this.socket.removeAllListeners(`newPlayer`);
        this.socket.removeAllListeners(`cursorMove`);
    }


}