// js/main.js

// ... (其他 import 语句) ...
// 如果你是通过 <script> 标签引入的 Socket.IO，则不需要下面这行 import
// import { io } from "socket.io-client"; // 仅当你使用 npm 安装 socket.io-client 并用构建工具时

let socket;
let currentPlayer = null; 
let currentRoom = null;  
// gameState 对象的定义保持不变

// --- 修改 Socket.IO 初始化和事件处理 ---
function initializeSocket() {
    // --- 连接地址修改在这里 ---
    // 假设你的 Serv00 域名是 your-username.serv00.net (或其他 Serv00 提供的域名)
    // **你需要将 "your-username.serv00.net" 替换为你的实际 Serv00 域名**
    const SERVER_HOST = "your-username.serv00.net"; // <--- 替换这里!
    const SERVER_PORT = 45078;

    // Serv00 通常支持 wss (安全 WebSocket) 如果你配置了SSL。
    // 如果没有SSL，或者不确定，先尝试 ws。
    // socket = io(`ws://${SERVER_HOST}:${SERVER_PORT}`);
    // 优先尝试安全连接：
    socket = io(`wss://${SERVER_HOST}:${SERVER_PORT}`, {
        transports: ['websocket'], // 强制使用 WebSocket，避免轮询问题
        // upgrade: false, // 有时在某些代理环境下需要
        // reconnectionAttempts: 5, // 尝试重连次数
        // timeout: 10000, // 连接超时时间
    });

    // 如果上面的 wss 连接失败，或者 Serv00 要求特定配置，你可能需要回退到 ws，
    // 或者查看 Serv00 关于 Node.js + Socket.IO 的文档。
    // 如果 Serv00 做了反向代理，将一个标准端口 (如443 for wss) 映射到你的34709，
    // 那么你可能不需要指定端口：socket = io(`wss://${SERVER_HOST}`);
    // --- 结束连接地址修改 ---


    socket.on("connect", () => {
        console.log("已连接到服务器!", socket.id);
        UI.showMessage("已连接到服务器!", "success");
        // 连接成功后，可以显示创建/加入房间的UI
        // 例如，可以调用一个函数来显示房间选择界面
        // showRoomSelectionUI(); 
    });

    socket.on("connect_error", (err) => {
        console.error("连接错误:", err.message, err.description, err.data);
        UI.showMessage(`连接服务器失败: ${err.message}. 请检查地址或网络.`, "error");
        // 可以尝试显示一个重连按钮或提示用户检查网络
    });

    socket.on("disconnect", (reason) => {
        console.log("与服务器断开连接:", reason);
        UI.showMessage("与服务器断开连接: " + reason, "error");
        currentRoom = null;
        currentPlayer = null;
        gameState.isGameActive = false;
        // 可能需要重置UI到初始状态，比如显示房间选择界面
        // showRoomSelectionUI(); 
        updateAllUI(); // 刷新UI以反映断开连接的状态
    });

    // --- 房间相关事件监听 ---
    socket.on("roomUpdate", (roomData) => {
        console.log("房间信息更新:", roomData);
        currentRoom = roomData;
        // 查找当前玩家在更新后的房间数据中的信息
        if (currentPlayer && roomData && roomData.players) {
            const updatedPlayerSelf = roomData.players.find(p => p.id === currentPlayer.id);
            if (updatedPlayerSelf) {
                currentPlayer = updatedPlayerSelf; // 更新本地 currentPlayer 对象
            }
        }
        // 更新UI以反映房间状态（玩家列表、准备状态、游戏阶段等）
        // 你需要一个 UI 函数来处理这个，例如:
        // UI.renderRoomDetails(currentRoom, currentPlayer ? currentPlayer.id : null);
        // UI.updatePlayerList(currentRoom.players, currentPlayer ? currentPlayer.id : null);
        // UI.updateGamePhase(currentRoom.gameState.phase);
        console.log("房间已更新，当前玩家:", currentPlayer ? currentPlayer.name : "无", "准备状态:", currentPlayer ? currentPlayer.isReady : "N/A");
    });
    
    socket.on("playerJoined", (newPlayer) => {
        UI.showMessage(`${newPlayer.name} 加入了房间!`, "info");
        // UI.addPlayerToList(newPlayer); // 如果你有玩家列表UI
    });
    
    socket.on("playerLeft", ({playerId, playerName}) => {
        UI.showMessage(`${playerName} 离开了房间.`, "info");
        // UI.removePlayerFromList(playerId); // 如果你有玩家列表UI
        if (currentRoom && currentRoom.players) { // 更新本地房间玩家列表
            currentRoom.players = currentRoom.players.filter(p => p.id !== playerId);
        }
    });

    socket.on("playerLeftMidGame", ({ message, remainingPlayers }) => {
        UI.showMessage(message, "error");
        gameState.isGameActive = false; // 游戏非活动状态
        // 可能需要重置UI，显示等待开始新局的提示
        // UI.showGameOverScreen(message);
    });


    // --- 游戏逻辑相关事件监听 ---
    socket.on("dealHand", (hand) => { 
        console.log("收到手牌:", hand);
        if (Array.isArray(hand)) {
            gameState.playerHand = hand.map(cData => new Card(cData.suit, cData.rank)); 
            gameState.arrangedHands = { front: [], middle: [], back: [] }; 
            gameState.isGameActive = true;
            // gameState.isArrangementSubmitted = false; // 重置提交状态
            gameState.currentSelectedCardInfo = null;
            UI.showMessage("已收到手牌，请摆牌！");
            updateAllUI(); 
            resetTimer();
            startTimer();
            // 隐藏“准备”按钮，显示“提交摆牌”按钮
            // UI.showSubmitButton();
            // UI.hideReadyButton();
        } else {
            console.error("收到的手牌数据格式不正确:", hand);
        }
    });
    
    socket.on("gameStart", (gameInfo) => { // gameInfo 可能包含房间ID和玩家列表
        UI.showMessage("游戏开始！正在发牌...", "success");
        // UI.hideRoomSelection(); // 隐藏房间选择界面
        // UI.showGameBoard();     // 显示游戏板
        // UI.updatePlayerNames(gameInfo.players); // 显示对手名字等
    });

    socket.on("startArranging", () => {
        UI.showMessage("请开始摆牌！", "info");
        // gameState.isArrangementSubmitted = false;
        // 启用摆牌相关的UI交互
    });

    socket.on("playerArranged", ({playerId, playerName}) => {
        if (playerId === (currentPlayer ? currentPlayer.id : null)) {
            UI.showMessage("你的摆牌已提交。", "success");
            // UI.disableArrangementControls(); // 禁用自己的摆牌区交互
        } else {
            UI.showMessage(`${playerName} 已完成摆牌。`);
            // UI.markPlayerAsArranged(playerId); // 在UI上标记其他玩家已完成
        }
    });

    socket.on("gameResults", (resultsData) => {
        console.log("游戏结果:", resultsData);
        stopTimer();
        gameState.isGameActive = false; // 一局结束，等待下一局的准备
        // gameState.isArrangementSubmitted = false;
        
        // UI.displayGameResults(resultsData, currentPlayer ? currentPlayer.id : null);
        
        if (currentPlayer) {
            const myResult = resultsData.playersData.find(p => p.id === currentPlayer.id);
            if (myResult) {
                // gameState.totalScore = myResult.score; // 服务器应该已经返回了更新后的总分
                currentPlayer.score = myResult.score; // 更新本地currentPlayer对象中的分数
            }
        }
        UI.updateTotalScoreDisplay(currentPlayer ? currentPlayer.score : gameState.totalScore); // 使用currentPlayer的分数
        UI.showMessage("比牌结束！查看结果。", "success");
        
        // UI.showReadyButton(); // 显示准备按钮，开始下一局
        // UI.hideSubmitButton();
        // 清理各玩家的牌面显示，但保留结果展示直到玩家准备下一局
        // 例如，可以有一个专门的结果展示模态框，或者在牌桌上直接展示
        // updateAllUI(); // 刷新以清除手牌和摆牌区（如果服务器逻辑是这样设计的）
    });
    
    socket.on("custom_error", (errorMessage) => { // 注意事件名与服务器端一致
        UI.showMessage(`服务器错误: ${errorMessage}`, "error");
    });

    // --- 新增：发送创建/加入房间的函数 (示例) ---
    // 你需要在HTML中添加相应的输入框和按钮来触发这些函数
    // window.createRoom = () => { // 挂在window上方便从控制台测试
    //     socket.emit('createRoom', (response) => {
    //         if (response.success) {
    //             currentPlayer = response.player; // 保存自己的玩家信息
    //             currentRoom = { id: response.roomId, players: [response.player], gameState: {phase: 'waiting'}, maxPlayers: 2 }; // 初始化房间信息
    //             UI.showMessage(`房间 ${response.roomId} 已创建！等待其他玩家加入。您的ID: ${currentPlayer.id}`, "success");
    //             // UI.updateRoomInfo(currentRoom, currentPlayer.id);
    //             // UI.showReadyButton();
    //         } else {
    //             UI.showMessage(`创建房间失败: ${response.message}`, "error");
    //         }
    //     });
    // };

    // window.joinRoom = (roomId) => {
    //     if (!roomId) {
    //         const roomIdFromInput = document.getElementById('roomIdInput').value; // 假设你有这个输入框
    //         if (!roomIdFromInput) {
    //             UI.showMessage("请输入房间ID", "error"); return;
    //         }
    //         roomId = roomIdFromInput;
    //     }
    //     socket.emit('joinRoom', roomId, (response) => {
    //         if (response.success) {
    //             currentPlayer = response.player; // 保存自己的玩家信息
    //             currentRoom = response.room;     // 保存房间信息
    //             UI.showMessage(`已加入房间 ${currentRoom.id}! 您的ID: ${currentPlayer.id}`, "success");
    //             // UI.updateRoomInfo(currentRoom, currentPlayer.id);
    //             // UI.showReadyButton();
    //         } else {
    //             UI.showMessage(`加入房间失败: ${response.message}`, "error");
    //         }
    //     });
    // };
}


