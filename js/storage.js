import { GAME_STATE_KEY } from './constants.js';
import { Card } from './card.js'; // Need Card class to re-instantiate objects

export function saveGameState(gameState) {
    try {
        // Convert card objects to plain data for JSON serialization
        // Functions on Card class instances won't be saved.
        const serializableState = {
            deck: gameState.deck.map(c => ({ suit: c.suit, rank: c.rank })),
            playerHand: gameState.playerHand.map(c => ({ suit: c.suit, rank: c.rank })),
            arrangedHands: {
                front: gameState.arrangedHands.front.map(c => ({ suit: c.suit, rank: c.rank })),
                middle: gameState.arrangedHands.middle.map(c => ({ suit: c.suit, rank: c.rank })),
                back: gameState.arrangedHands.back.map(c => ({ suit: c.suit, rank: c.rank })),
            },
            // Add other simple state like currentTurn, score etc. if needed
        };
        localStorage.setItem(GAME_STATE_KEY, JSON.stringify(serializableState));
    } catch (e) {
        console.error("Error saving game state:", e);
    }
}

export function loadGameState() {
    try {
        const savedStateJSON = localStorage.getItem(GAME_STATE_KEY);
        if (savedStateJSON) {
            const loadedPlainState = JSON.parse(savedStateJSON);
            // Re-hydrate card objects with their methods
            const rehydratedState = {
                deck: loadedPlainState.deck.map(cData => new Card(cData.suit, cData.rank)),
                playerHand: loadedPlainState.playerHand.map(cData => new Card(cData.suit, cData.rank)),
                arrangedHands: {
                    front: loadedPlainState.arrangedHands.front.map(cData => new Card(cData.suit, cData.rank)),
                    middle: loadedPlainState.arrangedHands.middle.map(cData => new Card(cData.suit, cData.rank)),
                    back: loadedPlainState.arrangedHands.back.map(cData => new Card(cData.suit, cData.rank)),
                },
            };
            return rehydratedState;
        }
    } catch (e) {
        console.error("Error loading game state:", e);
    }
    return null; // No saved state or error
}

export function clearGameState() {
    localStorage.removeItem(GAME_STATE_KEY);
}
