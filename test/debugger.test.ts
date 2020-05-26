import * as assert from 'assert';
import { CobolFieldDataParser, NumericValueParser } from '../src/debugger';

suite("Debugger", () => {
	test("It can parse sized field value", () => {
		const cobFieldValue = "0x55585e0040f0 <b_14> '0' <repeats 17 times>";
		const parsed = CobolFieldDataParser.parse(cobFieldValue);
		assert.equal(parsed, "\"00000000000000000\"");
	});
	test("It can parse replacing 'repeats' pattern", () => {
		const cobFieldValue = "0x00 \"1\", '0' <repeats 17 times>";
		const parsed = CobolFieldDataParser.parse(cobFieldValue);
		assert.equal(parsed, "\"100000000000000000\"");
	});
	test("It can parse unknown value", () => {
		const cobFieldValue = "0x55585e0000b0";
		const parsed = CobolFieldDataParser.parse(cobFieldValue);
		assert.equal(parsed, "null");
	});
	test("It can parse empty value", () => {
		const cobFieldValue = "0x00 <b_14> \"\"";
		const parsed = CobolFieldDataParser.parse(cobFieldValue);
		assert.equal(parsed, "\"\"");
	});
	test("It can parse unknown value even having data storage reference", () => {
		const cobFieldValue = "0x00 <b_14>";
		const parsed = CobolFieldDataParser.parse(cobFieldValue);
		assert.equal(parsed, "null");
	});
	test("It can parse without data storage reference", () => {
		const cobFieldValue = "0x00 '0' <repeats 17 times>";
		const parsed = CobolFieldDataParser.parse(cobFieldValue);
		assert.equal(parsed, "\"00000000000000000\"");
	});
	test("It can parse without data storage reference replacing 'repeats' pattern", () => {
		const cobFieldValue = "0x00 \"1\", '0' <repeats 17 times>";
		const parsed = CobolFieldDataParser.parse(cobFieldValue);
		assert.equal(parsed, "\"100000000000000000\"");
	});
	test("It can parse data value", () => {
		const cobFieldValue = "0x55585e0040f0 <b_14> \"00000000000000000\"";
		const parsed = CobolFieldDataParser.parse(cobFieldValue);
		assert.equal(parsed, "\"00000000000000000\"");
	});
	test("It can parse numeric value", () => {
		const cobFieldValue = "\"099\"";
		const parsed = NumericValueParser.parse(cobFieldValue, 3, 0);
		assert.equal(parsed, "99");
	});
	test("It can parse signed numeric value", () => {
		const cobFieldValue = "\"099u\"";
		const parsed = NumericValueParser.parse(cobFieldValue, 4, 0);
		assert.equal(parsed, "-995");
	});
	test("It can parse decimal numeric value", () => {
		const cobFieldValue = "\"09901\"";
		const parsed = NumericValueParser.parse(cobFieldValue, 5, 2);
		assert.equal(parsed, "99.01");
	});
	test("It can parse signed decimal numeric value", () => {
		const cobFieldValue = "\"09955v\"";
		const parsed = NumericValueParser.parse(cobFieldValue, 6, 3);
		assert.equal(parsed, "-99.556");
	});
	test("It ignores numeric value parsing if it doesn't start with quotes", () => {
		const cobFieldValue = "-99.55";
		const parsed = NumericValueParser.parse(cobFieldValue, 6, 3);
		assert.equal(parsed, "-99.55");
	});
	test("It can parse signed decimal numeric value with big scale", () => {
		const cobFieldValue = "\"123v\"";
		const parsed = NumericValueParser.parse(cobFieldValue, 4, 8);
		assert.equal(parsed, "-0.00001236");
	});
	test("It can parse signed decimal numeric value with negative scale", () => {
		const cobFieldValue = "\"123v\"";
		const parsed = NumericValueParser.parse(cobFieldValue, 4, -4);
		assert.equal(parsed, "-12360000");
	});
	test("It can parse numeric based on field size", () => {
		const cobFieldValue = "\"123v22223222\"";
		const parsed = NumericValueParser.parse(cobFieldValue, 4, -4);
		assert.equal(parsed, "-12360000");
	});
});
