// js/handEvaluator.js
import { HAND_TYPES, RANK_VALUES, SUITS, RANKS } from './constants.js'; // 确保导入 RANKS

// --- 已有的 getRankCounts, getRankOccurrences, checkStraight, checkFlush ---
// (这些辅助函数在之前的回复中已提供，这里不再重复，假设它们存在且正确)
// Helper: Get counts of each rank in a hand
function getRankCounts(hand) {
    const counts = {};
    hand.forEach(card => {
        counts[card.value] = (counts[card.value] || 0) + 1;
    });
    return counts;
}

// Helper: Group ranks by their occurrence
function getRankOccurrences(hand) {
    const rankCounts = getRankCounts(hand);
    const occurrences = { 1: [], 2: [], 3: [], 4: [] };
    for (const rankValue in rankCounts) {
        const count = rankCounts[rankValue];
        if (count > 0 && count <= 4) {
            occurrences[count].push(parseInt(rankValue));
        }
    }
    for (let i = 1; i <= 4; i++) {
        occurrences[i].sort((a, b) => b - a);
    }
    return occurrences;
}

// Helper: Check for a straight
function checkStraight(hand) {
    if (hand.length < 3) return { isStraight: false };
    const uniqueSortedValues = [...new Set(hand.map(c => c.value))].sort((a, b) => a - b);
    if (uniqueSortedValues.length !== hand.length) return { isStraight: false };

    const isAceLow = hand.length === 5 &&
                     uniqueSortedValues[0] === RANK_VALUES['2'] &&
                     uniqueSortedValues[1] === RANK_VALUES['3'] &&
                     uniqueSortedValues[2] === RANK_VALUES['4'] &&
                     uniqueSortedValues[3] === RANK_VALUES['5'] &&
                     uniqueSortedValues[4] === RANK_VALUES['ace'];
    if (isAceLow) return { isStraight: true, highCardValue: RANK_VALUES['5'], values: [14,5,4,3,2].sort((a,b)=>a-b) };

    for (let i = 0; i < uniqueSortedValues.length - 1; i++) {
        if (uniqueSortedValues[i+1] - uniqueSortedValues[i] !== 1) {
            return { isStraight: false };
        }
    }
    return { isStraight: true, highCardValue: uniqueSortedValues[uniqueSortedValues.length - 1], values: [...uniqueSortedValues].sort((a,b)=>a-b) };
}

// Helper: Check for a flush
function checkFlush(hand) {
    if (hand.length < 3) return { isFlush: false };
    const firstSuit = hand[0].suit;
    const allSameSuit = hand.every(card => card.suit === firstSuit);
    if (allSameSuit) {
        const kickerValues = hand.map(c => c.value).sort((a,b) => b-a);
        return { isFlush: true, kickers: kickerValues, suit: firstSuit };
    }
    return { isFlush: false };
}


export function evaluateHand(hand) {
    if (!hand || hand.length === 0) {
        return { type: HAND_TYPES.HIGH_CARD, details: { kickers: [] }, score: 0, scoreText:"" };
    }
    const handSize = hand.length;
    const sortedHand = [...hand].sort((a, b) => b.value - a.value);
    const kickers = sortedHand.map(c => c.value);

    const occurrences = getRankOccurrences(sortedHand);
    const flushInfo = checkFlush(sortedHand);
    const straightInfo = checkStraight(sortedHand);

    let handType = HAND_TYPES.HIGH_CARD;
    let details = { kickers: kickers };

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
            details = { kickers: kickers.slice(0,5) };
        }
    } else if (handSize === 3) {
        if (occurrences[3].length > 0) {
            handType = HAND_TYPES.THREE_OF_A_KIND;
            details = { threeValue: occurrences[3][0] };
        } else if (occurrences[2].length === 1) {
            handType = HAND_TYPES.PAIR;
            details = { pairValue: occurrences[2][0], kicker: occurrences[1][0] || null };
        } else {
            details = { kickers: kickers.slice(0,3) };
        }
    } else {
         return { type: HAND_TYPES.HIGH_CARD, details: { kickers: [] }, score: 0, scoreText:"" };
    }
    return { type: handType, details: details, score: 0, scoreText: "" }; // score 和 scoreText 由 arrangement.js 计算
}

