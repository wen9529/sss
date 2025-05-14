// js/arrangement.js
import { evaluateHand, compareEvaluatedHands, checkGlobalSpecialHand } from './handEvaluator.js';
import { ARRANGEMENT_ZONE_SIZES, POSITIONAL_SCORES, HAND_TYPES } from './constants.js'; // 使用 POSITIONAL_SCORES

export function getArrangementScores(arrangedHandsData, allThirteenCards) {
    const scores = { front: 0, middle: 0, back: 0, total: 0, specialBonus: 0, specialType: null };
    const handInfos = { front: null, middle: null, back: null };

    let isFullyArranged = true;
    ['front', 'middle', 'back'].forEach(zoneId => {
        if (!arrangedHandsData[zoneId] || arrangedHandsData[zoneId].length !== ARRANGEMENT_ZONE_SIZES[zoneId]) {
            isFullyArranged = false;
            // 提供一个默认的空评估，避免后续逻辑出错
            handInfos[zoneId] = { type: HAND_TYPES.HIGH_CARD, details: { kickers: [] }, score: 0, scoreText: "" };
        } else {
            const evalResult = evaluateHand(arrangedHandsData[zoneId]);
            handInfos[zoneId] = evalResult;

            let positionalScore = 0;
            let scoreText = "";
            if (POSITIONAL_SCORES[zoneId] && POSITIONAL_SCORES[zoneId][evalResult.type.name]) {
                positionalScore = POSITIONAL_SCORES[zoneId][evalResult.type.name];
                scoreText = ` (+${positionalScore})`;
            }
            scores[zoneId] = positionalScore; // 这是道次的额外加分
            evalResult.score = positionalScore; // 更新牌型信息中的分数
            evalResult.scoreText = scoreText;
        }
    });

    let globalSpecialHand = null;
    if (isFullyArranged && allThirteenCards && allThirteenCards.length === 13) {
        // 传入已评估的各道信息，方便某些特殊牌型（如三同花顺）判断
        globalSpecialHand = checkGlobalSpecialHand(allThirteenCards, handInfos);
    }

    if (globalSpecialHand) {
        scores.specialType = globalSpecialHand.type.name;
        scores.specialBonus = globalSpecialHand.score; // 全局特殊牌型本身的水数

        // 很多规则下，如果出现强大的全局特殊牌型（如一条龙、三同花顺），
        // 道次的额外加分可能就不算了，或者只算全局牌型的分。
        // 这里我们采取：全局特殊牌型分 + 各道额外加分（除非全局牌型规则覆盖）
        // 例如，一条龙13水，通常就不再计算头中尾的冲三、葫芦等额外分了。
        // 但有些规则可能允许叠加，这里我们选择不叠加主要特殊牌型和道次加分。
        if (globalSpecialHand.type === HAND_TYPES.THIRTEEN_DIFFERENT ||
            globalSpecialHand.type === HAND_TYPES.THREE_STRAIGHT_FLUSHES ||
            globalSpecialHand.type === HAND_TYPES.TWELVE_ROYALS ||
            globalSpecialHand.type === HAND_TYPES.FOUR_THREES ) { // 这些牌型分数通常是固定的总数
            scores.total = globalSpecialHand.score;
            // 清空道次加分，因为全局牌型优先且总分固定
            scores.front = scores.middle = scores.back = 0;
            // 同时更新 handInfos 里的 scoreText，避免显示道次加分
            ['front', 'middle', 'back'].forEach(zoneId => {
                if(handInfos[zoneId]) {
                    handInfos[zoneId].score = 0;
                    handInfos[zoneId].scoreText = "";
                }
            });
        } else { // 其他一般特殊牌型，分数可以和道次加分叠加
            scores.total = scores.front + scores.middle + scores.back + globalSpecialHand.score;
        }
    } else if (isFullyArranged) { // 没有全局特殊牌型，但牌已摆满
        scores.total = scores.front + scores.middle + scores.back;
    } else { // 牌未摆满
        scores.total = 0; // 未摆满则总分为0
    }
    
    return { scores, handInfos, globalSpecialHand, isFullyArranged };
}

export function validateArrangement(evaluatedHandInfos) {
    const { front: frontInfo, middle: middleInfo, back: backInfo } = evaluatedHandInfos;

    if (!frontInfo || !middleInfo || !backInfo ||
        !frontInfo.type || !middleInfo.type || !backInfo.type) {
        return { isValid: false, message: "牌未摆完整或评估失败" };
    }

    // 中道必须 >= 头道
    if (compareEvaluatedHands(middleInfo, frontInfo) < 0) {
        return { isValid: false, message: "倒水：中道小于头道！" };
    }
    // 尾道必须 >= 中道
    if (compareEvaluatedHands(backInfo, middleInfo) < 0) {
        return { isValid: false, message: "倒水：尾道小于中道！" };
    }

    return { isValid: true, message: "摆牌合法。" };
}
