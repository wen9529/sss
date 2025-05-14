// js/ui.js
import { ARRANGEMENT_ZONE_SIZES, HAND_TYPES } from './constants.js';

export const DOMElements = {
    // 房间管理UI
    playerNameInput: document.getElementById('playerNameInput'),
    roomIdInput: document.getElementById('roomIdInput'),
    createRoomButton: document.getElementById('createRoomButton'),
    joinRoomButton: document.getElementById('joinRoomButton'),
    currentRoomInfo: document.getElementById('currentRoomInfo'),
    playersDisplayArea: document.getElementById('playersDisplayArea'),

    // 游戏控制UI
    playerReadyButton: document.getElementById('playerReadyButton'),
    resetArrangementButton: document.getElementById('resetArrangementButton'),
    submitArrangementButton: document.getElementById('submitArrangementButton'),
    autoArrangeButton: document.getElementById('autoArrangeButton'), // 这个在多人游戏中可能需要重新考虑逻辑

    // 信息显示UI
    messageArea: document.getElementById('messageArea'),
    validationResult: document.getElementById('validationResult'),
    totalScoreDisplay: document.getElementById('totalScoreDisplay'),
    playerHandCount: document.getElementById('playerHandCount'),
    timerDisplay: document.getElementById('timerDisplay'),

    // 牌区UI
    playerHand: document.getElementById('playerHand'),
    frontHand: document.getElementById('frontHand'),
    middleHand: document.getElementById('middleHand'),
    backHand: document.getElementById('backHand'),
    frontHandType: document.getElementById('frontHandType'),
    middleHandType: document.getElementById('middleHandType'),
    backHandType: document.getElementById('backHandType'),

    // 音效UI
    soundToggle: document.getElementById('soundToggle'),
    volumeControl: document.getElementById('volumeControl'),
    audioDeal: document.getElementById('audioDeal'),
    audioClick: document.getElementById('audioClick'),
    audioPlace: document.getElementById('audioPlace'),
    audioInvalid: document.getElementById('audioInvalid'),
    audioWin: document.getElementById('audioWin'),
    audioSpecial: document.getElementById('audioSpecial'),
    audioRoom: document.getElementById('audioRoom'),
};

let soundEnabled = true;
let currentVolume = 0.5;
let draggedCardData = null; 
let sourceZoneId = null;
let selectedPlayerCardInfo = { data: null, sourceZoneId: null, element: null };


export function createCardDOMElement(cardData, isDraggable = true) {
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('card');

    if (cardData && cardData.image) {
        cardDiv.style.setProperty('--card-image', `url(${cardData.image})`);
    } else if (cardData && cardData.backImage && cardData.id === 'back') { 
         cardDiv.style.setProperty('--card-image', `url(${cardData.backImage})`);
    } else if (!cardData) { 
        cardDiv.classList.add('placeholder');
        cardDiv.textContent = '+';
    }

    cardDiv.dataset.cardId = cardData ? cardData.id : `placeholder-${Math.random().toString(36).substr(2, 5)}`;
    if (isDraggable && cardData && !cardDiv.classList.contains('placeholder')) { 
        cardDiv.draggable = true;
    } else {
        cardDiv.draggable = false;
    }
    return cardDiv;
}

export function renderHand(zoneElement, cards, onCardClickCallback) {
    zoneElement.innerHTML = '';
    if (!cards) cards = []; // 防御空数组
    cards.forEach(card => {
        const cardDiv = createCardDOMElement(card, true); // 手牌总是可拖拽的
        if (onCardClickCallback && card) { 
            cardDiv.addEventListener('click', (event) => {
                onCardClickCallback(event, card, zoneElement.dataset.zoneId);
            });
        }
        zoneElement.appendChild(cardDiv);
    });
    if (zoneElement.id === 'playerHand' && DOMElements.playerHandCount) {
        DOMElements.playerHandCount.textContent = cards.length;
    }
}

