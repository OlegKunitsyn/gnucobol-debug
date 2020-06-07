import { SourceMap } from "./parser.c";

const number = /[0-9]/;
const numberOrChar = /[a-z0-9]/i;
const containsCharacter = /(?=.*[a-zA-Z]).*/;

function checkToken(token: string, tokenStack: string[], functionName: string, sourceMap: SourceMap, variablesInC: Set<string>): string {
    if (token.length === 0) {
        return "";
    }

    if (containsCharacter.test(token)) {
        let position = -1;
        let variableName = token;
        do {
            const variable = sourceMap.findVariableByCobol(functionName, variableName);
            if (variable) {
                variablesInC.add(variable.cName);
                tokenStack.push(variable.cName);
                if (position !== -1) {
                    tokenStack.push(token.substring(position));
                }
                return "";
            }

            position = variableName.lastIndexOf(".", position);

            if (position !== -1) {
                variableName = variableName.substring(0, position);
            }
        } while (position !== -1);
    }
    tokenStack.push(token);
    return "";
}

export function parseExpression(expression: string, functionName: string, sourceMap: SourceMap): [string, string[]] {
    const tokenStack: string[] = [];
    const variableInC: Set<string> = new Set();

    let token = "";
    let openQuote = false;
    let quoteMarker = null;
    for (let i = 0; i < expression.length; i++) {
        let char = expression[i];
        if (openQuote) {
            token += char;
            if (char === quoteMarker) {
                tokenStack.push(token);
                openQuote = false;
                token = "";
            }
            continue;
        }
        switch (char) {
            case ' ':
            case '\t':
            case '\n':
                token = checkToken(token, tokenStack, functionName, sourceMap, variableInC);
                continue;
            case '\'':
            case '"':
                quoteMarker = char;
                token += char;
                openQuote = true;
                continue;
            case '(':
            case ')':
            case '/':
            case '*':
            case ',':
                token = checkToken(token, tokenStack, functionName, sourceMap, variableInC);
                tokenStack.push(char);
                continue;
            case '+':
                if (number.test(expression[i + 1])) {
                    token += char;
                    continue;
                }
                token = checkToken(token, tokenStack, functionName, sourceMap, variableInC);
                tokenStack.push(char);
                continue;
            case '-':
                if (numberOrChar.test(expression[i - 1]) || numberOrChar.test(expression[i + 1])) {
                    token += char;
                    continue;
                }
                token = checkToken(token, tokenStack, functionName, sourceMap, variableInC);
                tokenStack.push(char);
                continue;
            default:
                token += char;
        }
    }
    checkToken(token, tokenStack, functionName, sourceMap, variableInC);
    return [tokenStack.join(" "), Array.from(variableInC)];
}
