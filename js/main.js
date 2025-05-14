// js/main.js
import { Card, createDeck, shuffleDeck, dealHand } from './card.js';
import * as UI from './ui.js';
import { evaluateHand, compareEvaluatedHands, checkGlobalSpecialHand } from './handEvaluator.js'; // 确保导入
import { getArrangementScores, validateArrangement } from './arrangement.js';
import { getAIArrangement } from './ai.js';
import { saveGameState, loadGameState, clearGameState } from './storage.js';
import { ARRANGEMENT_ZONE_SIZES, HAND_TYPES } from './constants.js'; // 确保导入

let gameState = {
    deck: [],
    playerHand: [],
    arrangedHands: { front: [], middle: [], back: [] },
    currentSelectedCardInfo: null, // { data: Card, sourceZoneId: string } 注意这里只存信息
    isGameActive: false,
    totalScore: 0,
};

let timerInterval = null;
let secondsElapsed = 0;

function findCardDataByIdFromGameState(cardId) {
    let foundCard = gameState.playerHand.find(c => c.id === cardId);
    if (foundCard) return foundCard;
    for (const zone in gameState.arrangedHands) {
        foundCard = gameState.arrangedHands[zone].find(c => c.id === cardId);
        if (foundCard) return foundCard;
    }
    return null;
}