export function checkGlobalSpecialHand(thirteenCards, arrangedHandInfos = null) {
    if (!thirteenCards || thirteenCards.length !== 13) return null;

    const uniqueValues = new Set(thirteenCards.map(c => c.value));
    const sortedValues = [...uniqueValues].sort((a, b) => a - b);
    
    // 1. 一条龙 (A-K十三张不同点数)
    if (uniqueValues.size === 13) {
        const dragonRanksPattern = RANKS.map(r => RANK_VALUES[r]).sort((a,b)=>a-b);
        let isDragon = true;
        for(let i=0; i<dragonRanksPattern.length; i++){
            if(sortedValues[i] !== dragonRanksPattern[i]){
                isDragon = false;
                break;
            }
        }
        if(isDragon) return { type: HAND_TYPES.THIRTEEN_DIFFERENT, score: HAND_TYPES.THIRTEEN_DIFFERENT.baseScore };
    }

    // 2. 三同花顺 (需要已摆好的牌道信息，且不倒水)
    if (arrangedHandInfos &&
        arrangedHandInfos.front.type === HAND_TYPES.STRAIGHT_FLUSH &&
        arrangedHandInfos.middle.type === HAND_TYPES.STRAIGHT_FLUSH &&
        arrangedHandInfos.back.type === HAND_TYPES.STRAIGHT_FLUSH) {
        // 理论上三同花顺不会倒水，因为牌力是递增的
        return { type: HAND_TYPES.THREE_STRAIGHT_FLUSHES, score: HAND_TYPES.THREE_STRAIGHT_FLUSHES.baseScore };
    }
    
    // 3. 三同花 (已摆好，不倒水，且花色相同)
    if (arrangedHandInfos &&
        arrangedHandInfos.front.type === HAND_TYPES.FLUSH &&
        arrangedHandInfos.middle.type === HAND_TYPES.FLUSH &&
        arrangedHandInfos.back.type === HAND_TYPES.FLUSH) {
        const frontSuit = arrangedHandInfos.front.details.suit;
        const middleSuit = arrangedHandInfos.middle.details.suit;
        const backSuit = arrangedHandInfos.back.details.suit;
        if (frontSuit === middleSuit && middleSuit === backSuit) {
             // 还需检查是否倒水 (compareEvaluatedHands)
            if (compareEvaluatedHands(arrangedHandInfos.middle, arrangedHandInfos.front) >= 0 &&
                compareEvaluatedHands(arrangedHandInfos.back, arrangedHandInfos.middle) >= 0) {
                return { type: HAND_TYPES.THREE_FLUSHES, score: HAND_TYPES.THREE_FLUSHES.baseScore };
            }
        }
    }
    // 4. 三顺子 (已摆好，不倒水)
     if (arrangedHandInfos &&
        arrangedHandInfos.front.type === HAND_TYPES.STRAIGHT &&
        arrangedHandInfos.middle.type === HAND_TYPES.STRAIGHT &&
        arrangedHandInfos.back.type === HAND_TYPES.STRAIGHT) {
        if (compareEvaluatedHands(arrangedHandInfos.middle, arrangedHandInfos.front) >= 0 &&
            compareEvaluatedHands(arrangedHandInfos.back, arrangedHandInfos.middle) >= 0) {
            return { type: HAND_TYPES.THREE_STRAIGHTS, score: HAND_TYPES.THREE_STRAIGHTS.baseScore };
        }
    }

    const rankCounts = getRankCounts(thirteenCards);
    const occurrences = getRankOccurrences(thirteenCards); // 基于13张牌的 occurrences

    // 5. 六对半
    if (occurrences[2].length === 6 && occurrences[1].length === 1) {
        return { type: HAND_TYPES.SIX_PAIRS_PLUS_ONE, score: HAND_TYPES.SIX_PAIRS_PLUS_ONE.baseScore };
    }
    
    // 6. 四套三条
    if (occurrences[3].length === 4 && occurrences[1].length === 1) {
        return { type: HAND_TYPES.FOUR_THREES, score: HAND_TYPES.FOUR_THREES.baseScore };
    }

    // 7. 全大 / 全小
    const isAllBig = thirteenCards.every(c => c.value >= RANK_VALUES['8']);
    if (isAllBig) return { type: HAND_TYPES.ALL_BIG, score: HAND_TYPES.ALL_BIG.baseScore };

    const isAllSmall = thirteenCards.every(c => c.value <= RANK_VALUES['8']); // 2-8
    if (isAllSmall) return { type: HAND_TYPES.ALL_SMALL, score: HAND_TYPES.ALL_SMALL.baseScore };
    
    // 8. 凑一色 (全红或全黑)
    const redSuits = ['diamonds', 'hearts'];
    const blackSuits = ['clubs', 'spades'];
    const isAllRed = thirteenCards.every(c => redSuits.includes(c.suit));
    const isAllBlack = thirteenCards.every(c => blackSuits.includes(c.suit));
    if (isAllRed || isAllBlack) {
        return { type: HAND_TYPES.SAME_COLOR, score: HAND_TYPES.SAME_COLOR.baseScore };
    }

    // 9. 十二皇族 (J,Q,K)
    let royalCardCount = 0;
    const royalValues = [RANK_VALUES.jack, RANK_VALUES.queen, RANK_VALUES.king];
    thirteenCards.forEach(card => {
        if (royalValues.includes(card.value)) {
            royalCardCount++;
        }
    });
    if (royalCardCount === 12) {
         return { type: HAND_TYPES.TWELVE_ROYALS, score: HAND_TYPES.TWELVE_ROYALS.baseScore };
    }
    
    // ... 更多特殊牌型判断
    return null;
}


