/**
 * Hangul Chosung (Initial Consonant) extraction utility
 */

const CHOSUNG = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

export const getChosung = (str) => {
    if (!str) return '';

    let result = '';
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i) - 44032;
        if (code > -1 && code < 11172) {
            result += CHOSUNG[Math.floor(code / 588)];
        } else {
            result += str.charAt(i);
        }
    }
    return result;
};

/**
 * Checks if a string matches a query using Chosung or exact match.
 */
export const matchHangul = (target, query) => {
    if (!query) return true;
    if (!target) return false;

    const targetLower = target.toLowerCase();
    const queryLower = query.toLowerCase();

    // Direct match
    if (targetLower.includes(queryLower)) return true;

    // Chosung match
    const targetChosung = getChosung(targetLower);
    if (targetChosung.includes(queryLower)) return true;

    return false;
};
