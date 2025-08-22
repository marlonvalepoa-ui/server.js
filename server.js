const http = require('http');
const { Server } = require("socket.io");

const server = http.createServer();
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// --- NOVO: Adicionado o mapa de cores para o servidor saber o layout do cenário ---
const colors = { preto: 0, laranja: 16753920, vinho: 8388608, amarelo: 16776960, branco: 16777215, verde: 10020019 };
const customColorMap = [
    [colors.verde, colors.verde, colors.verde, colors.verde, colors.verde, colors.verde, colors.verde, colors.verde, colors.verde, colors.verde], 
    [colors.verde, colors.preto, colors.preto, colors.preto, colors.preto, colors.preto, colors.preto, colors.preto, colors.preto, colors.preto], 
    [colors.verde, colors.preto, colors.preto, colors.preto, colors.preto, colors.amarelo, colors.vinho, colors.vinho, colors.amarelo, colors.preto], 
    [colors.verde, colors.preto, colors.preto, colors.preto, colors.preto, colors.branco, colors.branco, colors.branco, colors.branco, colors.preto], 
    [colors.verde, colors.preto, colors.preto, colors.preto, colors.preto, colors.branco, colors.preto, colors.preto, colors.branco, colors.preto], 
    [colors.verde, colors.preto, colors.preto, colors.preto, colors.preto, colors.branco, colors.preto, colors.preto, colors.branco, colors.preto], 
    [colors.verde, colors.branco, colors.preto, colors.laranja, colors.branco, colors.laranja, colors.branco, colors.branco, colors.laranja, colors.preto], 
    [colors.verde, colors.branco, colors.preto, colors.branco, colors.preto, colors.branco, colors.preto, colors.preto, colors.branco, colors.preto],
    [colors.verde, colors.branco, colors.preto, colors.branco, colors.preto, colors.laranja, colors.branco, colors.branco, colors.laranja, colors.preto],  
    [colors.verde, colors.branco, colors.preto, colors.branco, colors.preto, colors.branco, colors.preto, colors.preto, colors.branco, colors.preto],
    [colors.verde, colors.branco, colors.preto, colors.laranja, colors.branco, colors.laranja, colors.branco, colors.branco, colors.laranja, colors.preto],
    [colors.verde, colors.branco, colors.preto, colors.branco, colors.preto, colors.branco, colors.preto, colors.preto, colors.branco, colors.preto],
    [colors.verde, colors.branco, colors.preto, colors.branco, colors.preto, colors.laranja, colors.branco, colors.branco, colors.laranja, colors.preto],  
    [colors.verde, colors.branco, colors.preto, colors.branco, colors.preto, colors.branco, colors.preto, colors.preto, colors.branco, colors.preto],
    [colors.verde, colors.laranja, colors.branco, colors.laranja, colors.branco, colors.laranja, colors.branco, colors.branco, colors.laranja, colors.preto],               
    [colors.preto, colors.preto, colors.preto, colors.preto, colors.preto, colors.preto, colors.preto, colors.preto, colors.preto, colors.preto], 
    [colors.verde, colors.branco, colors.branco, colors.preto, colors.branco, colors.branco, colors.preto, colors.preto], 
    [colors.verde, colors.branco, colors.preto, colors.branco, colors.preto, colors.preto, colors.branco, colors.preto], 
];
// ---------------------------------------------------------------------------------

let players = {};

// --- ALTERADO: Função de spawn agora verifica se o tile não é um buraco ---
function getRandomInitialPosition() {
    let pos;
    let isValid = false;
    let attempts = 0; // Previne um loop infinito
    const mapHeight = customColorMap.length;

    while (!isValid && attempts < 200) {
        const y = Math.floor(Math.random() * mapHeight);
        if (customColorMap[y]) {
            const mapWidth = customColorMap[y].length;
            const x = Math.floor(Math.random() * mapWidth);
            pos = { x, y };

            const isWalkable = customColorMap[y][x] !== colors.preto;
            const isOccupied = Object.values(players).some(p => p.x === pos.x && p.y === pos.y);

            if (isWalkable && !isOccupied) {
                isValid = true;
            }
        }
        attempts++;
    }

    if (!isValid) {
        console.warn("Não foi possível encontrar um local válido para spawn. Usando (0,0).");
        return { x: 0, y: 0 }; // Posição segura padrão
    }
    return pos;
}
// ---------------------------------------------------------------------------------


io.on('connection', (socket) => {
    console.log(`[CONEXÃO] ID: ${socket.id}`);

    socket.on('playerJoined', (playerData) => {
        const initialPosition = getRandomInitialPosition();
        players[socket.id] = {
            id: socket.id,
            name: playerData.name,
            color: playerData.color,
            booIndex: playerData.booIndex,
            x: initialPosition.x,
            y: initialPosition.y
        };
        console.log(`[ENTROU] Jogador '${playerData.name}' (${socket.id}) escolheu o Boo #${playerData.booIndex}`);
        io.emit('updatePlayers', players);
    });

    // --- ALTERADO: Lógica de movimento agora valida o tile de destino ---
    socket.on('playerMove', (targetPos) => {
        const player = players[socket.id];
        if (!player) return;

        // 1. Verifica se a posição de destino está dentro dos limites do mapa
        if (targetPos.y < 0 || targetPos.y >= customColorMap.length ||
            targetPos.x < 0 || targetPos.x >= customColorMap[targetPos.y].length) {
            return; // Movimento para fora do mapa é inválido
        }
        
        // 2. Obtém a cor do tile de destino
        const tileColor = customColorMap[targetPos.y][targetPos.x];

        // 3. Se a cor for preta (buraco), rejeita o movimento
        if (tileColor === colors.preto) {
            return; // Não faz nada, o jogador não pode se mover para cá
        }

        // 4. Se o tile é válido, verifica se já não está ocupado por outro jogador
        const isOccupied = Object.values(players).some(p => p.id !== socket.id && p.x === targetPos.x && p.y === targetPos.y);

        if (!isOccupied) {
            player.x = targetPos.x;
            player.y = targetPos.y;
            io.emit('updatePlayers', players);
        }
    });
    // ---------------------------------------------------------------------------------

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

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor Multiplayer rodando em 0.0.0.0:${PORT} e pronto para conexões externas.`);
});