// --- compareEvaluatedHands (同之前，不再重复) ---
export function compareEvaluatedHands(handAInfo, handBInfo) {
    if (!handAInfo || !handAInfo.type || !handBInfo || !handBInfo.type) { //健壮性检查
        console.warn("比较手牌时发现未评估或无效的手牌信息:", handAInfo, handBInfo);
        if (!handAInfo || !handAInfo.type) return -1; // A无效，B有效则B大
        if (!handBInfo || !handBInfo.type) return 1;  // B无效，A有效则A大
        return 0; // 都无效
    }
    if (handAInfo.type.strength !== handBInfo.type.strength) {
        return handAInfo.type.strength - handBInfo.type.strength;
    }
    const type = handAInfo.type;
    const detailsA = handAInfo.details;
    const detailsB = handBInfo.details;

    switch (type) {
        case HAND_TYPES.STRAIGHT_FLUSH:
        case HAND_TYPES.STRAIGHT:
            return (detailsA.highCardValue || 0) - (detailsB.highCardValue || 0);
        case HAND_TYPES.FOUR_OF_A_KIND:
            if (detailsA.quadValue !== detailsB.quadValue) {
                return detailsA.quadValue - detailsB.quadValue;
            }
            return (detailsA.kicker || 0) - (detailsB.kicker || 0);
        case HAND_TYPES.FULL_HOUSE:
            if (detailsA.threeValue !== detailsB.threeValue) {
                return detailsA.threeValue - detailsB.threeValue;
            }
            return (detailsA.pairValue || 0) - (detailsB.pairValue || 0);
        case HAND_TYPES.FLUSH:
        case HAND_TYPES.HIGH_CARD:
            for (let i = 0; i < Math.min(detailsA.kickers?.length || 0, detailsB.kickers?.length || 0); i++) {
                if (detailsA.kickers[i] !== detailsB.kickers[i]) {
                    return detailsA.kickers[i] - detailsB.kickers[i];
                }
            }
            return 0;
        case HAND_TYPES.THREE_OF_A_KIND:
             if (detailsA.threeValue !== detailsB.threeValue) {
                return detailsA.threeValue - detailsB.threeValue;
            }
            if(detailsA.kickers && detailsB.kickers){
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
             if(detailsA.kickers && detailsB.kickers){
                for (let i = 0; i < Math.min(detailsA.kickers.length, detailsB.kickers.length); i++) {
                    if (detailsA.kickers[i] !== detailsB.kickers[i]) {
                        return detailsA.kickers[i] - detailsB.kickers[i];
                    }
                }
            }
            return 0;
        default:
            return 0;
    }
}