// --- 修改现有函数以适应多人游戏逻辑 ---
function initializeNewGame() { 
    if (socket && currentRoom && currentPlayer) {
        // 切换准备状态
        socket.emit('playerReady', currentRoom.id);
        // UI的反馈应该基于服务器返回的 roomUpdate 事件
        // UI.showMessage(currentPlayer.isReady ? "已取消准备" : "已准备，等待其他玩家...", "info");
    } else {
        UI.showMessage("请先创建或加入一个房间。", "error");
    }
}

// resetCurrentGameArrangement 函数基本可以保持不变，它只影响本地UI和数据，
// 最终的摆牌通过 checkAndDisplayArrangement (即“提交摆牌”) 发送。

function checkAndDisplayArrangement() { // 这个函数现在是“确认并提交摆牌”
    if (!gameState.isGameActive || !currentRoom || currentRoom.gameState.phase !== 'arranging') {
        UI.showMessage("现在不是摆牌阶段或游戏未激活。", "info");
        return;
    }
    // if(gameState.isArrangementSubmitted) {
    //     UI.showMessage("您已提交过摆牌。", "info");
    //     return;
    // }

    // 1. 本地评估和验证（给玩家即时反馈）
    const allPlayerCards = [...gameState.playerHand, ...gameState.arrangedHands.front, ...gameState.arrangedHands.middle, ...gameState.arrangedHands.back].filter(c=>c);
    const uniqueAllPlayerCards = Array.from(new Set(allPlayerCards.map(c => c.id))).map(id => allPlayerCards.find(c => c.id === id));
    const { scores, handInfos, globalSpecialHand, isFullyArranged } = getArrangementScores(gameState.arrangedHands, uniqueAllPlayerCards);
    const validation = isFullyArranged ? validateArrangement(handInfos) : { isValid: false, message: "牌未摆满。" };

    let finalMessage = validation.message;
    if (validation.isValid && globalSpecialHand) {
        finalMessage += ` 特殊牌型: ${globalSpecialHand.type.name}! (值 ${globalSpecialHand.score} 水)`;
    } else if (validation.isValid && isFullyArranged) {
        finalMessage += ` (本地预估)道次加分: ${scores.front + scores.middle + scores.back} 水.`;
    }
    UI.showValidationResult(finalMessage, validation.isValid); // 显示本地验证结果

    if (!isFullyArranged) {
        UI.showMessage("请将所有13张牌摆好。", "error");
        return;
    }
    if (!validation.isValid) {
        UI.showMessage("摆牌不合法 (倒水)，请调整。", "error");
        UI.playSound(UI.DOMElements.audioInvalid);
        return;
    }

    // 2. 如果本地验证通过，则提交给服务器
    const arrangedDataToSend = {
        front: gameState.arrangedHands.front.map(c => ({id: c.id, suit: c.suit, rank:c.rank})),
        middle: gameState.arrangedHands.middle.map(c => ({id: c.id, suit: c.suit, rank:c.rank})),
        back: gameState.arrangedHands.back.map(c => ({id: c.id, suit: c.suit, rank:c.rank})),
    };
    socket.emit('submitArrangement', currentRoom.id, arrangedDataToSend);
    // UI.showMessage("已提交摆牌，等待其他玩家...", "success"); // 这个消息由服务器的 playerArranged 事件触发更好
    // gameState.isArrangementSubmitted = true;
    // UI.disableArrangementControls(); // 禁用摆牌区
}

