import * as assert from 'assert';
import { couldBeOutput } from '../../src/mi2';

suite("GDB output", () => {
	test("Empty", () => {
		assert.equal(true, couldBeOutput(''));
	});
	test("Line-break", () => {
		assert.equal(true, couldBeOutput("\n"));
	});
	test("Hello", () => {
		assert.equal(true, couldBeOutput('Hello'));
	});
	test("==", () => {
		assert.equal(true, couldBeOutput('=='));
	});
	test("__", () => {
		assert.equal(true, couldBeOutput('__'));
	});
	test("--", () => {
		assert.equal(true, couldBeOutput('--'));
	});
	test("**", () => {
		assert.equal(true, couldBeOutput('**'));
	});
	test("++", () => {
		assert.equal(true, couldBeOutput('++'));
	});
	test("GDB done", () => {
		assert.equal(false, couldBeOutput('2^done'));
	});
	test("undefined", () => {
		assert.equal(false, couldBeOutput('undefined=thread-group-added,id="i1"'));
	});
	test("*", () => {
		assert.equal(false, couldBeOutput('*stopped,reason'));
	});
	test("=", () => {
		assert.equal(false, couldBeOutput('=breakpoint-modified,bkpt'));
	});
});