function startTimer() {
    stopTimer();
    secondsElapsed = 0;
    if (UI.DOMElements.timerDisplay) UI.DOMElements.timerDisplay.textContent = formatTime(secondsElapsed);
    timerInterval = setInterval(() => {
        secondsElapsed++;
        if (UI.DOMElements.timerDisplay) UI.DOMElements.timerDisplay.textContent = formatTime(secondsElapsed);
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function resetTimer() {
    stopTimer();
    secondsElapsed = 0;
    if (UI.DOMElements.timerDisplay) UI.DOMElements.timerDisplay.textContent = formatTime(secondsElapsed);
}

function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function initializeNewGame() {
    gameState.deck = shuffleDeck(createDeck());
    gameState.playerHand = dealHand(gameState.deck, 13);
    gameState.arrangedHands = { front: [], middle: [], back: [] };
    gameState.currentSelectedCardInfo = null;
    gameState.isGameActive = true;
    gameState.totalScore = 0;
    
    clearGameState();
    UI.showMessage("新游戏开始，请摆牌！");
    UI.showValidationResult("", true); // 清除旧的验证结果
    UI.updateTotalScoreDisplay(gameState.totalScore);
    updateAllUI();
    resetTimer();
    startTimer();
    UI.playSound(UI.DOMElements.audioDeal);
}

function resetCurrentGameArrangement() { // 只重置摆牌，不重新发牌
    if (!gameState.isGameActive) {
        UI.showMessage("请先发牌开始游戏。", "error");
        return;
    }
    // 将已摆放的牌移回手牌
    gameState.playerHand = [
        ...gameState.playerHand,
        ...gameState.arrangedHands.front,
        ...gameState.arrangedHands.middle,
        ...gameState.arrangedHands.back
    ].filter(c => c) // 过滤可能存在的undefined（理论上不应有）
     .sort((a,b) => a.value - b.value); 

    gameState.arrangedHands = { front: [], middle: [], back: [] };
    gameState.currentSelectedCardInfo = null;
    gameState.totalScore = 0;

    UI.showMessage("牌局已重置，请重新摆牌。");
    UI.showValidationResult("", true);
    UI.updateTotalScoreDisplay(gameState.totalScore);
    updateAllUI();
    resetTimer(); // 重置计时器
    startTimer(); // 重新开始计时
    saveCurrentGameState();
}


function updateAllUI() {
    UI.renderHand(UI.DOMElements.playerHand, gameState.playerHand, handleCardClickInZone);
    
    const allCurrentCards = [
        ...gameState.playerHand,
        ...gameState.arrangedHands.front,
        ...gameState.arrangedHands.middle,
        ...gameState.arrangedHands.back
    ].filter(c => c); // 过滤掉可能的null/undefined
    const uniqueAllCurrentCards = Array.from(new Set(allCurrentCards.map(c => c.id)))
                                   .map(id => allCurrentCards.find(c => c.id === id));


    const { scores, handInfos, globalSpecialHand, isFullyArranged } = getArrangementScores(gameState.arrangedHands, uniqueAllCurrentCards);
    gameState.totalScore = scores.total; // 更新 gameState 中的总分

    UI.renderArrangedZone('front', gameState.arrangedHands.front, handleCardClickInZone, handInfos.front);
    UI.renderArrangedZone('middle', gameState.arrangedHands.middle, handleCardClickInZone, handInfos.middle);
    UI.renderArrangedZone('back', gameState.arrangedHands.back, handleCardClickInZone, handInfos.back);
    UI.updateTotalScoreDisplay(gameState.totalScore);

    if (isFullyArranged) { // 只有牌都摆满了才进行最终检查和提示
        const result = checkAndDisplayArrangement(); // 这个函数现在也更新分数和特殊牌型信息
        if (result.globalSpecialHand) {
            UI.playSound(UI.DOMElements.audioSpecial); // 播放特殊牌型音效
        } else if (result.validation.isValid && gameState.totalScore > 0) {
            UI.playSound(UI.DOMElements.audioWin); // 播放普通胜利/得分音效
        }
    } else {
        UI.showValidationResult("", true); // 未摆满则清除验证信息
        // 清除牌型高亮，如果牌被移走
        ['front', 'middle', 'back'].forEach(zoneId => {
            if(gameState.arrangedHands[zoneId].length < ARRANGEMENT_ZONE_SIZES[zoneId]){
                 UI.renderArrangedZone(zoneId, gameState.arrangedHands[zoneId], handleCardClickInZone, null);
            }
        });
    }
}

function handleCardClickInZone(event, cardData, sourceZoneId) {
    const cardElement = event.currentTarget;

    if (gameState.currentSelectedCardInfo && gameState.currentSelectedCardInfo.data.id === cardData.id) {
        if (gameState.currentSelectedCardInfo.element) { // 从旧的element移除selected
             gameState.currentSelectedCardInfo.element.classList.remove('selected');
        }
        gameState.currentSelectedCardInfo = null;
    } else {
        if (gameState.currentSelectedCardInfo && gameState.currentSelectedCardInfo.element) {
            gameState.currentSelectedCardInfo.element.classList.remove('selected');
        }
        cardElement.classList.add('selected');
        gameState.currentSelectedCardInfo = { data: cardData, sourceZoneId: sourceZoneId, element: cardElement };
        UI.showMessage(`已选择 ${cardData.getDisplayName()} 从 ${sourceZoneId}`);
    }
    UI.playSound(UI.DOMElements.audioClick);
}

function handleZoneClickForPlacement(targetZoneId) {
    if (!gameState.currentSelectedCardInfo || !gameState.currentSelectedCardInfo.data) {
        UI.showMessage("请先选择一张牌。", "error");
        return;
    }
    const { data: cardToMove, sourceZoneId } = gameState.currentSelectedCardInfo;
    moveCard(cardToMove, sourceZoneId, targetZoneId); // 现在传递整个卡牌对象
    
    if (gameState.currentSelectedCardInfo.element) {
         gameState.currentSelectedCardInfo.element.classList.remove('selected');
    }
    gameState.currentSelectedCardInfo = null;
}

// moveCard 现在接收卡牌对象，而不是ID
function moveCard(cardToMoveInstance, fromZoneId, toZoneId) {
    if (!cardToMoveInstance) {
        console.error("尝试移动一个无效的卡牌实例");
        return;
    }
    let cardRemoved = false;

    if (fromZoneId === 'playerHand') {
        const index = gameState.playerHand.findIndex(c => c.id === cardToMoveInstance.id);
        if (index > -1) {
            gameState.playerHand.splice(index, 1);
            cardRemoved = true;
        }
    } else if (gameState.arrangedHands[fromZoneId]) {
        const index = gameState.arrangedHands[fromZoneId].findIndex(c => c.id === cardToMoveInstance.id);
        if (index > -1) {
            gameState.arrangedHands[fromZoneId].splice(index, 1);
            cardRemoved = true;
        }
    }

    if (!cardRemoved) {
        console.error(`卡牌 ${cardToMoveInstance.id} 未在源区域 ${fromZoneId} 找到`);
        updateAllUI(); // 刷新UI以防万一状态不一致
        return;
    }

    const targetIsArrangedZone = ARRANGEMENT_ZONE_SIZES.hasOwnProperty(toZoneId);
    const targetIsPlayerHand = toZoneId === 'playerHand';

    if (targetIsArrangedZone) {
        if (gameState.arrangedHands[toZoneId].length < ARRANGEMENT_ZONE_SIZES[toZoneId]) {
            gameState.arrangedHands[toZoneId].push(cardToMoveInstance);
            gameState.arrangedHands[toZoneId].sort((a,b) => a.value - b.value);
        } else {
            UI.showMessage(`${toZoneId}道已满!`, "error");
            // 卡牌退回原处
            if (fromZoneId === 'playerHand') gameState.playerHand.push(cardToMoveInstance);
            else gameState.arrangedHands[fromZoneId].push(cardToMoveInstance);
            
            if (fromZoneId === 'playerHand') gameState.playerHand.sort((a,b) => a.value - b.value);
            else if (gameState.arrangedHands[fromZoneId]) gameState.arrangedHands[fromZoneId].sort((a,b)=>a.value-b.value);
            
            updateAllUI();
            return;
        }
    } else if (targetIsPlayerHand) {
        gameState.playerHand.push(cardToMoveInstance);
        gameState.playerHand.sort((a,b) => a.value - b.value);
    } else {
        console.error("无效的目标区域:", toZoneId);
        // 卡牌退回原处
        if (fromZoneId === 'playerHand') gameState.playerHand.push(cardToMoveInstance);
        else gameState.arrangedHands[fromZoneId].push(cardToMoveInstance);

        if (fromZoneId === 'playerHand') gameState.playerHand.sort((a,b) => a.value - b.value);
        else if (gameState.arrangedHands[fromZoneId]) gameState.arrangedHands[fromZoneId].sort((a,b)=>a.value-b.value);

        updateAllUI();
        return;
    }
    UI.playSound(UI.DOMElements.audioPlace);
    updateAllUI();
    saveCurrentGameState();
}

function checkAndDisplayArrangement() {
    if (!gameState.isGameActive) return { validation: { isValid: false, message: "游戏未开始" } };
    
    const allPlayerCards = [ /* ... 同 updateAllUI ... */ ];
     const uniqueAllPlayerCards = Array.from(new Set(allPlayerCards.map(c => c.id)))
                                   .map(id => allPlayerCards.find(c => c.id === id));


    const { scores, handInfos, globalSpecialHand, isFullyArranged } = getArrangementScores(gameState.arrangedHands, uniqueAllPlayerCards);
    gameState.totalScore = scores.total; // 更新总分
    UI.updateTotalScoreDisplay(gameState.totalScore);

    let validation = { isValid: false, message: "牌未摆满。" };
    if (isFullyArranged) {
        validation = validateArrangement(handInfos);
    }
    
    let finalMessage = validation.message;
    let messageType = validation.isValid ? 'valid' : 'invalid';

    if (validation.isValid && globalSpecialHand) {
        finalMessage += ` 特殊牌型: ${globalSpecialHand.type.name}! (共 ${globalSpecialHand.score} 水)`;
        messageType = 'special'; // 使用特殊消息类型
    } else if (validation.isValid && isFullyArranged) { // 只有合法且摆满了才显示总额外分
        finalMessage += ` 总额外得分: ${scores.total} 水.`;
    }

    UI.showValidationResult(finalMessage, validation.isValid);
    if (!validation.isValid && isFullyArranged) { // 倒水时播放音效
        UI.playSound(UI.DOMElements.audioInvalid);
    }
    
    // 重新渲染道次以显示分数和高亮
    UI.renderArrangedZone('front', gameState.arrangedHands.front, handleCardClickInZone, handInfos.front);
    UI.renderArrangedZone('middle', gameState.arrangedHands.middle, handleCardClickInZone, handInfos.middle);
    UI.renderArrangedZone('back', gameState.arrangedHands.back, handleCardClickInZone, handInfos.back);

    return { validation, scores, globalSpecialHand, isFullyArranged };
}

function attemptAutoArrange() {
    if (!gameState.isGameActive) {
        UI.showMessage("请先发牌开始游戏。", "error");
        return;
    }
    const allPlayerCards = [
        ...gameState.playerHand,
        ...gameState.arrangedHands.front,
        ...gameState.arrangedHands.middle,
        ...gameState.arrangedHands.back
    ].filter(c => c); // 确保过滤
    
    const uniqueAllPlayerCards = Array.from(new Set(allPlayerCards.map(c => c.id)))
                                   .map(id => allPlayerCards.find(c => c.id === id));


    if (uniqueAllPlayerCards.length !== 13) {
        UI.showMessage("需要13张牌才能智能摆牌。", "error");
        return;
    }

    UI.showMessage("AI 正在思考...", "info");
    stopTimer(); // AI思考时不计时或单独计时
    
    setTimeout(() => {
        const aiResult = getAIArrangement(uniqueAllPlayerCards); // 传递去重后的牌
        if (aiResult && aiResult.front && aiResult.middle && aiResult.back) { // 确保AI结果有效
            gameState.playerHand = [];
            gameState.arrangedHands.front = aiResult.front;
            gameState.arrangedHands.middle = aiResult.middle;
            gameState.arrangedHands.back = aiResult.back;
            UI.showMessage("AI 已完成摆牌。", "success");
            // AI摆完后自动检查并显示结果
            const checkResult = checkAndDisplayArrangement();
            if (checkResult.globalSpecialHand) {
                 UI.playSound(UI.DOMElements.audioSpecial);
            } else if (checkResult.validation.isValid) {
                 UI.playSound(UI.DOMElements.audioWin);
            }

        } else {
            UI.showMessage("AI 未能找到合适的摆牌方案。", "error");
        }
        updateAllUI(); // 确保UI正确刷新
        saveCurrentGameState();
        startTimer(); // AI摆完后重新开始计时
    }, 50);
}

function saveCurrentGameState() {
    if (gameState.isGameActive) {
        saveGameState(gameState);
    }
}

function tryLoadGame() {
    const loaded = loadGameState();
    if (loaded && loaded.playerHand && loaded.arrangedHands) { // 基本检查
        // 确保 gameState 的结构与 loaded 一致
        Object.keys(gameState).forEach(key => {
            if (loaded.hasOwnProperty(key)) {
                gameState[key] = loaded[key];
            }
        });
        gameState.isGameActive = true;
        gameState.currentSelectedCardInfo = null;
        UI.showMessage("已加载保存的游戏。", "success");
        startTimer(); // 加载后开始计时
    } else {
        UI.showMessage("未找到已保存游戏或存档已过期。", "info");
        // 不主动发牌，让用户点击
    }
    updateAllUI(); // 统一刷新
    UI.updateTotalScoreDisplay(gameState.totalScore || 0);
}

const eventHandlers = {
    onDeal: initializeNewGame,
    onReset: resetCurrentGameArrangement, // 改为只重置摆牌区
    onCheck: checkAndDisplayArrangement,
    onAutoArrange: attemptAutoArrange,
    onCardDrop: moveCard, // drag-drop的回调直接是moveCard (它现在接收卡牌对象)
    onCardPlaceByClick: handleZoneClickForPlacement, // 点击区域的回调
    onFindCardDataById: findCardDataByIdFromGameState // 给UI模块的回调，用于通过ID查找卡牌实例
};

document.addEventListener('DOMContentLoaded', () => {
    UI.initializeUI(eventHandlers);

    [UI.DOMElements.playerHand, UI.DOMElements.frontHand, UI.DOMElements.middleHand, UI.DOMElements.backHand].forEach(zone => {
        zone.addEventListener('click', (event) => {
            if (event.target === zone && gameState.currentSelectedCardInfo && gameState.currentSelectedCardInfo.data) {
                 handleZoneClickForPlacement(zone.dataset.zoneId);
            }
        });
    });

    tryLoadGame();
    if (!gameState.isGameActive){
        UI.DOMElements.playerHandCount.textContent = '0';
        UI.showMessage("请点击“发牌”开始新游戏", "info");
        UI.updateTotalScoreDisplay(0);
        // 初始时，确保牌区为空且有占位符
        updateAllUI(); // 这会调用 renderArrangedZone 等来正确初始化空的摆牌区
    }
});
