import { Card, createDeck, shuffleDeck, dealHand } from './card.js';
import * as UI from './ui.js';
import { evaluateHand, compareEvaluatedHands } from './handEvaluator.js';
import { getArrangementScores, validateArrangement } from './arrangement.js';
import { getAIArrangement } from './ai.js';
import { saveGameState, loadGameState, clearGameState } from './storage.js';
import { ARRANGEMENT_ZONE_SIZES } from './constants.js';

let gameState = {
    deck: [],
    playerHand: [], // Card objects in player's possession, not yet placed
    arrangedHands: { // Card objects placed in zones
        front: [],
        middle: [],
        back: []
    },
    currentSelectedCard: null, // { data: Card, sourceZoneId: string }
    isGameActive: false
};

function initializeNewGame() {
    gameState.deck = shuffleDeck(createDeck());
    gameState.playerHand = dealHand(gameState.deck, 13);
    gameState.arrangedHands = { front: [], middle: [], back: [] };
    gameState.currentSelectedCard = null;
    gameState.isGameActive = true;
    
    clearGameState(); // Clear any old saved state for a new game
    UI.showMessage("新游戏开始，请摆牌！");
    UI.showValidationResult("", true);
    updateAllUI();
}

function resetCurrentGame() {
    // Moves all cards from arrangedHands back to playerHand if game was active
    if (gameState.isGameActive) {
        gameState.playerHand = [
            ...gameState.playerHand,
            ...gameState.arrangedHands.front,
            ...gameState.arrangedHands.middle,
            ...gameState.arrangedHands.back
        ].sort((a,b) => a.value - b.value); // Resort
        gameState.arrangedHands = { front: [], middle: [], back: [] };
        gameState.currentSelectedCard = null;
        UI.showMessage("牌局已重置，请重新摆牌。");
    } else { // If no game active, it's like hitting "Deal" again
        initializeNewGame();
        return;
    }
    updateAllUI();
    saveCurrentGameState();
}


function updateAllUI() {
    UI.renderHand(UI.DOMElements.playerHand, gameState.playerHand, handleCardClickInZone);
    
    const { scores, handInfos } = getArrangementScores(gameState.arrangedHands);

    UI.renderArrangedZone('front', gameState.arrangedHands.front, handleCardClickInZone, handInfos.front);
    UI.renderArrangedZone('middle', gameState.arrangedHands.middle, handleCardClickInZone, handInfos.middle);
    UI.renderArrangedZone('back', gameState.arrangedHands.back, handleCardClickInZone, handInfos.back);

    // Check validity if all cards are placed
    if (gameState.playerHand.length === 0 && 
        gameState.arrangedHands.front.length + gameState.arrangedHands.middle.length + gameState.arrangedHands.back.length === 13) {
        checkAndDisplayArrangement();
    } else {
        UI.showValidationResult("", true); // Clear if not fully arranged
    }
}

function handleCardClickInZone(event, cardData, sourceZoneId) {
    // UI.playSound(UI.DOMElements.audioClick);
    const cardElement = event.currentTarget;

    if (gameState.currentSelectedCard && gameState.currentSelectedCard.data.id === cardData.id) {
        // Deselect
        cardElement.classList.remove('selected');
        gameState.currentSelectedCard = null;
    } else {
        // Deselect previous if any
        if (gameState.currentSelectedCard && gameState.currentSelectedCard.element) {
            gameState.currentSelectedCard.element.classList.remove('selected');
        }
        // Select new
        cardElement.classList.add('selected');
        gameState.currentSelectedCard = { data: cardData, sourceZoneId: sourceZoneId, element: cardElement };
        UI.showMessage(`已选择 ${cardData.getDisplayName()} 从 ${sourceZoneId}`);
    }
}

function handleZoneClickForPlacement(targetZoneId) {
    if (!gameState.currentSelectedCard) {
        UI.showMessage("请先选择一张牌。", "error");
        return;
    }

    const cardToMove = gameState.currentSelectedCard.data;
    const sourceZoneId = gameState.currentSelectedCard.sourceZoneId;

    moveCard(cardToMove.id, sourceZoneId, targetZoneId);
    
    // Deselect after move
    if (gameState.currentSelectedCard.element) {
         gameState.currentSelectedCard.element.classList.remove('selected');
    }
    gameState.currentSelectedCard = null;
}


