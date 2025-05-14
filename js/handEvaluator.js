import { HAND_TYPES, RANK_VALUES, SPECIAL_SCORES } from './constants.js';

// Helper: Get counts of each rank in a hand
function getRankCounts(hand) { // hand: array of card objects
    const counts = {};
    hand.forEach(card => {
        counts[card.value] = (counts[card.value] || 0) + 1;
    });
    return counts;
}

// Helper: Group ranks by their occurrence (e.g., pairs, threes)
function getRankOccurrences(hand) {
    const rankCounts = getRankCounts(hand);
    const occurrences = { 1: [], 2: [], 3: [], 4: [] }; // Singles, Pairs, Threes, Fours

    for (const rankValue in rankCounts) {
        const count = rankCounts[rankValue];
        if (count > 0 && count <= 4) {
            occurrences[count].push(parseInt(rankValue));
        }
    }
    // Sort ranks within each occurrence type, highest first (important for tie-breaking)
    for (let i = 1; i <= 4; i++) {
        occurrences[i].sort((a, b) => b - a);
    }
    return occurrences; // e.g., {1:[7,6,5], 2:[10], 3:[], 4:[]} for a pair of 10s
}

// Helper: Check for a straight
function checkStraight(hand) { // hand cards should be sorted by value for easier check
    if (hand.length < 3) return { isStraight: false }; // Min length for straight can be 3 for some variants, 5 is standard
    
    const uniqueSortedValues = [...new Set(hand.map(c => c.value))].sort((a, b) => a - b);
    if (uniqueSortedValues.length !== hand.length) return { isStraight: false }; // Has pairs, not a straight

    // Ace-low straight (A-2-3-4-5)
    if (hand.length === 5 &&
        uniqueSortedValues[0] === RANK_VALUES['2'] &&
        uniqueSortedValues[1] === RANK_VALUES['3'] &&
        uniqueSortedValues[2] === RANK_VALUES['4'] &&
        uniqueSortedValues[3] === RANK_VALUES['5'] &&
        uniqueSortedValues[4] === RANK_VALUES['ace']) {
        return { isStraight: true, highCardValue: RANK_VALUES['5'], values: [14,5,4,3,2] }; // Ace counts as high for value, 5 for straight name
    }

    // Standard straight
    for (let i = 0; i < uniqueSortedValues.length - 1; i++) {
        if (uniqueSortedValues[i+1] - uniqueSortedValues[i] !== 1) {
            return { isStraight: false };
        }
    }
    return { isStraight: true, highCardValue: uniqueSortedValues[uniqueSortedValues.length - 1], values: [...uniqueSortedValues].reverse() };
}

// Helper: Check for a flush
function checkFlush(hand) {
    if (hand.length < 3) return { isFlush: false }; // Min length for flush, 5 is standard
    const firstSuit = hand[0].suit;
    const allSameSuit = hand.every(card => card.suit === firstSuit);
    if (allSameSuit) {
        const kickerValues = hand.map(c => c.value).sort((a,b) => b-a); // Highest kickers first
        return { isFlush: true, kickers: kickerValues, suit: firstSuit };
    }
    return { isFlush: false };
}


export function evaluateHand(hand) { // hand: array of card objects
    if (!hand || hand.length === 0) {
        return { type: HAND_TYPES.HIGH_CARD, details: { kickers: [] }, score: 0, scoreText:"" };
    }

    const handSize = hand.length;
    // Sort hand by card value descending for consistent kicker evaluation
    const sortedHand = [...hand].sort((a, b) => b.value - a.value);
    const kickers = sortedHand.map(c => c.value); // Default kickers

    const occurrences = getRankOccurrences(sortedHand);
    const flushInfo = checkFlush(sortedHand);
    const straightInfo = checkStraight(sortedHand); // Pass sorted hand

    let handType = HAND_TYPES.HIGH_CARD;
    let details = { kickers: kickers };

    // --- 5-Card Hand Logic ---
    if (handSize === 5) {
        if (straightInfo.isStraight && flushInfo.isFlush) {
            handType = HAND_TYPES.STRAIGHT_FLUSH;
            details = { highCardValue: straightInfo.highCardValue, values: straightInfo.values, suit: flushInfo.suit };
        } else if (occurrences[4].length > 0) {
            handType = HAND_TYPES.FOUR_OF_A_KIND;
            details = { quadValue: occurrences[4][0], kicker: occurrences[1][0] || null };
        } else if (occurrences[3].length > 0 && occurrences[2].length > 0) {
            handType = HAND_TYPES.FULL_HOUSE;
            details = { threeValue: occurrences[3][0], pairValue: occurrences[2][0] };
        } else if (flushInfo.isFlush) {
            handType = HAND_TYPES.FLUSH;
            details = { kickers: flushInfo.kickers, suit: flushInfo.suit };
        } else if (straightInfo.isStraight) {
            handType = HAND_TYPES.STRAIGHT;
            details = { highCardValue: straightInfo.highCardValue, values: straightInfo.values };
        } else if (occurrences[3].length > 0) {
            handType = HAND_TYPES.THREE_OF_A_KIND;
            details = { threeValue: occurrences[3][0], kickers: occurrences[1].slice(0,2) };
        } else if (occurrences[2].length >= 2) {
            handType = HAND_TYPES.TWO_PAIR;
            details = { highPairValue: occurrences[2][0], lowPairValue: occurrences[2][1], kicker: occurrences[1][0] || null };
        } else if (occurrences[2].length === 1) {
            handType = HAND_TYPES.PAIR;
            details = { pairValue: occurrences[2][0], kickers: occurrences[1].slice(0,3) };
        } else {
            handType = HAND_TYPES.HIGH_CARD;
            details = { kickers: kickers.slice(0,5) };
        }
    }
    // --- 3-Card Hand Logic (Front Hand) ---
    else if (handSize === 3) {
        if (occurrences[3].length > 0) {
            handType = HAND_TYPES.THREE_OF_A_KIND;
            details = { threeValue: occurrences[3][0] };
        } else if (occurrences[2].length === 1) {
            handType = HAND_TYPES.PAIR;
            details = { pairValue: occurrences[2][0], kicker: occurrences[1][0] || null };
        } else {
            handType = HAND_TYPES.HIGH_CARD;
            details = { kickers: kickers.slice(0,3) };
        }
        // Note: 3-card straights/flushes are not standard in most thirteen water rules for the front hand.
        // If your rules include them, add checks here.
    } else {
         // Invalid hand size for standard evaluation
         return { type: HAND_TYPES.HIGH_CARD, details: { kickers: [] }, score: 0, scoreText:"" };
    }

    // Calculate score based on hand type and position (passed in or determined contextually later)
    // For now, just return base score of the hand type.
    // Actual scoring might happen in arrangement.js or main.js based on position
    let score = handType.baseScore;
    let scoreText = ""; // E.g. "+3"
    // Example: if (position === 'front' && handType === HAND_TYPES.THREE_OF_A_KIND) score += 3;
    // This part will be more complex with SPECIAL_SCORES.

    return { type: handType, details: details, score: score, scoreText: scoreText };
}

