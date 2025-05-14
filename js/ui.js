// js/ui.js
import { ARRANGEMENT_ZONE_SIZES, HAND_TYPES } from './constants.js'; // 确保导入 HAND_TYPES

let draggedCardElement = null;
let draggedCardData = null;
let sourceZoneId = null;

export const DOMElements = {
    playerHand: document.getElementById('playerHand'),
    frontHand: document.getElementById('frontHand'),
    middleHand: document.getElementById('middleHand'),
    backHand: document.getElementById('backHand'),
    dealButton: document.getElementById('dealButton'),
    resetButton: document.getElementById('resetButton'),
    checkArrangementButton: document.getElementById('checkArrangementButton'),
    autoArrangeButton: document.getElementById('autoArrangeButton'),
    messageArea: document.getElementById('messageArea'),
    validationResult: document.getElementById('validationResult'),
    totalScoreDisplay: document.getElementById('totalScoreDisplay'),
    playerHandCount: document.getElementById('playerHandCount'),
    frontHandType: document.getElementById('frontHandType'),
    middleHandType: document.getElementById('middleHandType'),
    backHandType: document.getElementById('backHandType'),
    // 音效相关
    soundToggle: document.getElementById('soundToggle'),
    volumeControl: document.getElementById('volumeControl'),
    audioDeal: document.getElementById('audioDeal'),
    audioClick: document.getElementById('audioClick'),
    audioPlace: document.getElementById('audioPlace'),
    audioInvalid: document.getElementById('audioInvalid'),
    audioWin: document.getElementById('audioWin'),
    audioSpecial: document.getElementById('audioSpecial'),
    // 计时器
    timerDisplay: document.getElementById('timerDisplay'),
};

let soundEnabled = true;
let currentVolume = 0.5;

export function createCardDOMElement(cardData, isDraggable = true) {
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('card');
    cardDiv.style.backgroundImage = `url(${cardData.image})`;
    cardDiv.dataset.cardId = cardData.id;
    if (isDraggable) {
        cardDiv.draggable = true;
    }
    return cardDiv;
}

export function renderHand(zoneElement, cards, onCardClickCallback, makeDraggable = true) {
    zoneElement.innerHTML = '';
    cards.forEach(card => {
        const cardDiv = createCardDOMElement(card, makeDraggable);
        if (onCardClickCallback) {
            cardDiv.addEventListener('click', (event) => onCardClickCallback(event, card, zoneElement.dataset.zoneId));
        }
        zoneElement.appendChild(cardDiv);
    });
    if (zoneElement.id === 'playerHand') {
        DOMElements.playerHandCount.textContent = cards.length;
    }
}

export function renderArrangedZone(zoneId, cards, onCardClickCallback, handTypeInfo) {
    const zoneElement = DOMElements[zoneId + 'Hand'];
    const expectedSize = ARRANGEMENT_ZONE_SIZES[zoneId];
    
    zoneElement.innerHTML = '';
    // 清除旧的牌型特定class
    Object.values(HAND_TYPES).forEach(ht => zoneElement.classList.remove(ht.cssClass));
    zoneElement.classList.remove('powerful-hand');


    cards.forEach(card => {
        const cardDiv = createCardDOMElement(card, true);
         if (onCardClickCallback) {
            cardDiv.addEventListener('click', (event) => onCardClickCallback(event, card, zoneId));
        }
        zoneElement.appendChild(cardDiv);
    });

    for (let i = cards.length; i < expectedSize; i++) {
        const placeholder = document.createElement('div');
        placeholder.classList.add('card', 'placeholder');
        placeholder.textContent = '+';
        zoneElement.appendChild(placeholder);
    }

    const typeDisplayElement = DOMElements[zoneId + 'HandType'];
    if (typeDisplayElement) {
        if (handTypeInfo && handTypeInfo.type) {
            typeDisplayElement.textContent = `(${handTypeInfo.type.name}${handTypeInfo.scoreText || ''})`;
            typeDisplayElement.className = 'hand-type-display'; // Reset
            if (handTypeInfo.score > 0) {
                typeDisplayElement.classList.add('score-positive');
            }
            // 添加牌型特定 class 用于高亮
            if (handTypeInfo.type.cssClass) {
                zoneElement.classList.add(handTypeInfo.type.cssClass);
            }
            // 对一些强牌型添加通用高亮
            if (handTypeInfo.type.strength >= HAND_TYPES.FULL_HOUSE.strength) {
                 zoneElement.classList.add('powerful-hand');
            }

        } else {
            typeDisplayElement.textContent = '(...)';
            typeDisplayElement.className = 'hand-type-display';
        }
    }
}

export function showMessage(text, type = 'info') { // type: 'info', 'error', 'success', 'special'
    DOMElements.messageArea.textContent = text;
    DOMElements.messageArea.className = 'message-area';
    if (type) {
        DOMElements.messageArea.classList.add(type);
    }
}