function moveCard(cardId, fromZoneId, toZoneId) {
    let cardToMoveInstance = null;

    // 1. Remove card from source zone
    if (fromZoneId === 'playerHand') {
        const index = gameState.playerHand.findIndex(c => c.id === cardId);
        if (index > -1) {
            cardToMoveInstance = gameState.playerHand.splice(index, 1)[0];
        }
    } else if (gameState.arrangedHands[fromZoneId]) {
        const index = gameState.arrangedHands[fromZoneId].findIndex(c => c.id === cardId);
        if (index > -1) {
            cardToMoveInstance = gameState.arrangedHands[fromZoneId].splice(index, 1)[0];
        }
    }

    if (!cardToMoveInstance) {
        console.error(`Card ${cardId} not found in source zone ${fromZoneId}`);
        return;
    }

    // 2. Add card to target zone
    const targetIsArrangedZone = ARRANGEMENT_ZONE_SIZES.hasOwnProperty(toZoneId);
    const targetIsPlayerHand = toZoneId === 'playerHand';

    if (targetIsArrangedZone) {
        if (gameState.arrangedHands[toZoneId].length < ARRANGEMENT_ZONE_SIZES[toZoneId]) {
            gameState.arrangedHands[toZoneId].push(cardToMoveInstance);
            gameState.arrangedHands[toZoneId].sort((a,b) => a.value - b.value); // Keep sorted
        } else {
            // Target zone full, return card to source (or player hand if source was also full)
            UI.showMessage(`${toZoneId}道已满!`, "error");
            if (fromZoneId === 'playerHand') gameState.playerHand.push(cardToMoveInstance);
            else gameState.arrangedHands[fromZoneId].push(cardToMoveInstance); // Put back
            // Resort source if it was player hand
            if (fromZoneId === 'playerHand') gameState.playerHand.sort((a,b) => a.value - b.value);
            updateAllUI();
            return;
        }
    } else if (targetIsPlayerHand) {
        gameState.playerHand.push(cardToMoveInstance);
        gameState.playerHand.sort((a,b) => a.value - b.value); // Keep sorted
    } else {
        console.error("Invalid target zone:", toZoneId);
        // Put card back to source if target is invalid
        if (fromZoneId === 'playerHand') gameState.playerHand.push(cardToMoveInstance);
        else gameState.arrangedHands[fromZoneId].push(cardToMoveInstance);
        if (fromZoneId === 'playerHand') gameState.playerHand.sort((a,b) => a.value - b.value);
        updateAllUI();
        return;
    }
    // UI.playSound(UI.DOMElements.audioPlace);
    updateAllUI();
    saveCurrentGameState();
}


function checkAndDisplayArrangement() {
    if (!gameState.isGameActive) return;
    const { scores, handInfos } = getArrangementScores(gameState.arrangedHands);
    const validation = validateArrangement(handInfos);
    UI.showValidationResult(validation.message, validation.isValid);
    if (!validation.isValid) {
        // UI.playSound(UI.DOMElements.audioInvalid);
    }
    // Update UI with scores if desired
    // e.g., handInfos.front.scoreText can be displayed
    UI.renderArrangedZone('front', gameState.arrangedHands.front, handleCardClickInZone, handInfos.front);
    UI.renderArrangedZone('middle', gameState.arrangedHands.middle, handleCardClickInZone, handInfos.middle);
    UI.renderArrangedZone('back', gameState.arrangedHands.back, handleCardClickInZone, handInfos.back);

    return validation;
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
    ];
    if (allPlayerCards.length !== 13) {
        UI.showMessage("需要13张牌才能智能摆牌。", "error");
        return;
    }

    UI.showMessage("AI 正在思考...", "info");
    // Use setTimeout to allow UI to update before potentially long AI calculation
    setTimeout(() => {
        const aiResult = getAIArrangement(allPlayerCards);
        if (aiResult) {
            gameState.playerHand = [];
            gameState.arrangedHands.front = aiResult.front;
            gameState.arrangedHands.middle = aiResult.middle;
            gameState.arrangedHands.back = aiResult.back;
            UI.showMessage("AI 已完成摆牌。", "success");
        } else {
            UI.showMessage("AI 未能找到合适的摆牌方案。", "error");
        }
        updateAllUI();
        saveCurrentGameState();
    }, 50); // Short delay
}

function saveCurrentGameState() {
    if (gameState.isGameActive) { // Only save if a game is actually in progress
        saveGameState(gameState);
    }
}

function tryLoadGame() {
    const loaded = loadGameState();
    if (loaded) {
        gameState = loaded;
        gameState.isGameActive = true; // Assume if loaded, it was active
        gameState.currentSelectedCard = null; // Reset selection state
        UI.showMessage("已加载保存的游戏。", "success");
    } else {
        // No saved game, or error loading, start fresh (or prompt user)
        // For now, just let it be, deal button will init new.
        UI.showMessage("未找到已保存游戏，请发牌开始新游戏。", "info");
    }
    updateAllUI();
}


// --- Event Handlers for UI buttons ---
const eventHandlers = {
    onDeal: initializeNewGame,
    onReset: resetCurrentGame,
    onCheck: checkAndDisplayArrangement,
    onAutoArrange: attemptAutoArrange,
    onCardDrop: (cardId, fromZoneId, toZoneId) => { // For drag-drop
        moveCard(cardId, fromZoneId, toZoneId);
    },
    onCardPlaceByClick: (cardData, fromZoneId, toZoneId) => { // For click-to-place
        // This is invoked when a ZONE is clicked after a card is selected
        moveCard(cardData.id, fromZoneId, toZoneId);
         // Deselect after move
        if (gameState.currentSelectedCard && gameState.currentSelectedCard.element) {
            gameState.currentSelectedCard.element.classList.remove('selected');
        }
        gameState.currentSelectedCard = null;
    }
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    UI.initializeUI(eventHandlers);

    // Setup click listeners for placement zones (if using click-to-place)
    [UI.DOMElements.playerHand, UI.DOMElements.frontHand, UI.DOMElements.middleHand, UI.DOMElements.backHand].forEach(zone => {
        zone.addEventListener('click', (event) => {
            // Only trigger if the click is on the zone itself (not a card) and a card is selected
            if (event.target === zone && gameState.currentSelectedCard && gameState.currentSelectedCard.data) {
                 handleZoneClickForPlacement(zone.dataset.zoneId);
            }
        });
    });

    tryLoadGame(); // Attempt to load saved game on start
    if (!gameState.isGameActive){ // If no game loaded, show initial prompt
        UI.DOMElements.playerHandCount.textContent = '0';
        UI.showMessage("请点击“发牌”开始游戏", "info");
    }
});
