import { ARRANGEMENT_ZONE_SIZES } from './constants.js';

let draggedCardElement = null; // The DOM element being dragged
let draggedCardData = null;    // The card data object
let sourceZoneId = null;       // Zone ID from where card is dragged

// --- DOM Element Getters ---
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
    playerHandCount: document.getElementById('playerHandCount'),
    frontHandType: document.getElementById('frontHandType'),
    middleHandType: document.getElementById('middleHandType'),
    backHandType: document.getElementById('backHandType'),
    // audioDeal: document.getElementById('audioDeal'),
    // audioClick: document.getElementById('audioClick'),
    // audioPlace: document.getElementById('audioPlace'),
    // audioInvalid: document.getElementById('audioInvalid'),
};

// --- Card Element Creation ---
export function createCardDOMElement(cardData, isDraggable = true) {
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('card');
    cardDiv.style.backgroundImage = `url(${cardData.image})`;
    cardDiv.dataset.cardId = cardData.id; // For identification
    if (isDraggable) {
        cardDiv.draggable = true;
    }
    return cardDiv;
}

// --- Rendering Functions ---
export function renderHand(zoneElement, cards, onCardClickCallback, makeDraggable = true) {
    zoneElement.innerHTML = ''; // Clear previous cards
    cards.forEach(card => {
        const cardDiv = createCardDOMElement(card, makeDraggable);
        if (onCardClickCallback) { // For click-based interaction (can co-exist with drag)
            cardDiv.addEventListener('click', (event) => onCardClickCallback(event, card, zoneElement.dataset.zoneId));
        }
        zoneElement.appendChild(cardDiv);
    });

    // Update player hand count if it's the playerHand zone
    if (zoneElement.id === 'playerHand') {
        DOMElements.playerHandCount.textContent = cards.length;
    }
}