export function showValidationResult(text, isValid) {
    DOMElements.validationResult.textContent = text;
    DOMElements.validationResult.className = 'validation-result';
    if (text) {
        DOMElements.validationResult.classList.add(isValid ? 'valid' : 'invalid');
    }
}

export function updateTotalScoreDisplay(score) {
    DOMElements.totalScoreDisplay.textContent = `总得分: ${score} 水`;
}


export function setupDragAndDrop(onCardDropCallback, findCardDataByIdCallback) { // 添加回调获取卡牌数据
    const droppableZones = document.querySelectorAll('.droppable');

    document.addEventListener('dragstart', (event) => {
        if (event.target.classList.contains('card') && !event.target.classList.contains('placeholder')) {
            draggedCardElement = event.target;
            // 通过回调从 main.js 获取卡牌对象，因为 card.js 的 Card 实例在 main.js 中管理
            draggedCardData = findCardDataByIdCallback(event.target.dataset.cardId);
            sourceZoneId = event.target.closest('.droppable').dataset.zoneId;
            
            if(!draggedCardData){ // 安全检查
                console.error("未能通过ID找到拖拽的卡牌数据:", event.target.dataset.cardId);
                event.preventDefault(); // 阻止无效拖拽
                return;
            }
            
            setTimeout(() => event.target.classList.add('dragging'), 0);
            playSound(DOMElements.audioClick);
        }
    });

    document.addEventListener('dragend', (event) => {
        if (draggedCardElement) {
            draggedCardElement.classList.remove('dragging');
        }
        draggedCardElement = null;
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
            if (draggedCardData && sourceZoneId) { // 使用 draggedCardData
                const targetZoneId = zone.dataset.zoneId;
                onCardDropCallback(draggedCardData, sourceZoneId, targetZoneId); // 传递卡牌对象
            }
        });
    });
}

let selectedPlayerCard = { element: null, data: null, sourceZoneId: null };

export function handleCardClick(event, cardData, sourceZoneId, onSelectCallback) {
    const cardElement = event.currentTarget;
    playSound(DOMElements.audioClick);

    if (selectedPlayerCard.element === cardElement) {
        cardElement.classList.remove('selected');
        selectedPlayerCard = { element: null, data: null, sourceZoneId: null };
    } else {
        if (selectedPlayerCard.element) selectedPlayerCard.element.classList.remove('selected');
        cardElement.classList.add('selected');
        selectedPlayerCard = { element: cardElement, data: cardData, sourceZoneId: sourceZoneId };
        if (onSelectCallback) onSelectCallback(cardData, sourceZoneId);
    }
}

export function getSelectedCardInfoAndClear() { // 返回info，避免直接操作element
    const selInfo = { data: selectedPlayerCard.data, sourceZoneId: selectedPlayerCard.sourceZoneId };
    if (selectedPlayerCard.element) selectedPlayerCard.element.classList.remove('selected');
    selectedPlayerCard = { element: null, data: null, sourceZoneId: null };
    return selInfo.data ? selInfo : null; // 只返回有效选择
}

export function playSound(audioElement) {
    if (soundEnabled && audioElement && audioElement.src) { // 检查src确保音频元素有效
        audioElement.volume = currentVolume;
        audioElement.currentTime = 0;
        audioElement.play().catch(e => console.warn("音频播放失败:", e.message));
    }
}

export function initializeUI(eventHandlers) {
    DOMElements.dealButton.addEventListener('click', eventHandlers.onDeal);
    DOMElements.resetButton.addEventListener('click', eventHandlers.onReset);
    DOMElements.checkArrangementButton.addEventListener('click', eventHandlers.onCheck);
    DOMElements.autoArrangeButton.addEventListener('click', eventHandlers.onAutoArrange);
    
    // setupDragAndDrop 需要一个回调来从 main.js 获取卡牌数据实例
    setupDragAndDrop(eventHandlers.onCardDrop, eventHandlers.onFindCardDataById); 
    
    // 音效控制初始化
    if (DOMElements.soundToggle) {
        DOMElements.soundToggle.checked = soundEnabled;
        DOMElements.soundToggle.addEventListener('change', (e) => {
            soundEnabled = e.target.checked;
            // 可以保存到localStorage
            localStorage.setItem('soundEnabled', soundEnabled);
        });
        // 从localStorage加载设置
        const savedSoundEnabled = localStorage.getItem('soundEnabled');
        if (savedSoundEnabled !== null) {
            soundEnabled = JSON.parse(savedSoundEnabled);
            DOMElements.soundToggle.checked = soundEnabled;
        }
    }
    if (DOMElements.volumeControl) {
        DOMElements.volumeControl.value = currentVolume;
        DOMElements.volumeControl.addEventListener('input', (e) => {
            currentVolume = parseFloat(e.target.value);
             localStorage.setItem('currentVolume', currentVolume);
        });
        const savedVolume = localStorage.getItem('currentVolume');
        if (savedVolume !== null) {
            currentVolume = parseFloat(savedVolume);
            DOMElements.volumeControl.value = currentVolume;
        }
    }
}
