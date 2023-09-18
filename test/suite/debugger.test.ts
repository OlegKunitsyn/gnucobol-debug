import * as assert from 'assert';
import { NumericValueParser, AlphanumericValueParser } from '../../src/debugger';

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

    test("it can parse 123t into -12340000", () => {
        const actual = NumericValueParser.parse('"123t"', 4, -4);
        assert.equal(actual, "-12340000");
    });

    test("it can format -12340000 into 123t", () => {
        const actual = NumericValueParser.format("-12340000", 4, -4, false);
        assert.equal(actual, "1234");
    });

    test("it can parse 1234u into -12.345", () => {
        const actual = NumericValueParser.parse('"1234u"',  5, 3);
        assert.equal(actual, "-12.345");
    });

    test("it can format -12.345 into 1234u", () => {
        const actual = NumericValueParser.format("-12.345", 5, 3, true);
        assert.equal(actual, "1234u");
    });

    test("it can parse 123p into -0.0000123", () => {
        const actual = NumericValueParser.parse('"123p"', 4, 8);
        assert.equal(actual, "-0.0000123");
    });

    test("it can format -0.0000123 into 123p", () => {
        const actual = NumericValueParser.format("-0.0000123", 4, 8, true);
        assert.equal(actual, "123p");
    });

    test("it can parse 100p into -0.00001", () => {
        const actual = NumericValueParser.parse('"100p"', 4, 8);
        assert.equal(actual, "-0.00001");
    });

    test("it can format -0.00001 into 100p", () => {
        const actual = NumericValueParser.format("-0.00001", 4, 8, true);
        assert.equal(actual, "100p");
    });

    test("it can parse 000q into -10000", () => {
        const actual = NumericValueParser.parse('"000q"', 4, -4);
        assert.equal(actual, "-10000");
    });

    test("it can format -10000 into 000q", () => {
        const actual = NumericValueParser.format("-10000", 4, -4, true);
        assert.equal(actual, "000q");
    });

    test("it can format \\\"2234u12340123p1230123t12349999\\\" into \"2234u12340123p1230123t1234\"", () => {
        const actual = AlphanumericValueParser.format("\"2234u12340123p1230123t12349999\"", 26);
        assert.equal(actual, "2234u12340123p1230123t1234");
    });
});
