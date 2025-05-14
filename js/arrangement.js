import { evaluateHand, compareEvaluatedHands } from './handEvaluator.js';
import { ARRANGEMENT_ZONE_SIZES, SPECIAL_SCORES } from './constants.js';

export function getArrangementScores(arrangedHandsData) {
    const scores = { front: 0, middle: 0, back: 0, total: 0 };
    const handInfos = {};

    ['front', 'middle', 'back'].forEach(zoneId => {
        if (arrangedHandsData[zoneId].length === ARRANGEMENT_ZONE_SIZES[zoneId]) {
            const evalResult = evaluateHand(arrangedHandsData[zoneId]);
            handInfos[zoneId] = evalResult;

            // Base score for the hand type itself (if any)
            let currentScore = evalResult.type.baseScore;
            let scoreText = "";

            // Check for special positional scores
            if (SPECIAL_SCORES[zoneId] && SPECIAL_SCORES[zoneId][evalResult.type.name]) {
                currentScore += SPECIAL_SCORES[zoneId][evalResult.type.name];
                scoreText = ` (+${SPECIAL_SCORES[zoneId][evalResult.type.name]})`;
            }
            
            scores[zoneId] = currentScore;
            evalResult.score = currentScore; // Store it back in the info
            evalResult.scoreText = scoreText; // Store text for UI
        } else {
            handInfos[zoneId] = evaluateHand([]); // Empty hand info
        }
    });
    scores.total = scores.front + scores.middle + scores.back;
    return { scores, handInfos };
}


export function validateArrangement(evaluatedArrangement) {
    // evaluatedArrangement should be the { handInfos } object from getArrangementScores
    const { front: frontInfo, middle: middleInfo, back: backInfo } = evaluatedArrangement;

    if (!frontInfo || !middleInfo || !backInfo ||
        !frontInfo.type || !middleInfo.type || !backInfo.type) { // Check if hands are fully evaluated
        return { isValid: false, message: "牌未摆完整或评估失败" };
    }

    let isValid = true;
    let message = "摆牌合法。";

    // Middle must be >= Front
    if (compareEvaluatedHands(middleInfo, frontInfo) < 0) {
        isValid = false;
        message = "倒水：中道小于头道！";
    }
    // Back must be >= Middle (only if previous was valid)
    else if (compareEvaluatedHands(backInfo, middleInfo) < 0) {
        isValid = false;
        message = "倒水：尾道小于中道！";
    }

    return { isValid, message };
}
