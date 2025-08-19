// server.js
const http = require('http');
const { Server } = require("socket.io");

const server = http.createServer();
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

let players = {};

function getRandomInitialPosition() {
    return {
        x: Math.floor(Math.random() * 10),
        y: Math.floor(Math.random() * 10)
    };
}

io.on('connection', (socket) => {
    console.log(`[CONEXÃO] ID: ${socket.id}`);

    socket.on('playerJoined', (playerData) => {
        const initialPosition = getRandomInitialPosition();
        players[socket.id] = {
            id: socket.id,
            name: playerData.name,
            color: playerData.color,
            x: initialPosition.x,
            y: initialPosition.y
        };
        console.log(`[ENTROU] Jogador '${playerData.name}' (${socket.id})`);
        io.emit('updatePlayers', players);
    });

    socket.on('playerMove', (targetPos) => {
        if (players[socket.id]) {
            players[socket.id].x = targetPos.x;
            players[socket.id].y = targetPos.y;
            io.emit('updatePlayers', players);
        }
    });

    socket.on('playerChat', (message) => {
        if (players[socket.id]) {
            io.emit('chatMessage', { playerId: socket.id, message: message });
        }
    });

    socket.on('disconnect', () => {
        console.log(`[DESCONEXÃO] ID: ${socket.id}`);
        delete players[socket.id];
        io.emit('updatePlayers', players);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor Multiplayer rodando na porta ${PORT}`);
});