// updateAllUI, moveCard, attemptAutoArrange 等函数主要处理本地UI和 gameState.playerHand, gameState.arrangedHands
// 它们在多人模式下仍然有用，用于玩家与自己牌的交互。
// 只是它们的操作结果最终要通过 "submitArrangement" 发送给服务器。
// saveCurrentGameState 和 tryLoadGame 在多人模式下意义不大，因为权威状态在服务器。

// --- 确保 DOMContentLoaded 中初始化 socket ---
document.addEventListener('DOMContentLoaded', () => {
    initializeSocket(); // 初始化Socket连接
    // UI.initializeUI(eventHandlers); // UI事件绑定可能需要调整以适应新的流程
    
    // 重新组织 eventHandlers，有些按钮的行为变了
    const eventHandlers = {
        onDeal: initializeNewGame, // "发牌"按钮现在是"准备/取消准备"
        onReset: resetCurrentGameArrangement,
        onCheck: checkAndDisplayArrangement, // "检查摆牌"按钮现在是"提交摆牌"
        onAutoArrange: attemptAutoArrange,
        onCardDrop: moveCard, 
        onCardPlaceByClick: handleZoneClickForPlacement, 
        onFindCardDataById: findCardDataByIdFromGameState 
    };
    UI.initializeUI(eventHandlers); // 初始化UI事件绑定

    // (点击区域放牌的逻辑保持不变)
    [UI.DOMElements.playerHand, UI.DOMElements.frontHand, UI.DOMElements.middleHand, UI.DOMElements.backHand].forEach(zone => {
        zone.addEventListener('click', (event) => {
            if (event.target === zone && gameState.currentSelectedCardInfo && gameState.currentSelectedCardInfo.data) {
                 handleZoneClickForPlacement(zone.dataset.zoneId);
            }
        });
    });

    // 初始时不主动加载本地游戏，而是等待连接和房间信息
    if (!gameState.isGameActive){
        if(UI.DOMElements.playerHandCount) UI.DOMElements.playerHandCount.textContent = '0';
        UI.showMessage("请连接服务器并创建/加入房间开始游戏。", "info");
        if(UI.DOMElements.totalScoreDisplay) UI.updateTotalScoreDisplay(0);
        updateAllUI(); 
    }
});

