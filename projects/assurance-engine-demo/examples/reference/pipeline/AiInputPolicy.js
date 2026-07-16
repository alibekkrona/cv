const DEFAULT_MAX_INPUT_CHARS = 300000;

function getMaxInputChars(environment = process.env) {
    const configured = Number(environment.ASSURANCE_MAX_AI_INPUT_CHARS);
    return Number.isInteger(configured) && configured >= 10000
        ? configured
        : DEFAULT_MAX_INPUT_CHARS;
}

function evaluateAiInputPolicy(input, environment) {
    const inputChars = typeof input === 'string' ? input.length : 0;
    const maxChars = getMaxInputChars(environment);

    return {
        allowed: inputChars > 0 && inputChars <= maxChars,
        inputChars,
        maxChars,
        reason: inputChars === 0
            ? 'ai_input_empty'
            : inputChars > maxChars
                ? 'ai_input_too_large'
                : 'ai_input_within_limit'
    };
}

module.exports = {
    DEFAULT_MAX_INPUT_CHARS,
    evaluateAiInputPolicy,
    getMaxInputChars
};
