// js/ui.js
import { ARRANGEMENT_ZONE_SIZES, HAND_TYPES } from './constants.js';

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
let draggedCardData = null; 
let sourceZoneId = null;

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
    if (isDraggable && cardData) { 
        cardDiv.draggable = true;
    } else {
        cardDiv.draggable = false;
    }
    return cardDiv;
}

export function renderHand(zoneElement, cards, onCardClickCallback, makeDraggable = true) {
    zoneElement.innerHTML = '';
    cards.forEach(card => {
        const cardDiv = createCardDOMElement(card, makeDraggable);
        if (onCardClickCallback && card) { 
            cardDiv.addEventListener('click', (event) => {
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
    if (text) { // Only add class if there's a message, otherwise it might show empty colored box
        DOMElements.validationResult.classList.add(isValid ? 'valid' : 'invalid');
    }
}

export function updateTotalScoreDisplay(score) {
    if (DOMElements.totalScoreDisplay) { // Ensure element exists
        DOMElements.totalScoreDisplay.textContent = `总得分: ${score} 水`;
    }
}

export function setupDragAndDrop(onCardDropCallback, findCardDataByIdCallback) {
    const droppableZones = document.querySelectorAll('.droppable');
    let draggedDOMElement = null; 

    document.addEventListener('dragstart', (event) => {
        const targetCardElement = event.target.closest('.card');
        if (targetCardElement && !targetCardElement.classList.contains('placeholder')) {
            draggedDOMElement = targetCardElement; 
            draggedCardData = findCardDataByIdCallback(targetCardElement.dataset.cardId); 
            sourceZoneId = targetCardElement.closest('.droppable').dataset.zoneId;
            
            if(!draggedCardData){
                event.preventDefault();
                return;
            }
            
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
            if (draggedCardData && sourceZoneId) {
                const targetZoneId = zone.dataset.zoneId;
                onCardDropCallback(draggedCardData, sourceZoneId, targetZoneId); 
            }
        });
    });
}

let selectedPlayerCardInfo = { data: null, sourceZoneId: null, element: null };

export function handleCardClick(event, cardData, sourceZoneId, onSelectCallback) {
    const cardElement = event.currentTarget; 
    playSound(DOMElements.audioClick);

    if (selectedPlayerCardInfo.element === cardElement) {
        cardElement.classList.remove('selected');
        selectedPlayerCardInfo = { data: null, sourceZoneId: null, element: null };
    } else {
        if (selectedPlayerCardInfo.element) selectedPlayerCardInfo.element.classList.remove('selected');
        cardElement.classList.add('selected');
        selectedPlayerCardInfo = { data: cardData, sourceZoneId: sourceZoneId, element: cardElement };
        // if (onSelectCallback) onSelectCallback(cardData, sourceZoneId); // This callback might be redundant now
    }
}

export function getSelectedCardInfoAndClear() {
    const selInfo = { data: selectedPlayerCardInfo.data, sourceZoneId: selectedPlayerCardInfo.sourceZoneId };
    if (selectedPlayerCardInfo.element) selectedPlayerCardInfo.element.classList.remove('selected');
    selectedPlayerCardInfo = { data: null, sourceZoneId: null, element: null };
    return selInfo.data ? selInfo : null;
}

export function playSound(audioElement) {
    if (soundEnabled && audioElement && audioElement.src && audioElement.readyState >= 2) { // Check readyState
        audioElement.volume = currentVolume;
        audioElement.currentTime = 0;
        audioElement.play().catch(e => console.warn("音频播放失败:", e.message, audioElement.src, audioElement.error));
    } else if (soundEnabled && audioElement && audioElement.src && audioElement.readyState < 2) {
        console.warn("音频资源未完全加载:", audioElement.src);
        // Optionally, you could add an event listener for 'canplaythrough' and then play
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
