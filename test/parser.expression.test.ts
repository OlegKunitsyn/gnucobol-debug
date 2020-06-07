import * as assert from 'assert';
import { SourceMap } from '../src/parser.c';
import { parseExpression } from '../src/parser.expression';

suite("WATCH expression parse", () => {
    test("it can parse expressions", () => {
        const actual = parseExpression("WXSS-AS*3", null);
        const expected = "WXSS-AS * 3";
        assert.equal(actual, expected);
    });
    test("multiple identifiers", () => {
        const actual = parseExpression("WXSS-AS*WXSS-AS", null);
        const expected = "WXSS-AS * WXSS-AS";
        assert.equal(actual, expected);
    });
    test("only literals", () => {
        const actual = parseExpression("444.32 - 2232.43", null);
        const expected = "444.32 - 2232.43";
        assert.equal(actual, expected);
    });
    test("it doesn't parse string values", () => {
        const actual = parseExpression("\"WXSS-AS*WXSS-AS\".substring(0,1)", null);
        const expected = "\"WXSS-AS*WXSS-AS\" .substring ( 0 , 1 )";
        assert.equal(actual, expected);
    });
});