export function renderArrangedZone(zoneId, cards, onCardClickCallback, handTypeInfo) {
    const zoneElement = DOMElements[zoneId + 'Hand'];
    const expectedSize = ARRANGEMENT_ZONE_SIZES[zoneId];
    if (!zoneElement) return; // 如果元素不存在则退出
    
    zoneElement.innerHTML = '';
    Object.values(HAND_TYPES).forEach(ht => { 
        if(ht.cssClass) zoneElement.classList.remove(ht.cssClass);
    });
    zoneElement.classList.remove('powerful-hand');

    if (!cards) cards = []; // 防御空数组
    cards.forEach(card => {
        const cardDiv = createCardDOMElement(card, true); // 摆好的牌也允许拖动调整
         if (onCardClickCallback && card) {
            cardDiv.addEventListener('click', (event) => {
                onCardClickCallback(event, card, zoneId);
            });
        }
        zoneElement.appendChild(cardDiv);
    });

    for (let i = cards.length; i < expectedSize; i++) {
        const placeholderDiv = createCardDOMElement(null, false); 
        zoneElement.appendChild(placeholderDiv);
    }

    const typeDisplayElement = DOMElements[zoneId + 'HandType'];
    if (typeDisplayElement) {
        if (handTypeInfo && handTypeInfo.type) {
            typeDisplayElement.textContent = `(${handTypeInfo.type.name}${handTypeInfo.scoreText || ''})`;
            typeDisplayElement.className = 'hand-type-display'; 
            if (handTypeInfo.score > 0) {
                typeDisplayElement.classList.add('score-positive');
            }
            if (handTypeInfo.type.cssClass) {
                zoneElement.classList.add(handTypeInfo.type.cssClass);
            }
            // 强度判断可以使用 handTypeInfo.type.strength
            if (handTypeInfo.type.strength >= HAND_TYPES.FULL_HOUSE.strength) { 
                 zoneElement.classList.add('powerful-hand');
            }
        } else {
            typeDisplayElement.textContent = '(...)';
            typeDisplayElement.className = 'hand-type-display';
        }
    }
}

export function showMessage(text, type = 'info') {
    if (!DOMElements.messageArea) return;
    DOMElements.messageArea.textContent = text;
    DOMElements.messageArea.className = 'message-area';
    if (type) {
        DOMElements.messageArea.classList.add(type);
    }
}

export function showValidationResult(text, isValid) {
    if (!DOMElements.validationResult) return;
    DOMElements.validationResult.textContent = text;
    DOMElements.validationResult.className = 'validation-result';
    if (text) { 
        DOMElements.validationResult.classList.add(isValid ? 'valid' : 'invalid');
    }
}

export function updateTotalScoreDisplay(score) {
    if (DOMElements.totalScoreDisplay) { 
        DOMElements.totalScoreDisplay.textContent = `总得分: ${score} 水`;
    }
}

export function setupDragAndDrop(onCardDropCallback, findCardDataByIdCallback) {
    const droppableZones = document.querySelectorAll('.droppable');
    let draggedDOMElement = null; 

    document.addEventListener('dragstart', (event) => {
        const targetCardElement = event.target.closest('.card');
        if (targetCardElement && targetCardElement.draggable && !targetCardElement.classList.contains('placeholder')) {
            draggedDOMElement = targetCardElement; 
            draggedCardData = findCardDataByIdCallback(targetCardElement.dataset.cardId); 
            if (!draggedCardData) { // 如果找不到卡牌数据 (例如ID不匹配或已从数据源移除)
                event.preventDefault();
                draggedDOMElement = null;
                return;
            }
            sourceZoneId = targetCardElement.closest('.droppable').dataset.zoneId;
            setTimeout(() => { if(draggedDOMElement) draggedDOMElement.classList.add('dragging'); }, 0);
            playSound(DOMElements.audioClick);
        } else {
            event.preventDefault(); 
        }
    });

    document.addEventListener('dragend', () => {
        if (draggedDOMElement) {
            draggedDOMElement.classList.remove('dragging');
        }
        draggedDOMElement = null;
        draggedCardData = null;
        sourceZoneId = null;
    });

    droppableZones.forEach(zone => {
        zone.addEventListener('dragover', (event) => {
            event.preventDefault();
            zone.classList.add('drag-over');
        });
        zone.addEventListener('dragleave', () => {
            zone.classList.remove('drag-over');
        });
        zone.addEventListener('drop', (event) => {
            event.preventDefault();
            zone.classList.remove('drag-over');
            if (draggedCardData && sourceZoneId) { // 确保拖拽数据有效
                const targetZoneId = zone.dataset.zoneId;
                onCardDropCallback(draggedCardData, sourceZoneId, targetZoneId); 
            }
        });
    });
}

export function handleCardClick(event, cardData, sourceZoneId) {
    const cardElement = event.currentTarget; 
    playSound(DOMElements.audioClick);

    if (selectedPlayerCardInfo.element === cardElement) {
        cardElement.classList.remove('selected');
        selectedPlayerCardInfo = { data: null, sourceZoneId: null, element: null };
    } else {
        if (selectedPlayerCardInfo.element) selectedPlayerCardInfo.element.classList.remove('selected');
        cardElement.classList.add('selected');
        selectedPlayerCardInfo = { data: cardData, sourceZoneId: sourceZoneId, element: cardElement };
    }
    // main.js 会通过 getSelectedCardInfoAndClear 来获取选择，所以不需要这里的 onSelectCallback
}

