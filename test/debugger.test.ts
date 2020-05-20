import * as assert from 'assert';
import { CobolFieldDataParser, NumericValueParser } from '../src/debugger';

suite("Debugger", () => {
	test("It can parse sized field value", () => {
		const cobFieldValue = "{size = 3, data = 0x55585e0040f0 <b_14> '0' <repeats 17 times>, attr = 0x55585e0000b0 <a_4>}";
		const parsed = CobolFieldDataParser.parse(cobFieldValue);
		assert.equal(parsed, "\"000\"");
	});
	test("It can parse replacing 'repeats' pattern", () => {
		const cobFieldValue = "{size = 3, data = 0x00 \"1\", '0' <repeats 17 times>, attr = 0x55585e0000b0 <a_4>}";
		const parsed = CobolFieldDataParser.parse(cobFieldValue);
		assert.equal(parsed, "\"100\"");
	});
	test("It can parse unknown value", () => {
		const cobFieldValue = "{size = 3, data = 0x00, attr = 0x55585e0000b0 <a_4>}";
		const parsed = CobolFieldDataParser.parse(cobFieldValue);
		assert.equal(parsed, null);
	});
	test("It can parse unknown value even having data storage reference", () => {
		const cobFieldValue = "{size = 3, data = 0x00 <b_14>, attr = 0x55585e0000b0 <a_4>}";
		const parsed = CobolFieldDataParser.parse(cobFieldValue);
		assert.equal(parsed, null);
	});
	test("It can parse without data storage reference", () => {
		const cobFieldValue = "{size = 3, data = 0x00 '0' <repeats 17 times>, attr = 0x55585e0000b0 <a_4>}";
		const parsed = CobolFieldDataParser.parse(cobFieldValue);
		assert.equal(parsed, "\"000\"");
	});
	test("It can parse without data storage reference replacing 'repeats' pattern", () => {
		const cobFieldValue = "{size = 3, data = 0x00 \"1\", '0' <repeats 17 times>, attr = 0x55585e0000b0 <a_4>}";
		const parsed = CobolFieldDataParser.parse(cobFieldValue);
		assert.equal(parsed, "\"100\"");
	});
	test("It can parse full-sized data value", () => {
		const cobFieldValue = "{size = 17, data = 0x55585e0040f0 <b_14> \"00000000000000000\", attr = 0x55585e0000b0 <a_4>}";
		const parsed = CobolFieldDataParser.parse(cobFieldValue);
		assert.equal(parsed, "\"00000000000000000\"");
	});
	test("It can parse partially-sized data value", () => {
		const cobFieldValue = "{size = 3, data = 0x55585e0040f0 <b_14> \"0999000000000000\", attr = 0x55585e0000b0 <a_4>}";
		const parsed = CobolFieldDataParser.parse(cobFieldValue);
		assert.equal(parsed, "\"099\"");
	});
	test("It can parse numeric value", () => {
		const cobFieldValue = "\"099\"";
		const parsed = NumericValueParser.parse(cobFieldValue, 0);
		assert.equal(parsed, "99");
	});
	test("It can parse signed numeric value", () => {
		const cobFieldValue = "\"099u\"";
		const parsed = NumericValueParser.parse(cobFieldValue, 0);
		assert.equal(parsed, "-995");
	});
	test("It can parse decimal numeric value", () => {
		const cobFieldValue = "\"09901\"";
		const parsed = NumericValueParser.parse(cobFieldValue, 2);
		assert.equal(parsed, "99.01");
	});
	test("It can parse signed decimal numeric value", () => {
		const cobFieldValue = "\"09955v\"";
		const parsed = NumericValueParser.parse(cobFieldValue, 3);
		assert.equal(parsed, "-99.556");
	});
	test("It ignores numeric value parsing if it doesn't start with quotes", () => {
		const cobFieldValue = "-99.55";
		const parsed = NumericValueParser.parse(cobFieldValue, 3);
		assert.equal(parsed, "-99.55");
	});
	test("It can parse signed decimal numeric value with big scale", () => {
		const cobFieldValue = "\"123v\"";
		const parsed = NumericValueParser.parse(cobFieldValue, 8);
		assert.equal(parsed, "-0.00001236");
	});
	test("It can parse signed decimal numeric value with negative scale", () => {
		const cobFieldValue = "\"123v\"";
		const parsed = NumericValueParser.parse(cobFieldValue, -4);
		assert.equal(parsed, "-12360000");
	});
});
