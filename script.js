document.addEventListener('DOMContentLoaded', () => {
    const suits = ['clubs', 'diamonds', 'hearts', 'spades'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    const rankValues = { // For sorting and evaluation
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
        'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
    };

    let deck = [];
    let playerHand = [];
    let arrangedHands = {
        front: [],
        middle: [],
        back: []
    };
    let selectedCard = null; // { element: HTMLElement, cardData: object, sourceZoneId: string }

    const playerHandDiv = document.getElementById('playerHand');
    const frontHandDiv = document.getElementById('frontHand');
    const middleHandDiv = document.getElementById('middleHand');
    const backHandDiv = document.getElementById('backHand');
    const dealButton = document.getElementById('dealButton');
    const resetButton = document.getElementById('resetButton');
    const autoArrangeButton = document.getElementById('autoArrangeButton');
    const messageArea = document.getElementById('messageArea');

    function createDeck() {
        deck = [];
        for (const suit of suits) {
            for (const rank of ranks) {
                deck.push({
                    suit,
                    rank,
                    value: rankValues[rank],
                    id: `${rank}_of_${suit}`, // For image lookup and unique ID
                    image: `images/${rank}_of_${suit}.png`
                });
            }
        }
    }

    function shuffleDeck() {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    function dealCards() {
        resetGame(); // Clear previous state
        createDeck();
        shuffleDeck();
        playerHand = deck.slice(0, 13);
        playerHand.sort((a, b) => a.value - b.value || suits.indexOf(a.suit) - suits.indexOf(b.suit)); // Sort for easier viewing
        renderPlayerHand();
        updateArrangedHandPlaceholders();
        messageArea.textContent = '';
    }

    function renderPlayerHand() {
        playerHandDiv.innerHTML = '';
        playerHand.forEach(card => {
            const cardDiv = createCardElement(card);
            cardDiv.addEventListener('click', () => onCardClick(cardDiv, card, 'playerHand'));
            playerHandDiv.appendChild(cardDiv);
        });
    }

    function createCardElement(card) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        cardDiv.style.backgroundImage = `url(${card.image})`;
        cardDiv.dataset.cardId = card.id; // Store card data if needed
        return cardDiv;
    }
    
    function updateArrangedHandPlaceholders() {
        renderArrangedHand('front', frontHandDiv, 3);
        renderArrangedHand('middle', middleHandDiv, 5);
        renderArrangedHand('back', backHandDiv, 5);
    }

    function renderArrangedHand(handName, handDiv, expectedSize) {
        handDiv.innerHTML = '';
        const currentHand = arrangedHands[handName];
        currentHand.forEach(card => {
            const cardDiv = createCardElement(card);
            // Allow clicking cards in arranged hands to move them back or to another arranged hand
            cardDiv.addEventListener('click', () => onCardClick(cardDiv, card, handName));
            handDiv.appendChild(cardDiv);
        });
        // Add placeholders for empty slots
        for (let i = currentHand.length; i < expectedSize; i++) {
            const placeholderDiv = document.createElement('div');
            placeholderDiv.classList.add('card', 'placeholder');
            placeholderDiv.textContent = '+'; // Or empty
            handDiv.appendChild(placeholderDiv);
        }
         // Optionally, evaluate and display hand type here after each move
        evaluateAndDisplayHandType(handName);
    }


    function onCardClick(cardDiv, cardData, sourceZoneId) {
        messageArea.textContent = ''; // Clear previous messages
        if (selectedCard) {
            // If the clicked card is the currently selected card, deselect it
            if (selectedCard.cardData.id === cardData.id) {
                selectedCard.element.classList.remove('selected');
                selectedCard = null;
            } else {
                // This case should ideally not happen if selection logic is sound
                // but as a fallback, treat as new selection
                selectedCard.element.classList.remove('selected');
                cardDiv.classList.add('selected');
                selectedCard = { element: cardDiv, cardData: cardData, sourceZoneId: sourceZoneId };
            }
        } else {
            // No card selected, so select this one
            cardDiv.classList.add('selected');
            selectedCard = { element: cardDiv, cardData: cardData, sourceZoneId: sourceZoneId };
        }
    }

    function onArrangedZoneClick(targetZoneId, targetDiv) {
        if (!selectedCard) {
            messageArea.textContent = '请先选择一张手牌！';
            return;
        }

        const targetHandArr = arrangedHands[targetZoneId];
        const maxCards = parseInt(targetDiv.dataset.size);

        if (targetHandArr.length >= maxCards) {
            messageArea.textContent = `${targetZoneId === 'front' ? '头道' : targetZoneId === 'middle' ? '中道' : '尾道'}已满！`;
            return;
        }
        
        // Move card
        // 1. Remove from source
        if (selectedCard.sourceZoneId === 'playerHand') {
            playerHand = playerHand.filter(c => c.id !== selectedCard.cardData.id);
        } else { // Moving from another arranged hand
            arrangedHands[selectedCard.sourceZoneId] = arrangedHands[selectedCard.sourceZoneId].filter(c => c.id !== selectedCard.cardData.id);
        }

        // 2. Add to target
        targetHandArr.push(selectedCard.cardData);
        targetHandArr.sort((a, b) => a.value - b.value); // Keep sorted

        // 3. Re-render
        renderPlayerHand(); // Update the original hand display
        updateArrangedHandPlaceholders(); // Update all arranged hands (source and target)

        // 4. Deselect
        selectedCard.element.classList.remove('selected'); // This element might be gone, careful
        selectedCard = null;
    }

    function resetGame() {
        playerHand = [];
        arrangedHands = { front: [], middle: [], back: [] };
        selectedCard = null;
        playerHandDiv.innerHTML = '请点击 "发牌" 开始游戏';
        messageArea.textContent = '';
        updateArrangedHandPlaceholders(); // Clear arranged hands and show placeholders
    }

    // --- Basic Hand Evaluation (Placeholder - needs proper implementation) ---
    function getHandType(hand) { // hand is an array of card objects
        if (!hand || hand.length === 0) return "";
        
        // This is a very simplified placeholder.
        // A real implementation needs to check for pairs, two pairs, three of a kind,
        // straight, flush, full house, four of a kind, straight flush.
        // And for specific hand sizes (3 for front, 5 for middle/back).

        const size = hand.length;
        const values = hand.map(c => c.value).sort((a, b) => a - b);
        const suits = hand.map(c => c.suit);
        const isFlush = new Set(suits).size === 1;
        
        const counts = {};
        values.forEach(v => counts[v] = (counts[v] || 0) + 1);
        const valueCounts = Object.values(counts).sort((a,b) => b-a); // e.g. [3,1,1] for three of a kind

        let isStraight = true;
        if (size === 5) { // Check for A-2-3-4-5 straight
            const isAceLowStraight = values.join(',') === '2,3,4,5,14'; // Ace as 14
            if (isAceLowStraight) {
                 // Temporarily treat Ace as 1 for straight check continuity
                const tempValues = values.map(v => v === 14 ? 1 : v).sort((a,b) => a-b);
                 for (let i = 0; i < tempValues.length - 1; i++) {
                    if (tempValues[i+1] - tempValues[i] !== 1) {
                        isStraight = false; break;
                    }
                }
            } else {
                for (let i = 0; i < values.length - 1; i++) {
                    if (values[i+1] - values[i] !== 1) {
                        isStraight = false; break;
                    }
                }
            }
        } else if (size === 3) {
            // For 3-card hand, straight check is simpler, no A-2-3 wrap for front hand
             for (let i = 0; i < values.length - 1; i++) {
                if (values[i+1] - values[i] !== 1) {
                    isStraight = false; break;
                }
            }
        } else {
            isStraight = false; // Not a 5-card or 3-card hand for standard straight/flush
        }


        if (size === 3) { //头道
            if (valueCounts[0] === 3) return "三条"; // Three of a kind
            if (valueCounts[0] === 2) return "对子"; // Pair
            return "乌龙"; // High card
        }

        if (size === 5) { //中道/尾道
            if (isStraight && isFlush) return "同花顺";
            if (valueCounts[0] === 4) return "铁支"; // Four of a kind
            if (valueCounts[0] === 3 && valueCounts[1] === 2) return "葫芦"; // Full House
            if (isFlush) return "同花";
            if (isStraight) return "顺子";
            if (valueCounts[0] === 3) return "三条";
            if (valueCounts[0] === 2 && valueCounts[1] === 2) return "两对";
            if (valueCounts[0] === 2) return "对子";
            return "乌龙";
        }
        return ""; // Invalid hand size for standard evaluation
    }

    function evaluateAndDisplayHandType(handName) {
        const hand = arrangedHands[handName];
        const handType = getHandType(hand);
        document.getElementById(`${handName}HandType`).textContent = `(${handType})`;
    }

    // --- Auto Arrange (Very Basic Example - not optimal十三水 strategy) ---
    function autoArrangeCards() {
        if (playerHand.length !== 0 || arrangedHands.front.length + arrangedHands.middle.length + arrangedHands.back.length !== 13) {
             // If cards are still in playerHand, or total arranged cards are not 13
            if(playerHand.length === 13 && arrangedHands.front.length === 0 && arrangedHands.middle.length === 0 && arrangedHands.back.length === 0){
                // this means we only have cards in playerHand, good to proceed
            } else {
                messageArea.textContent = "请先将所有13张牌从手牌区移到摆牌区，或确保已发牌且未手动摆牌。";
                // Or, more robustly: collect all cards from playerHand and arrangedHands first.
                // For this example, we assume playerHand has 13 cards and arrangedHands are empty.
                if(playerHand.length !== 13) {
                     messageArea.textContent = "请先点击“发牌”获取13张手牌。";
                     return;
                }
            }
        }

        // Simple strategy: sort all 13 cards, then distribute.
        // This is NOT a good 十三水 strategy, just a demo of moving cards.
        let allCards = [...playerHand, ...arrangedHands.front, ...arrangedHands.middle, ...arrangedHands.back];
        if(allCards.length === 0 && playerHand.length === 13) { // Initial deal
            allCards = [...playerHand];
        } else if (allCards.length !== 13) { // If cards are partially arranged
             messageArea.textContent = "自动摆牌需要13张牌在手牌区，或完全清空摆牌区后进行。";
             return;
        }


        // Clear current arrangements if any, and player hand
        playerHand = [];
        arrangedHands = { front: [], middle: [], back: [] };

        allCards.sort((a, b) => b.value - a.value); // Sort by value, highest first

        // Distribute: This is a naive distribution
        arrangedHands.back = allCards.slice(0, 5);
        arrangedHands.middle = allCards.slice(5, 10);
        arrangedHands.front = allCards.slice(10, 13);
        
        // Ensure correct sorting within each hand
        arrangedHands.front.sort((a, b) => a.value - b.value);
        arrangedHands.middle.sort((a, b) => a.value - b.value);
        arrangedHands.back.sort((a, b) => a.value - b.value);

        renderPlayerHand(); // Should be empty now
        updateArrangedHandPlaceholders(); // Renders all arranged hands
        messageArea.textContent = "已自动摆牌 (简单策略)";
    }


    // Event Listeners
    dealButton.addEventListener('click', dealCards);
    resetButton.addEventListener('click', resetGame);
    autoArrangeButton.addEventListener('click', autoArrangeCards);

    frontHandDiv.addEventListener('click', () => onArrangedZoneClick('front', frontHandDiv));
    middleHandDiv.addEventListener('click', () => onArrangedZoneClick('middle', middleHandDiv));
    backHandDiv.addEventListener('click', () => onArrangedZoneClick('back', backHandDiv));

    // Initial setup
    resetGame(); // Call reset to initialize placeholders
    playerHandDiv.innerHTML = '请点击 "发牌" 开始游戏';
});