// Compare two evaluated hands (handAInfo, handBInfo are results from evaluateHand)
// Returns: >0 if A > B, <0 if A < B, 0 if A == B
export function compareEvaluatedHands(handAInfo, handBInfo) {
    if (handAInfo.type.strength !== handBInfo.type.strength) {
        return handAInfo.type.strength - handBInfo.type.strength;
    }

    // Same type, compare by specific values / kickers
    const type = handAInfo.type; // Both are same type
    const detailsA = handAInfo.details;
    const detailsB = handBInfo.details;

    switch (type) {
        case HAND_TYPES.STRAIGHT_FLUSH:
        case HAND_TYPES.STRAIGHT:
            // Ace-low straight (A-2-3-4-5), high card is 5. Normal A-K-Q-J-T high card is A (14).
            // The `highCardValue` from `checkStraight` handles this.
            return detailsA.highCardValue - detailsB.highCardValue;

        case HAND_TYPES.FOUR_OF_A_KIND:
            if (detailsA.quadValue !== detailsB.quadValue) {
                return detailsA.quadValue - detailsB.quadValue;
            }
            return (detailsA.kicker || 0) - (detailsB.kicker || 0); // Kicker can be null

        case HAND_TYPES.FULL_HOUSE:
            if (detailsA.threeValue !== detailsB.threeValue) {
                return detailsA.threeValue - detailsB.threeValue;
            }
            return detailsA.pairValue - detailsB.pairValue;

        case HAND_TYPES.FLUSH:
        case HAND_TYPES.HIGH_CARD: // Also for乌龙
            for (let i = 0; i < Math.min(detailsA.kickers.length, detailsB.kickers.length); i++) {
                if (detailsA.kickers[i] !== detailsB.kickers[i]) {
                    return detailsA.kickers[i] - detailsB.kickers[i];
                }
            }
            return 0; // All kickers equal

        case HAND_TYPES.THREE_OF_A_KIND:
            if (detailsA.threeValue !== detailsB.threeValue) {
                return detailsA.threeValue - detailsB.threeValue;
            }
            // For 5-card hands, compare kickers
            if (detailsA.kickers && detailsB.kickers) {
                 for (let i = 0; i < Math.min(detailsA.kickers.length, detailsB.kickers.length); i++) {
                    if (detailsA.kickers[i] !== detailsB.kickers[i]) {
                        return detailsA.kickers[i] - detailsB.kickers[i];
                    }
                }
            }
            return 0;

        case HAND_TYPES.TWO_PAIR:
            if (detailsA.highPairValue !== detailsB.highPairValue) {
                return detailsA.highPairValue - detailsB.highPairValue;
            }
            if (detailsA.lowPairValue !== detailsB.lowPairValue) {
                return detailsA.lowPairValue - detailsB.lowPairValue;
            }
            return (detailsA.kicker || 0) - (detailsB.kicker || 0);

        case HAND_TYPES.PAIR:
            if (detailsA.pairValue !== detailsB.pairValue) {
                return detailsA.pairValue - detailsB.pairValue;
            }
            if (detailsA.kickers && detailsB.kickers) {
                for (let i = 0; i < Math.min(detailsA.kickers.length, detailsB.kickers.length); i++) {
                    if (detailsA.kickers[i] !== detailsB.kickers[i]) {
                        return detailsA.kickers[i] - detailsB.kickers[i];
                    }
                }
            }
            return 0;
        default:
            return 0; // Should not happen
    }
}
