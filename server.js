// server.js

const http = require('http');
const { Server } = require("socket.io");

// Cria um servidor HTTP base
const server = http.createServer();

// Inicia o servidor Socket.IO, que gerencia a comunicação em tempo real
const io = new Server(server, {
    cors: {
        // ESSENCIAL: Permite que seu site se conecte a este servidor.
        // O "*" permite qualquer site. Para mais segurança, troque por "http://seusite.com".
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Objeto para armazenar os dados de todos os jogadores online
let players = {};

// Função para gerar uma posição inicial aleatória
function getRandomInitialPosition() {
    return {
        x: Math.floor(Math.random() * 10),
        y: Math.floor(Math.random() * 10)
    };
}

// Lógica principal: O que acontece quando um jogador se conecta
io.on('connection', (socket) => {
    console.log(`[CONEXÃO] Novo jogador conectado com o ID: ${socket.id}`);

    // Etapa 1: Jogador entra no jogo com nome e cor
    socket.on('playerJoined', (playerData) => {
        const initialPosition = getRandomInitialPosition();
        players[socket.id] = {
            id: socket.id,
            name: playerData.name,
            color: playerData.color,
            x: initialPosition.x,
            y: initialPosition.y
        };
        console.log(`[ENTROU] Jogador '${playerData.name}' (${socket.id}) se juntou.`);

        // Envia a lista completa de jogadores para TODOS os clientes
        io.emit('updatePlayers', players);
    });

    // Etapa 2: Jogador se move para um novo tile
    socket.on('playerMove', (targetPos) => {
        if (players[socket.id]) {
            players[socket.id].x = targetPos.x;
            players[socket.id].y = targetPos.y;

            // Envia a lista atualizada para TODOS, para que vejam o movimento
            io.emit('updatePlayers', players);
        }
    });

    // Etapa 3: Jogador envia uma mensagem
    socket.on('playerChat', (message) => {
        if (players[socket.id]) {
            // Envia a mensagem e o ID de quem a enviou para TODOS
            io.emit('chatMessage', {
                playerId: socket.id,
                message: message
            });
        }
    });

    // Etapa 4: Jogador fecha a janela (desconecta)
    socket.on('disconnect', () => {
        console.log(`[DESCONEXÃO] Jogador ${socket.id} saiu.`);
        // Remove o jogador da lista
        delete players[socket.id];
        // Envia a lista atualizada para os jogadores restantes
        io.emit('updatePlayers', players);
    });
});

// Define a porta em que o servidor vai rodar
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor Multiplayer está rodando na porta ${PORT}`);
});
