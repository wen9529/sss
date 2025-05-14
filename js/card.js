import { SUITS, RANKS, RANK_VALUES, SUIT_VALUES } from './constants.js';

export class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
        this.value = RANK_VALUES[rank];
        this.suitValue = SUIT_VALUES[suit];
        this.id = `${rank}_of_${suit}`;
        this.image = `images/${this.id}.png`;
        this.backImage = 'images/back.png';
        this.selected = false; // For UI state if needed by Card object itself
    }

    // Method to get a display name, e.g., "红桃A"
    getDisplayName() {
        const suitMap = { 'hearts': '红桃', 'diamonds': '方块', 'clubs': '梅花', 'spades': '黑桃' };
        const rankMap = { 'ace': 'A', 'king': 'K', 'queen': 'Q', 'jack': 'J', '10':'T' }; // T for 10 if desired
        return `${suitMap[this.suit]}${rankMap[this.rank] || this.rank}`;
    }
}

export function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push(new Card(suit, rank));
        }
    }
    return deck;
}

export function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

export function dealHand(deck, numCards = 13) {
    if (deck.length < numCards) {
        console.error("Not enough cards in deck to deal.");
        return [];
    }
    return deck.splice(0, numCards); // Modifies the original deck
}
