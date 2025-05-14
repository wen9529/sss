// server.js (或你的后端主文件名)

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // 在生产环境中，这里应该指定你的前端的确切来源
        methods: ["GET", "POST"]
    }
});

// --- 端口修改在这里 ---
// Serv00 通常会通过 process.env.PORT 设置分配的端口。
// 如果直接指定，请确保这是 Serv00 允许你使用的端口。
const ASSIGNED_PORT = 34709; // 你指定的端口
const PORT = process.env.PORT || ASSIGNED_PORT;
// --- 结束端口修改 ---

// (可选) 托管前端静态文件 - 路径需要根据你的项目结构调整
// 假设你的前端文件在项目根目录的 'public' 或 'frontend' 文件夹下
// const frontendPath = path.join(__dirname, '..', 'frontend'); // 如果后端在子目录
// app.use(express.static(frontendPath));
// app.get('*', (req, res) => {
//   res.sendFile(path.join(frontendPath, 'index.html'));
// });

let gameRooms = {}; 

io.on('connection', (socket) => {
    console.log('一个玩家连接:', socket.id);

    // --- 创建房间逻辑 (示例) ---
    socket.on('createRoom', (callback) => {
        const roomId = Math.random().toString(36).substr(2, 5).toUpperCase();
        socket.join(roomId);
        gameRooms[roomId] = {
            id: roomId,
            players: [{ id: socket.id, name: `玩家${socket.id.substr(0,4)}`, hand: [], arrangedHands: null, score: 0, isReady: false }],
            gameState: { deck: [], turn: null, phase: 'waiting' },
            maxPlayers: 2
        };
        console.log(`房间 ${roomId} 已创建，玩家 ${socket.id} 加入`);
        // 将玩家的完整信息（包括id）返回给创建者
        callback({ success: true, roomId: roomId, player: gameRooms[roomId].players[0] });
        // 不需要立即发送 roomUpdate 给创建者，因为他已经通过回调拿到了信息
    });

    // --- 加入房间逻辑 (示例) ---
    socket.on('joinRoom', (roomId, callback) => {
        if (gameRooms[roomId]) {
            if (gameRooms[roomId].players.length < gameRooms[roomId].maxPlayers) {
                socket.join(roomId);
                const newPlayer = { id: socket.id, name: `玩家${socket.id.substr(0,4)}`, hand: [], arrangedHands: null, score: 0, isReady: false };
                gameRooms[roomId].players.push(newPlayer);
                console.log(`玩家 ${socket.id} 加入房间 ${roomId}`);
                // 返回整个房间信息和新玩家信息给加入者
                callback({ success: true, room: gameRooms[roomId], player: newPlayer });
                // 通知房间内所有其他玩家有新玩家加入和房间更新
                socket.to(roomId).emit('playerJoined', newPlayer); // 通知其他人新玩家信息
                io.to(roomId).emit('roomUpdate', gameRooms[roomId]); // 广播更新后的房间信息
            } else {
                callback({ success: false, message: "房间已满" });
            }
        } else {
            callback({ success: false, message: "房间不存在" });
        }
    });
    
    // --- 玩家准备逻辑 (示例) ---
    socket.on('playerReady', (roomId) => {
        const room = gameRooms[roomId];
        if (room) {
            const player = room.players.find(p => p.id === socket.id);
            if (player) {
                player.isReady = !player.isReady; // 切换准备状态
                console.log(`玩家 ${player.name} 在房间 ${roomId} 准备状态: ${player.isReady}`);
                io.to(roomId).emit('roomUpdate', room); // 更新房间状态

                if (room.players.length === room.maxPlayers && room.players.every(p => p.isReady)) {
                    startGame(roomId); // 如果所有人都准备好了，开始游戏
                }
            }
        }
    });
        
    // --- 提交摆牌逻辑 (示例) ---
    socket.on('submitArrangement', (roomId, arrangedCards) => {
        const room = gameRooms[roomId];
        if (room && room.gameState.phase === 'arranging') {
            const player = room.players.find(p => p.id === socket.id);
            if (player && !player.arrangedHands) { //确保玩家之前没提交过
                player.arrangedHands = arrangedCards; 
                console.log(`玩家 ${socket.id} 在房间 ${roomId} 提交了摆牌`);
                // 通知房间内所有玩家（包括自己，让自己知道已成功提交）该玩家已摆好牌
                io.to(roomId).emit('playerArranged', { playerId: socket.id, playerName: player.name }); 
                
                if (room.players.every(p => p.arrangedHands !== null)) {
                    calculateResults(roomId);
                }
            }
        }
    });

    // --- 断开连接逻辑 (示例) ---
    socket.on('disconnect', () => {
        console.log('玩家断开连接:', socket.id);
        for (const roomId in gameRooms) {
            const room = gameRooms[roomId];
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex > -1) {
                const leavingPlayer = room.players.splice(playerIndex, 1)[0];
                console.log(`玩家 ${leavingPlayer.name} 离开房间 ${roomId}`);
                if (room.players.length === 0) {
                    console.log(`房间 ${roomId} 为空，已删除`);
                    delete gameRooms[roomId];
                } else {
                    // 如果游戏正在进行中，可能需要特殊处理，比如标记玩家逃跑，或者结束当前局
                    if (room.gameState.phase !== 'waiting' && room.gameState.phase !== 'gameOver') {
                         // 简单处理：直接结束本局，通知剩余玩家
                        io.to(roomId).emit('playerLeftMidGame', { 
                            message: `${leavingPlayer.name} 已离开，本局游戏结束。`,
                            remainingPlayers: room.players 
                        });
                        room.gameState.phase = 'gameOver'; // 或者 'waiting'
                        room.players.forEach(p => { // 重置其他玩家状态为未准备，以开始新局
                            p.isReady = false;
                            p.arrangedHands = null;
                            p.hand = [];
                        });
                    }
                    io.to(roomId).emit('playerLeft', { playerId: socket.id, playerName: leavingPlayer.name });
                    io.to(roomId).emit('roomUpdate', room);
                }
                break;
            }
        }
    });

    // --- 服务器端游戏核心逻辑函数 (你需要从前端移植或重写这些) ---
    // 这些函数 (createDeck_S, shuffleDeck_S, dealHand_S, comparePlayerHands, startGame, calculateResults)
    // 需要你根据十三水的规则和你的具体实现来填充。
    // 它们应该处理牌的创建、洗牌、发牌、牌型判断、比牌、计分等。
    // 再次强调：这些逻辑在多人游戏中必须在服务器端权威执行。
    const SUITS_SERVER = ['clubs', 'diamonds', 'hearts', 'spades'];
    const RANKS_SERVER = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    const RANK_VALUES_SERVER = {'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'jack':11,'queen':12,'king':13,'ace':14};

    function createDeck_S() { /* ... */ }
    function shuffleDeck_S(deck) { /* ... */ return deck; }
    function dealHand_S(deck, num) { /* ... */ return []; }
    function serverSideEvaluateArrangement(arrangedCards, originalHand) { /* ... */ return {}; }
    function comparePlayerHands(p1, p2, p1Eval, p2Eval) { /* ... */ return { player1ScoreChange: 0, player2ScoreChange: 0, details: "比牌详情..."}; }

    function startGame(roomId) {
        const room = gameRooms[roomId];
        if (!room || room.players.length !== room.maxPlayers) return; // 确保人数足够

        console.log(`房间 ${roomId} 开始游戏!`);
        room.gameState.phase = 'dealing';
        io.to(roomId).emit('gameStart', { roomId: room.id, players: room.players.map(p=>({id:p.id, name:p.name})) });

        const deck = shuffleDeck_S(createDeck_S());
        room.gameState.deck = [...deck]; // 保存一份原始牌堆副本

        room.players.forEach(player => {
            player.hand = dealHand_S(deck, 13); // 从实际牌堆发牌
            player.arrangedHands = null;
            // player.isReady = false; // 准备状态在开始游戏后应该重置，但通常在局结束后重置
            io.to(player.id).emit('dealHand', player.hand);
        });
        
        room.gameState.phase = 'arranging';
        io.to(roomId).emit('startArranging'); 
        io.to(roomId).emit('roomUpdate', room); // 更新房间状态
    }
    
    function calculateResults(roomId) {
        const room = gameRooms[roomId];
        if (!room || !room.players.every(p => p.arrangedHands)) return;

        room.gameState.phase = 'comparing';
        console.log(`房间 ${roomId} 进行比牌...`);

        // 为每个玩家评估牌型 (这里应该是服务器端的评估逻辑)
        room.players.forEach(player => {
            // 你需要一个服务器端的函数来评估牌，并验证是否倒水等
            // player.evaluatedArrangement = serverSideEvaluateArrangement(player.arrangedHands, player.originalFullHand);
            // 简单示例，实际应包含牌型、分数、是否倒水等
            player.evaluatedArrangement = { typeInfo: "服务器评估结果", isValid: true }; 
        });

        let comparisonResults = [];
        // 两两比牌逻辑 (简化为2人)
        if (room.players.length === 2) {
            const p1 = room.players[0];
            const p2 = room.players[1];
            // const result = comparePlayerHands(p1, p2, p1.evaluatedArrangement, p2.evaluatedArrangement);
            // p1.score += result.player1ScoreChange;
            // p2.score += result.player2ScoreChange;
            // comparisonResults.push({p1: p1.id, p2: p2.id, details: result.details});
        } else {
            // 多人比牌逻辑更复杂，通常是循环赛或特定规则
        }

        io.to(roomId).emit('gameResults', {
            playersData: room.players.map(p => ({ 
                id: p.id, 
                name: p.name, 
                arrangedHands: p.arrangedHands, 
                evaluatedArrangement: p.evaluatedArrangement, // 发送服务器评估结果
                score: p.score 
            })),
            comparisonDetails: comparisonResults
        });
            
        room.gameState.phase = 'gameOver'; 
        room.players.forEach(p => {
            p.arrangedHands = null; // 清空本局摆牌
            p.hand = [];            // 清空手牌
            p.isReady = false;      // 重置准备状态
        });
        io.to(roomId).emit('roomUpdate', room); // 通知房间状态已变为gameOver，可以准备下一局
    }
});

server.listen(PORT, '0.0.0.0', () => { // 确保监听在 0.0.0.0
    console.log(`后端服务器运行在 http://0.0.0.0:${PORT}`);
});
