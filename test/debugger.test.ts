import * as assert from 'assert';
import { NumericValueParser } from '../src/debugger';

suite("Variable Value Parser", () => {
    
    test("it can parse 314329", () => {
        const actual = NumericValueParser.parse("314329", 6, 5);
        assert.equal(actual, "3.14329");
    });

    test("it can format 3.14329", () => {
        const actual = NumericValueParser.format("3.14329", 6, true);
        assert.equal(actual, "314329");
    });

    test("it can parse 31432y", () => {
        const actual = NumericValueParser.parse("31432y", 6, 5);
        assert.equal(actual, "-3.14320");
    });

    test("it can format -3.1430", () => {
        const actual = NumericValueParser.format("-3.14320", 6, true);
        assert.equal(actual, "31432y");
    });
});
