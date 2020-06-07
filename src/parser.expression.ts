import { SourceMap } from "./parser.c";

const number = /[0-9]/;
const numberOrChar = /[a-z0-9]/i;
const containsCharacter = /(?=.*[a-zA-Z]).*/;

function checkToken(token: string, tokenStack: string[], sourceMap: SourceMap): string {
    if (token.length === 0) {
        return "";
    }

    if (containsCharacter.test(token)) {
        //TODO - Fetch variable
        console.log(`${token} is an identifier!`);
    }
    tokenStack.push(token);
    return "";
}

export function parseExpression(expression: string, sourceMap: SourceMap): string {
    const tokenStack: string[] = [];
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
            }
            continue;
        }
        switch (char) {
            case '\s':
            case '\t':
            case '\n':
                continue;
            case '\'':
            case '"':
                quoteMarker = char;
                token += char;
                openQuote = true;
            case '(':
            case ')':
            case '/':
            case '*':
            case ',':
                token = checkToken(token, tokenStack, sourceMap);
                tokenStack.push(char);
                continue;
            case '+':
                if (number.test(expression[i + 1])) {
                    token += char;
                    continue;
                }
                token = checkToken(token, tokenStack, sourceMap);
                tokenStack.push(char);
                continue;
            case '-':
                if (numberOrChar.test(expression[i - 1]) || numberOrChar.test(expression[i + 1])) {
                    token += char;
                    continue;
                }
                token = checkToken(token, tokenStack, sourceMap);
                tokenStack.push(char);
                continue;
            default:
                token += char;
        }
    }
    checkToken(token, tokenStack, sourceMap);
    return tokenStack.join(" ");
}
