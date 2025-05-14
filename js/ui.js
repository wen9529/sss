// js/ui.js
import { ARRANGEMENT_ZONE_SIZES, HAND_TYPES } from './constants.js';

// DOMElements (假设已正确定义，并且包含所有需要的元素ID)
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
    soundToggle: document.getElementById('soundToggle'),
    volumeControl: document.getElementById('volumeControl'),
    audioDeal: document.getElementById('audioDeal'),
    audioClick: document.getElementById('audioClick'),
    audioPlace: document.getElementById('audioPlace'),
    audioInvalid: document.getElementById('audioInvalid'),
    audioWin: document.getElementById('audioWin'),
    audioSpecial: document.getElementById('audioSpecial'),
    timerDisplay: document.getElementById('timerDisplay'),
};

let soundEnabled = true;
let currentVolume = 0.5;
let draggedCardData = null; // 卡牌对象，而不是DOM元素
let sourceZoneId = null;

// --- 修改 createCardDOMElement ---
export function createCardDOMElement(cardData, isDraggable = true) {
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('card');

    if (cardData && cardData.image) {
        // 通过CSS自定义属性传递图片URL给 ::after 伪元素
        cardDiv.style.setProperty('--card-image', `url(${cardData.image})`);
    } else if (cardData && cardData.backImage && cardData.id === 'back') { // 处理牌背面
        cardDiv.style.setProperty('--card-image', `url(${cardData.backImage})`);
    } else if (!cardData) { // 如果是为占位符创建（虽然通常占位符是单独逻辑）
        cardDiv.classList.add('placeholder');
        cardDiv.textContent = '+';
    }


    cardDiv.dataset.cardId = cardData ? cardData.id : `placeholder-${Math.random().toString(36).substr(2, 5)}`;
    if (isDraggable && cardData) { // 占位符不可拖动
        cardDiv.draggable = true;
    } else {
        cardDiv.draggable = false;
    }
    return cardDiv;
}
// --- 其他函数保持不变，但要确保它们与新的 createCardDOMElement 协同工作 ---

export function renderHand(zoneElement, cards, onCardClickCallback, makeDraggable = true) {
    zoneElement.innerHTML = '';
    cards.forEach(card => {
        const cardDiv = createCardDOMElement(card, makeDraggable);
        // 确保为真实的卡牌（而不是占位符的壳）绑定事件
        if (onCardClickCallback && card) { 
            cardDiv.addEventListener('click', (event) => {
                 // 确保 cardData 传递的是卡牌对象
                onCardClickCallback(event, card, zoneElement.dataset.zoneId);
            });
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
    Object.values(HAND_TYPES).forEach(ht => { 
        if(ht.cssClass) zoneElement.classList.remove(ht.cssClass);
    });
    zoneElement.classList.remove('powerful-hand');

    cards.forEach(card => {
        const cardDiv = createCardDOMElement(card, true);
         if (onCardClickCallback && card) {
            cardDiv.addEventListener('click', (event) => {
                onCardClickCallback(event, card, zoneId);
            });
        }
        zoneElement.appendChild(cardDiv);
    });

    for (let i = cards.length; i < expectedSize; i++) {
        const placeholderDiv = createCardDOMElement(null, false); // 传递 null 给 cardData
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

export function setupDragAndDrop(onCardDropCallback, findCardDataByIdCallback) {
    const droppableZones = document.querySelectorAll('.droppable');
    let draggedDOMElement = null; // 用于视觉反馈

    document.addEventListener('dragstart', (event) => {
        const targetCardElement = event.target.closest('.card');
        if (targetCardElement && !targetCardElement.classList.contains('placeholder')) {
            draggedDOMElement = targetCardElement; // 保存DOM元素用于样式
            draggedCardData = findCardDataByIdCallback(targetCardElement.dataset.cardId); // 获取卡牌对象
            sourceZoneId = targetCardElement.closest('.droppable').dataset.zoneId;
            
            if(!draggedCardData){
                event.preventDefault();
                return;
            }
            
            setTimeout(() => draggedDOMElement.classList.add('dragging'), 0);
            playSound(DOMElements.audioClick);
        } else {
            event.preventDefault(); // 不是有效卡牌，阻止拖拽
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
            if (draggedCardData && sourceZoneId) {
                const targetZoneId = zone.dataset.zoneId;
                onCardDropCallback(draggedCardData, sourceZoneId, targetZoneId); // 传递卡牌对象
            }
        });
    });
}

let selectedPlayerCardInfo = { data: null, sourceZoneId: null, element: null };

export function handleCardClick(event, cardData, sourceZoneId, onSelectCallback) {
    const cardElement = event.currentTarget; // 确保是 .card 元素
    playSound(DOMElements.audioClick);

    if (selectedPlayerCardInfo.element === cardElement) {
        cardElement.classList.remove('selected');
        selectedPlayerCardInfo = { data: null, sourceZoneId: null, element: null };
    } else {
        if (selectedPlayerCardInfo.element) selectedPlayerCardInfo.element.classList.remove('selected');
        cardElement.classList.add('selected');
        selectedPlayerCardInfo = { data: cardData, sourceZoneId: sourceZoneId, element: cardElement };
        if (onSelectCallback) onSelectCallback(cardData, sourceZoneId); // 这个回调现在可能不需要了
    }
}

// main.js 会直接从 selectedPlayerCardInfo 获取信息
export function getSelectedCardInfoAndClear() {
    const selInfo = { data: selectedPlayerCardInfo.data, sourceZoneId: selectedPlayerCardInfo.sourceZoneId };
    if (selectedPlayerCardInfo.element) selectedPlayerCardInfo.element.classList.remove('selected');
    selectedPlayerCardInfo = { data: null, sourceZoneId: null, element: null };
    return selInfo.data ? selInfo : null;
}

export function playSound(audioElement) {
    if (soundEnabled && audioElement && audioElement.src) {
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
