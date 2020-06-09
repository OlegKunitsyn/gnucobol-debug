import * as assert from 'assert';
import * as nativePath from "path";
import { SourceMap } from '../src/parser.c';
import { parseExpression } from '../src/parser.expression';

suite("WATCH expression parse", () => {
    const cwd = nativePath.resolve(__dirname, '../../test/resources');
    const c = nativePath.resolve(cwd, 'petstore.c');
    const parsed = new SourceMap(cwd, [c]);
    console.log(parsed.toString());
    const functionName = "petstore_";

    test("it can parse expressions", () => {
        const [actual, variables] = parseExpression("TOTAL-QUANTITY*3", functionName, parsed);
        const expected = "f_15 * 3";
        assert.equal(actual, expected);
        assert.deepEqual(variables, ["f_15"]);
    });
    test("multiple identifiers", () => {
        const [actual, variables] = parseExpression("TOTAL-QUANTITY*TOTAL-QUANTITY", functionName, parsed);
        const expected = "f_15 * f_15";
        assert.equal(actual, expected);
        assert.deepEqual(variables, ["f_15"]);
    });
    test("only literals", () => {
        const [actual, variables] = parseExpression("444.32 - 2232.43", functionName, parsed);
        const expected = "444.32 - 2232.43";
        assert.equal(actual, expected);
        assert.deepEqual(variables, []);
    });
    test("it doesn't parse string values", () => {
        const [actual, variables] = parseExpression("\"TOTAL-QUANTITY*TOTAL-QUANTITY\".substring(0,1)", functionName, parsed);
        const expected = "\"TOTAL-QUANTITY*TOTAL-QUANTITY\" .substring ( 0 , 1 )";
        assert.equal(actual, expected);
        assert.deepEqual(variables, []);
    });
    test("it doesn't parse not found identifiers", () => {
        const [actual, variables] = parseExpression("BLA-BLA-BLA.BLABLA * 2", functionName, parsed);
        const expected = "BLA-BLA-BLA.BLABLA * 2";
        assert.equal(actual, expected);
        assert.deepEqual(variables, []);
    });
    test("it parses complex expressions", () => {
        const [actual, variables] = parseExpression("\"TOTAL-QUANTITY*TOTAL-QUANTITY\".substring(0,1) + ((2*TOTAL-QUANTITY) - TOTAL-QUANTITY + WS-BILL.TOTAL-COST.length) + (TOTAL-COST.toLowerCase()) + WS-BILL.TOTAL-QUANTITY", functionName, parsed);
        const expected = "\"TOTAL-QUANTITY*TOTAL-QUANTITY\" .substring ( 0 , 1 ) + ( ( 2 * f_15 ) - f_15 + f_16 .length ) + ( f_16 .toLowerCase ( ) ) + f_15";
        assert.equal(actual, expected);
        assert.deepEqual(variables, ["f_15", "f_16"]);
    });
    test("it removes zeroes from the beggining of a positive value", () => {
        const [actual] = parseExpression("+000022", functionName, parsed);
        const expected = "22";
        assert.equal(actual, expected);
    });
    test("it removes zeroes from the beggining of a negative value", () => {
        const [actual] = parseExpression("-000022", functionName, parsed);
        const expected = "-22";
        assert.equal(actual, expected);
    });
    test("it works for +0000.1234", () => {
        const [actual] = parseExpression("+0000.1234", functionName, parsed);
        const expected = "0.1234";
        assert.equal(actual, expected);
    });
    test("it works for -0000.1234", () => {
        const [actual] = parseExpression("-0000.1234", functionName, parsed);
        const expected = "-0.1234";
        assert.equal(actual, expected);
    });
    test("it works for 0", () => {
        const [actual] = parseExpression("0", functionName, parsed);
        const expected = "0";
        assert.equal(actual, expected);
    });
});
