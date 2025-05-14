// js/storage.js
import { GAME_STATE_KEY } from './constants.js';
import { Card } from './card.js';

export function saveGameState(gameState) {
    try {
        const serializableState = {
            deck: gameState.deck.map(c => ({ suit: c.suit, rank: c.rank })),
            playerHand: gameState.playerHand.map(c => ({ suit: c.suit, rank: c.rank })),
            arrangedHands: {
                front: gameState.arrangedHands.front.map(c => ({ suit: c.suit, rank: c.rank })),
                middle: gameState.arrangedHands.middle.map(c => ({ suit: c.suit, rank: c.rank })),
                back: gameState.arrangedHands.back.map(c => ({ suit: c.suit, rank: c.rank })),
            },
            isGameActive: gameState.isGameActive,
            totalScore: gameState.totalScore,
            // 注意：currentSelectedCardInfo 不建议保存，因为它包含DOM元素，且是临时状态
            // secondsElapsed 也不建议在此保存，计时器应在加载后重置或继续
        };
        localStorage.setItem(GAME_STATE_KEY, JSON.stringify(serializableState));
    } catch (e) {
        console.error("保存游戏状态时出错:", e);
    }
}

export function loadGameState() {
    try {
        const savedStateJSON = localStorage.getItem(GAME_STATE_KEY);
        if (savedStateJSON) {
            const loadedPlainState = JSON.parse(savedStateJSON);
            
            // 健壮性检查，确保关键数组存在
            const ah = loadedPlainState.arrangedHands || {};

            const rehydratedState = {
                deck: (loadedPlainState.deck || []).map(cData => new Card(cData.suit, cData.rank)),
                playerHand: (loadedPlainState.playerHand || []).map(cData => new Card(cData.suit, cData.rank)),
                arrangedHands: {
                    front: (ah.front || []).map(cData => new Card(cData.suit, cData.rank)),
                    middle: (ah.middle || []).map(cData => new Card(cData.suit, cData.rank)),
                    back: (ah.back || []).map(cData => new Card(cData.suit, cData.rank)),
                },
                isGameActive: loadedPlainState.isGameActive || false,
                totalScore: loadedPlainState.totalScore || 0,
            };
            return rehydratedState;
        }
    } catch (e) {
        console.error("加载游戏状态时出错:", e);
        // 出错时清除可能损坏的存档
        localStorage.removeItem(GAME_STATE_KEY);
    }
    return null;
}

export function clearGameState() {
    localStorage.removeItem(GAME_STATE_KEY);
}
