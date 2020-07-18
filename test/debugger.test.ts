import * as assert from 'assert';
import { NumericValueParser } from '../src/debugger';

suite("Variable Value Parser", () => {
    
    test("it can parse 314329 into 3.14329", () => {
        const actual = NumericValueParser.parse('"314329"', 6, 5);
        assert.equal(actual, "3.14329");
    });

    test("it can format 3.14329 into 314329", () => {
        const actual = NumericValueParser.format("3.14329", 6, 5, false);
        assert.equal(actual, "314329");
    });

    test("it can parse 31432y into -3.14329", () => {
        const actual = NumericValueParser.parse('"31432y"', 6, 5);
        assert.equal(actual, "-3.14329");
    });

    test("it can format -3.14329 into 31432y", () => {
        const actual = NumericValueParser.format("-3.14329", 6, 5, true);
        assert.equal(actual, "31432y");
    });

    test("it can parse 1234(4,-4) into 12340000", () => {
        const actual = NumericValueParser.parse('"1234"', 4, -4);
        assert.equal(actual, "12340000");
    });

    test("it can format 12340000 (4,-4) into 1234", () => {
        const actual = NumericValueParser.format("12340000", 4, -4, false);
        assert.equal(actual, "1234");
    });
});