// --- 其他辅助函数 (updateAllUI, moveCard, attemptAutoArrange, performLocalEvaluationAndValidation 等) 需要保留并确保它们操作的是本地 gameState ---
// performLocalEvaluationAndValidation 是一个你需要创建的函数，它封装了本地的牌型评估和倒水检查逻辑，
// 并返回类似 { scores, handInfos, globalSpecialHand, isFullyArranged, validation } 的对象。
// 它的作用是在用户提交前给用户一个即时反馈。
function performLocalEvaluationAndValidation() {
    const allPlayerCards = [...(gameState.playerHand || []), ...(gameState.arrangedHands.front || []), ...(gameState.arrangedHands.middle || []), ...(gameState.arrangedHands.back || [])].filter(c=>c);
    const uniqueAllPlayerCards = Array.from(new Set(allPlayerCards.map(c => c.id))).map(id => allPlayerCards.find(c => c.id === id));
    
    const { scores, handInfos, globalSpecialHand, isFullyArranged } = getArrangementScores(gameState.arrangedHands, uniqueAllPlayerCards);
    const validation = isFullyArranged ? validateArrangement(handInfos) : { isValid: false, message: "牌未摆满。" };
    
    return { scores, handInfos, globalSpecialHand, isFullyArranged, validation };
}
// gameState, timerInterval, secondsElapsed 等变量声明在文件顶部
// formatTime, startTimer, stopTimer, resetTimer 函数声明在文件顶部
// findCardDataByIdFromGameState 函数声明在文件顶部
// Card 类实例的创建 (new Card(...)) 需要确保 Card 类定义被正确导入或在同一文件内

// 确保 Card 类定义可用 (可以从 card.js 导入，或者如果 card.js 很小，直接包含在这里)
// 假设 Card 类已通过 import { Card } from './card.js'; 导入
