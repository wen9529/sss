export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];

export const RANK_VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
};

export const SUIT_VALUES = { // For tie-breaking if needed, or specific game rules
    'clubs': 1, 'diamonds': 2, 'hearts': 3, 'spades': 4
};

export const HAND_TYPES = {
    HIGH_CARD:        { name: "乌龙", strength: 0, baseScore: 0 },
    PAIR:             { name: "对子", strength: 1, baseScore: 0 }, // Score might be 0, special scores for >10 pair
    TWO_PAIR:         { name: "两对", strength: 2, baseScore: 0 },
    THREE_OF_A_KIND:  { name: "三条", strength: 3, baseScore: 0 }, // Head: +3
    STRAIGHT:         { name: "顺子", strength: 4, baseScore: 0 }, // Middle: +2, Back: +2
    FLUSH:            { name: "同花", strength: 5, baseScore: 0 }, // Middle: +4, Back: +4
    FULL_HOUSE:       { name: "葫芦", strength: 6, baseScore: 0 }, // Middle: +1, Back: +1
    FOUR_OF_A_KIND:   { name: "铁支", strength: 7, baseScore: 0 }, // Middle: +7, Back: +5
    STRAIGHT_FLUSH:   { name: "同花顺", strength: 8, baseScore: 0 },// Middle: +9, Back: +7
    // Add Royal Flush as a specific type of Straight Flush if desired for display/scoring
    // ROYAL_FLUSH: { name: "皇家同花顺", strength: 9, baseScore: 10 }, // For example
};

// Special scores (can be more complex, this is a basic example)
// Points for specific hand types in specific positions
export const SPECIAL_SCORES = {
    front: {
        [HAND_TYPES.THREE_OF_A_KIND.name]: 3, // 冲三
    },
    middle: {
        [HAND_TYPES.THREE_OF_A_KIND.name]: 2, // 三条在中道
        [HAND_TYPES.FULL_HOUSE.name]: 2,      // 葫芦在中道
        [HAND_TYPES.FOUR_OF_A_KIND.name]: 8,  // 铁支在中道 (7 or 8 points depending on rules)
        [HAND_TYPES.STRAIGHT_FLUSH.name]: 10, // 同花顺在中道 (9 or 10 points)
    },
    back: { // Usually no extra points for standard hands in back, but special hands like "一条龙" would score
        [HAND_TYPES.FOUR_OF_A_KIND.name]: 4,
        [HAND_TYPES.STRAIGHT_FLUSH.name]: 5,
    }
};


export const ARRANGEMENT_ZONE_SIZES = {
    front: 3,
    middle: 5,
    back: 5
};

export const GAME_STATE_KEY = 'thirteenWaterGameState';