export function renderArrangedZone(zoneId, cards, onCardClickCallback, handTypeInfo) {
    const zoneElement = DOMElements[zoneId + 'Hand']; // e.g., DOMElements.frontHand
    const expectedSize = ARRANGEMENT_ZONE_SIZES[zoneId];
    
    zoneElement.innerHTML = ''; // Clear previous
    cards.forEach(card => {
        const cardDiv = createCardDOMElement(card, true); // Arranged cards are also draggable
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

    // Display hand type
    const typeDisplayElement = DOMElements[zoneId + 'HandType'];
    if (typeDisplayElement) {
        typeDisplayElement.textContent = handTypeInfo ? `(${handTypeInfo.type.name} ${handTypeInfo.scoreText || ''})` : '(...)';
    }
}


// --- Message Display ---
export function showMessage(text, type = 'info') { // type: 'info', 'error', 'success'
    DOMElements.messageArea.textContent = text;
    DOMElements.messageArea.className = 'message-area'; // Reset classes
    if (type === 'error') {
        DOMElements.messageArea.classList.add('error');
    } else if (type === 'success') {
        DOMElements.messageArea.classList.add('success');
    }
    // Play sound if needed: playSound(DOMElements.audioInvalid) for error etc.
}

export function showValidationResult(message, isValid) {
    DOMElements.validationResult.textContent = message;
    DOMElements.validationResult.className = 'validation-result'; // Reset
    if (message) { // Only add class if there's a message
        DOMElements.validationResult.classList.add(isValid ? 'valid' : 'invalid');
    }
}

// --- Drag and Drop Event Handlers ---
export function setupDragAndDrop(onCardDropCallback) {
    const droppableZones = document.querySelectorAll('.droppable');

    document.addEventListener('dragstart', (event) => {
        if (event.target.classList.contains('card') && !event.target.classList.contains('placeholder')) {
            draggedCardElement = event.target;
            // Find the card data. This assumes card data is managed in a central state
            // and can be retrieved by ID, or the card element itself stores enough info.
            // For simplicity, let's assume a global `gameState` or similar can provide it.
            // This part needs careful integration with your main state management.
            // For now, we'll just use dataset.cardId.
            // draggedCardData = findCardDataById(event.target.dataset.cardId); // You'll need this function
            sourceZoneId = event.target.closest('.droppable').dataset.zoneId;
            
            setTimeout(() => event.target.classList.add('dragging'), 0); // Make original less visible
            // playSound(DOMElements.audioClick);
        }
    });

    document.addEventListener('dragend', (event) => {
        if (draggedCardElement) {
            draggedCardElement.classList.remove('dragging');
            draggedCardElement = null;
            draggedCardData = null; // Reset
            sourceZoneId = null;
        }
    });

    droppableZones.forEach(zone => {
        zone.addEventListener('dragover', (event) => {
            event.preventDefault(); // Necessary to allow dropping
            zone.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', (event) => {
            zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', (event) => {
            event.preventDefault();
            zone.classList.remove('drag-over');
            if (draggedCardElement) {
                const targetZoneId = zone.dataset.zoneId;
                const cardIdToMove = draggedCardElement.dataset.cardId; // Get ID from dragged element
                // Callback to main logic to handle the card move
                onCardDropCallback(cardIdToMove, sourceZoneId, targetZoneId);
                // playSound(DOMElements.audioPlace);
            }
        });
    });
}

// --- Click Selection (Alternative/Complementary to Drag) ---
let selectedPlayerCard = { element: null, data: null, sourceZone: null };

export function handleCardClick(event, cardData, zoneId, onSelectCallback, onPlaceCallback) {
    const cardElement = event.currentTarget; // The card div that was clicked

    if (selectedPlayerCard.element === cardElement) { // Clicked selected card again: Deselect
        cardElement.classList.remove('selected');
        selectedPlayerCard = { element: null, data: null, sourceZone: null };
    } else if (selectedPlayerCard.element) { // A card is selected, and clicked on a different card (or zone)
        // This case needs more thought: are we moving to a zone or selecting another card?
        // For simplicity now, assume if a card is selected, next click on a ZONE is placement.
        // If next click is on ANOTHER card, it could switch selection.
        // This function might be better split or called from zone click handlers.

        // Let's assume this function is ONLY for selecting a card from playerHand or arrangedHand
        if (selectedPlayerCard.element) selectedPlayerCard.element.classList.remove('selected');
        cardElement.classList.add('selected');
        selectedPlayerCard = { element: cardElement, data: cardData, sourceZone: zoneId };
        if (onSelectCallback) onSelectCallback(cardData, zoneId); // Notify main logic
    } else { // No card selected: Select this card
        cardElement.classList.add('selected');
        selectedPlayerCard = { element: cardElement, data: cardData, sourceZone: zoneId };
        if (onSelectCallback) onSelectCallback(cardData, zoneId);
    }
}

export function getSelectedCardAndClear() {
    const sel = selectedPlayerCard;
    if (sel.element) sel.element.classList.remove('selected');
    selectedPlayerCard = { element: null, data: null, sourceZone: null };
    return sel;
}

export function setupZoneClickForPlacement(onPlaceCallback) {
    const arrangedZones = [DOMElements.frontHand, DOMElements.middleHand, DOMElements.backHand];
    arrangedZones.forEach(zone => {
        zone.addEventListener('click', (event) => {
            // If click is on the zone itself (not a card within it), and a card is selected
            if (event.target === zone && selectedPlayerCard.data) {
                onPlaceCallback(selectedPlayerCard.data, selectedPlayerCard.sourceZone, zone.dataset.zoneId);
            }
        });
    });
     // Allow moving back to player hand
    DOMElements.playerHand.addEventListener('click', (event) => {
        if (event.target === DOMElements.playerHand && selectedPlayerCard.data && selectedPlayerCard.sourceZone !== 'playerHand') {
            onPlaceCallback(selectedPlayerCard.data, selectedPlayerCard.sourceZone, 'playerHand');
        }
    });
}


// --- Audio (Optional) ---
// export function playSound(audioElement) {
//     if (audioElement) {
//         audioElement.currentTime = 0;
//         audioElement.play().catch(e => console.warn("Audio play failed:", e));
//     }
// }

// --- Initial UI Setup ---
export function initializeUI(eventHandlers) {
    DOMElements.dealButton.addEventListener('click', eventHandlers.onDeal);
    DOMElements.resetButton.addEventListener('click', eventHandlers.onReset);
    DOMElements.checkArrangementButton.addEventListener('click', eventHandlers.onCheck);
    DOMElements.autoArrangeButton.addEventListener('click', eventHandlers.onAutoArrange);
    
    setupDragAndDrop(eventHandlers.onCardDrop); // Pass the callback from main.js
    // For click-based:
    // You'll need to attach click listeners to cards when they are rendered
    // And to zones for placement.
    setupZoneClickForPlacement(eventHandlers.onCardPlaceByClick); // Pass callback for placing
}
