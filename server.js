// server.js - Versão com Detecção de Colisão

const http = require('http');
const { Server } = require("socket.io");

const server = http.createServer();
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

let players = {};

function getRandomInitialPosition() {
    // Procura por um tile inicial que não esteja ocupado
    let pos;
    let isOccupied = true;
    while (isOccupied) {
        pos = {
            x: Math.floor(Math.random() * 10),
            y: Math.floor(Math.random() * 10)
        };
        isOccupied = Object.values(players).some(p => p.x === pos.x && p.y === pos.y);
    }
    return pos;
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

    // --- LÓGICA DE COLISÃO ADICIONADA AQUI ---
    socket.on('playerMove', (targetPos) => {
        let isOccupied = false;
        // Verifica se a posição de destino já está ocupada por outro jogador
        for (const playerId in players) {
            if (playerId !== socket.id) { // Não checar contra si mesmo
                const otherPlayer = players[playerId];
                if (otherPlayer.x === targetPos.x && otherPlayer.y === targetPos.y) {
                    isOccupied = true;
                    break;
                }
            }
        }

        // Se a casa NÃO estiver ocupada, permite o movimento
        if (!isOccupied && players[socket.id]) {
            players[socket.id].x = targetPos.x;
            players[socket.id].y = targetPos.y;
            // Avisa todos os jogadores sobre a nova posição
            io.emit('updatePlayers', players);
        }
        // Se a casa estiver ocupada, o servidor simplesmente ignora o pedido.
        // O jogador não se moverá e permanecerá na sua última posição válida.
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
    console.log(`Servidor Multiplayer (com colisão) rodando na porta ${PORT}`);
});