export function getSelectedCardInfoAndClear() {
    const selInfo = { data: selectedPlayerCardInfo.data, sourceZoneId: selectedPlayerCardInfo.sourceZoneId };
    if (selectedPlayerCardInfo.element) selectedPlayerCardInfo.element.classList.remove('selected');
    selectedPlayerCardInfo = { data: null, sourceZoneId: null, element: null };
    return selInfo.data ? selInfo : null;
}

export function playSound(audioElement) {
    if (soundEnabled && audioElement && audioElement.src) { 
        // 检查音频是否已加载一部分，避免 unhandled promise rejection
        if (audioElement.readyState >= 2) { // HAVE_CURRENT_DATA or more
            audioElement.volume = currentVolume;
            audioElement.currentTime = 0;
            audioElement.play().catch(e => console.warn("音频播放失败:", e.message, audioElement.src, audioElement.error));
        } else {
            // console.warn("音频资源未就绪:", audioElement.src, "readyState:", audioElement.readyState);
            // 可以选择在这里添加一个 'canplaythrough' 事件监听器来确保加载后再播放，但这会增加复杂性
            // 对于短音效，通常浏览器会处理好。如果频繁出问题，再考虑更复杂的加载管理。
        }
    }
}

// --- 多人游戏UI更新函数 (需要你在 main.js 中调用) ---
export function updateRoomInfoUI(roomData, currentPlayerId) {
    if (!DOMElements.currentRoomInfo) return;
    if (roomData) {
        DOMElements.currentRoomInfo.textContent = `房间ID: ${roomData.id} (${roomData.players.length}/${roomData.maxPlayers}人) 阶段: ${roomData.gameState.phase}`;
        updatePlayersDisplay(roomData.players, currentPlayerId);
    } else {
        DOMElements.currentRoomInfo.textContent = "未加入房间";
        if(DOMElements.playersDisplayArea) DOMElements.playersDisplayArea.innerHTML = "";
    }
}

export function updatePlayersDisplay(players, currentPlayerId) {
    if (!DOMElements.playersDisplayArea) return;
    DOMElements.playersDisplayArea.innerHTML = ""; // 清空

    players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.classList.add('player-status');
        let statusText = player.name;
        if (player.id === currentPlayerId) {
            statusText += " (你)";
            playerDiv.style.borderColor = "#3498db"; // 高亮当前玩家
        }
        if (player.isReady) {
            statusText += " - 已准备";
            playerDiv.classList.add('ready');
        }
        if (player.arrangedHands) { // 如果已摆牌 (通常在比牌阶段才显示具体牌)
            statusText += " - 已摆牌";
            playerDiv.classList.add('arranged');
        }
        playerDiv.textContent = statusText;
        DOMElements.playersDisplayArea.appendChild(playerDiv);
    });
}

// 更多UI函数，如显示/隐藏房间选择界面、游戏板、结果等，需要根据你的HTML结构来创建

export function initializeUI(eventHandlers) {
    // 房间管理按钮
    if(DOMElements.createRoomButton) DOMElements.createRoomButton.addEventListener('click', eventHandlers.onCreateRoom);
    if(DOMElements.joinRoomButton) DOMElements.joinRoomButton.addEventListener('click', eventHandlers.onJoinRoom);
    
    // 游戏控制按钮
    if(DOMElements.playerReadyButton) DOMElements.playerReadyButton.addEventListener('click', eventHandlers.onPlayerReady);
    if(DOMElements.resetArrangementButton) DOMElements.resetArrangementButton.addEventListener('click', eventHandlers.onResetArrangement);
    if(DOMElements.submitArrangementButton) DOMElements.submitArrangementButton.addEventListener('click', eventHandlers.onSubmitArrangement);
    if(DOMElements.autoArrangeButton) DOMElements.autoArrangeButton.addEventListener('click', eventHandlers.onAutoArrange);
    
    setupDragAndDrop(eventHandlers.onCardDrop, eventHandlers.onFindCardDataById); 
    
    if (DOMElements.soundToggle) {
        const savedSoundEnabled = localStorage.getItem('soundEnabled');
        if (savedSoundEnabled !== null) {
            soundEnabled = JSON.parse(savedSoundEnabled);
        }
        DOMElements.soundToggle.checked = soundEnabled;
        DOMElements.soundToggle.addEventListener('change', (e) => {
            soundEnabled = e.target.checked;
            localStorage.setItem('soundEnabled', soundEnabled);
        });
    }
    if (DOMElements.volumeControl) {
         const savedVolume = localStorage.getItem('currentVolume');
        if (savedVolume !== null) {
            currentVolume = parseFloat(savedVolume);
        }
        DOMElements.volumeControl.value = currentVolume;
        DOMElements.volumeControl.addEventListener('input', (e) => {
            currentVolume = parseFloat(e.target.value);
             localStorage.setItem('currentVolume', currentVolume);
        });
    }
}
