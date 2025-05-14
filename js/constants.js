// js/constants.js

export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades']; // 梅花, 方块, 红桃, 黑桃
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];

export const RANK_VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
};

export const SUIT_VALUES = { 
    'clubs': 1, 'diamonds': 2, 'hearts': 3, 'spades': 4
};

export const HAND_TYPES = {
    HIGH_CARD:        { name: "乌龙", strength: 0, baseScore: 0, cssClass: "type-high-card" },
    PAIR:             { name: "对子", strength: 1, baseScore: 0, cssClass: "type-pair" },
    TWO_PAIR:         { name: "两对", strength: 2, baseScore: 0, cssClass: "type-two-pair" },
    THREE_OF_A_KIND:  { name: "三条", strength: 3, baseScore: 0, cssClass: "type-three-of-a-kind" },
    STRAIGHT:         { name: "顺子", strength: 4, baseScore: 0, cssClass: "type-straight" },
    FLUSH:            { name: "同花", strength: 5, baseScore: 0, cssClass: "type-flush" },
    FULL_HOUSE:       { name: "葫芦", strength: 6, baseScore: 0, cssClass: "type-full-house" },
    FOUR_OF_A_KIND:   { name: "铁支", strength: 7, baseScore: 0, cssClass: "type-four-of-a-kind" },
    STRAIGHT_FLUSH:   { name: "同花顺", strength: 8, baseScore: 0, cssClass: "type-straight-flush" },

    // ---- 13张牌整体特殊牌型 ----
    // 这些牌型通常有固定的总水数，并且可能使道次比较无效或有特殊规则。
    // baseScore 代表该特殊牌型本身的固定水数。
    // strength 极高以确保它们在任何可能的内部AI排序中被优先考虑（如果适用）。
    THIRTEEN_DIFFERENT: { name: "一条龙", strength: 20, baseScore: 13, cssClass: "type-special" }, // (A-K)
    TWELVE_ROYALS:      { name: "十二皇族", strength: 19, baseScore: 24, cssClass: "type-special" }, // 12张J,Q,K + 任意一张 (分数可调整)
    THREE_STRAIGHT_FLUSHES: { name: "三同花顺", strength: 22, baseScore: 60, cssClass: "type-special" }, // 分数极高
    THREE_FLUSHES:      { name: "三同花", strength: 15, baseScore: 6, cssClass: "type-special" },
    THREE_STRAIGHTS:    { name: "三顺子", strength: 14, baseScore: 5, cssClass: "type-special" },
    SIX_PAIRS_PLUS_ONE: { name: "六对半", strength: 13, baseScore: 3, cssClass: "type-special" }, // (分数可调整, 有的规则4水)
    ALL_BIG:            { name: "全大", strength: 10, baseScore: 2, cssClass: "type-special" }, // (8以上)
    ALL_SMALL:          { name: "全小", strength: 10, baseScore: 2, cssClass: "type-special" }, // (8以下)
    SAME_COLOR:         { name: "凑一色", strength: 11, baseScore: 3, cssClass: "type-special" }, // (全红或全黑)
    FOUR_THREES:        { name: "四套三条", strength: 18, baseScore: 20, cssClass: "type-special" }, // (4组三条+1单张)
    TWO_QUADS_PLUS:     { name: "双铁怪物", strength: 20, baseScore: 30, cssClass: "type-special" }, // (2组铁支 + 1组三条 + 2单张) - 示例，规则多样
    // ... 其他特殊牌型
};

// 道次额外加分 (当该道是特定牌型时)
export const POSITIONAL_SCORES = {
    front: {
        [HAND_TYPES.THREE_OF_A_KIND.name]: 3, // 冲三（三条在头道）
    },
    middle: {
        [HAND_TYPES.FULL_HOUSE.name]: 2,      // 葫芦在中道额外+2水
        [HAND_TYPES.FOUR_OF_A_KIND.name]: 8,  // 铁支在中道额外+8水
        [HAND_TYPES.STRAIGHT_FLUSH.name]: 10, // 同花顺在中道额外+10水
    },
    back: { // 尾道通常是基础牌型，但某些规则下强牌型也有额外加分
        [HAND_TYPES.FOUR_OF_A_KIND.name]: 4,  // 铁支在尾道额外+4水
        [HAND_TYPES.STRAIGHT_FLUSH.name]: 5,  // 同花顺在尾道额外+5水
    }
};

export const ARRANGEMENT_ZONE_SIZES = {
    front: 3,
    middle: 5,
    back: 5
};

export const GAME_STATE_KEY = 'thirteenWaterGameState_v2'; // 版本号变更以避免旧存档冲突
