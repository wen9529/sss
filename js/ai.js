import { evaluateHand, compareEvaluatedHands } from './handEvaluator.js';
import { ARRANGEMENT_ZONE_SIZES } from './constants.js';

// Helper to generate combinations C(n, k)
function combinations(arr, k) {
    if (k === 0) return [[]];
    if (arr.length < k) return [];
    const first = arr[0];
    const rest = arr.slice(1);
    const combsWithoutFirst = combinations(rest, k);
    const combsWithFirst = combinations(rest, k - 1).map(comb => [first, ...comb]);
    return [...combsWithFirst, ...combsWithoutFirst];
}


// Naive AI: Tries to put best possible in back, then middle, then front, checking validity.
// This is computationally expensive for a full search.
// A real AI would use heuristics, pruning, or specialized algorithms.
export function getAIArrangement(thirteenCards) {
    if (thirteenCards.length !== 13) return null; // Needs 13 cards

    let bestArrangement = null;
    let bestScore = -Infinity; // Assuming higher score is better (even for avoiding 倒水)

    // Iterate through all ways to pick 5 cards for the back hand
    const backCombinations = combinations(thirteenCards, ARRANGEMENT_ZONE_SIZES.back);

    for (const backHand of backCombinations) {
        const remainingForMiddleAndFront = thirteenCards.filter(c => !backHand.includes(c));
        
        // Iterate through all ways to pick 5 cards for the middle hand from remaining
        const middleCombinations = combinations(remainingForMiddleAndFront, ARRANGEMENT_ZONE_SIZES.middle);

        for (const middleHand of middleCombinations) {
            const frontHand = remainingForMiddleAndFront.filter(c => !middleHand.includes(c));

            if (frontHand.length !== ARRANGEMENT_ZONE_SIZES.front) continue; // Should be 3

            // Evaluate this specific arrangement
            const currentArrangement = {
                front: frontHand,
                middle: middleHand,
                back: backHand
            };

            const evalFront = evaluateHand(frontHand);
            const evalMiddle = evaluateHand(middleHand);
            const evalBack = evaluateHand(backHand);

            // Check for "倒水"
            let isValid = true;
            if (compareEvaluatedHands(evalMiddle, evalFront) < 0) isValid = false;
            if (isValid && compareEvaluatedHands(evalBack, evalMiddle) < 0) isValid = false;
            
            if (isValid) {
                // Simple scoring: sum of hand strengths (can be more complex)
                // Or prioritize not "倒水" above all.
                // If using actual game points, that's better.
                const currentScore = evalBack.type.strength * 100 + // Prioritize back
                                     evalMiddle.type.strength * 10 + // Then middle
                                     evalFront.type.strength;       // Then front
                                     // Add special scores here for a better AI

                if (currentScore > bestScore) {
                    bestScore = currentScore;
                    bestArrangement = {
                        front: [...frontHand].sort((a,b)=>a.value-b.value), // Store sorted copies
                        middle: [...middleHand].sort((a,b)=>a.value-b.value),
                        back: [...backHand].sort((a,b)=>a.value-b.value),
                        evals: { front: evalFront, middle: evalMiddle, back: evalBack } // Store evals
                    };
                }
            }
        }
    }
    
    // If no valid non-倒水 arrangement found, AI might return a "least bad" one or just the last tried.
    // For now, if bestArrangement is null, it means all were 倒水 or an error occurred.
    // A fallback could be a very simple sort and split if no good arrangement is found.
    if (!bestArrangement) {
        // Fallback: simple sort and split (likely will be 倒水 but better than nothing)
        const sortedAll = [...thirteenCards].sort((a, b) => a.value - b.value);
         bestArrangement = {
            front: sortedAll.slice(0, 3),
            middle: sortedAll.slice(3, 8),
            back: sortedAll.slice(8, 13),
            evals: { // Re-evaluate this naive split
                front: evaluateHand(sortedAll.slice(0,3)),
                middle: evaluateHand(sortedAll.slice(3,8)),
                back: evaluateHand(sortedAll.slice(8,13))
            }
        };
    }

    return bestArrangement;
}
