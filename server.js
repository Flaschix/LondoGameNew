const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const redis = require('redis');
const { v4: uuidv4 } = require('uuid');

const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        tls: false,
        rejectUnauthorized: false
    }
});

redisClient.connect().catch(console.error);

redisClient.on('error', (err) => {
    console.log('Redis Client Error', err);
});

redisClient.on('connect', () => {
    console.log('Connected to Redis');
});

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname + '/public'));

const rooms = {};

function generateRoomCode(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('New client connected');

    //При нажатии на кнопку "создать комнату" на сервере создаётся новая комната и пользователю отправляеться код этой комнаты.
    socket.on('createRoom', async () => {
        console.log('createRoom');
        let preCode;
        let check

        do {
            preCode = `${generateRoomCode(100000, 999999)}`
            check = await redisClient.get(preCode);
        } while (check != null)

        const roomCode = preCode;
        const roomId = uuidv4();

        try {
            await redisClient.set(roomCode, roomId, { EX: 86400 }); // Устанавливаем срок действия 24 часа 86400
            rooms[roomId] = {};
            rooms[roomId].players = {}

            socket.emit('roomCreated', roomCode);
            console.log(`Room created with code: ${roomCode}`);
        } catch (err) {
            console.error('Error creating room:', err);
        }
    });

    //Этот метод проверяет существует ли комната с введённым кодом от пользователя. Если существует то возвращает пользователю снова этот код. Если не существует то сообщает об этом.
    socket.on('checkRoom', async (roomCode) => {
        try {
            const roomId = await redisClient.get(roomCode);
            if (!roomId) {
                socket.emit('roomNotFound');
                return;
            } else {
                socket.emit('roomExists', roomCode);
                return;
            }
        } catch (err) {
            console.error('Error checking room:', err);
            socket.emit('error', 'An error occurred');
        }
    });

    //В этом методе сервер принимает введёные данные пользователем и подключает его к комнате
    socket.on('joinRoom', async ({ roomCode, avatar, username }) => {
        try {
            const roomId = await redisClient.get(roomCode);
            if (!roomId) {
                socket.emit('error', 'Room not found');
                return;
            } else {
                socket.emit('joined', null);
            }

            if (!rooms[roomId]) {
                rooms[roomId] = {};
                rooms[roomId].players = {}
            }

            socket.join(roomId);
            socket.roomId = roomId;

            rooms[roomId].players[socket.id] = { id: socket.id, character: avatar, name: username, room: roomCode };

            // Уведомляем других игроков о новом игроке
            socket.to(`${roomId}`).emit('newPlayer', rooms[roomId].players[socket.id]);

            socket.on('disconnect', () => {
                console.log('Client disconnected');
                if (rooms[roomId]) {
                    delete rooms[roomId].players[socket.id];
                    io.to(`${roomId}`).emit('playerDisconnected', socket.id);
                }
            });

            //Отправляем информацию о текущих игроках новому игроку
            socket.on('getPlayers', () => {
                socket.emit('exitstedPlayers', rooms[roomId].players);
            });

            socket.on('playerReconnect', (newSettings) => {
                if (rooms[roomId].players[socket.id]) {
                    rooms[roomId].players[socket.id] = { id: socket.id, character: newSettings.avatar, name: newSettings.name, room: roomCode };
                    io.to(`${roomId}`).emit('playerReconected', rooms[roomId].players[socket.id]);
                }
            });

            socket.on('cursorMove', (data) => {
                socket.to(`${roomId}`).emit('cursorMove', data);
            });
        } catch (err) {
            console.error('Error joining room:', err);
            socket.emit('error', 'An error occurred');
        }
    });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

