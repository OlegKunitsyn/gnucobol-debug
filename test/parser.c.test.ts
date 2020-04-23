import * as assert from 'assert';
import * as nativePath from "path";
import { SourceMap } from '../src/parser.c';

suite("C code parse", () => {
	const cwd = nativePath.resolve(__dirname, '../../test/resources');
	test("Minimal", () => {
		const c = nativePath.resolve(cwd, 'hello.c');
		const cobol = nativePath.resolve(cwd, 'hello.cbl');
		const parsed = new SourceMap(cwd, [c]);

		assert.equal(3, parsed.getLinesCount());
		assert.equal(1, parsed.getVarsCount());
		assert.equal('b_6', parsed.getVarC('MYVAR'));
		assert.equal('b_6', parsed.getVarC('"MYVAR"'));
		assert.equal('MYVAR', parsed.getVarCobol('b_6'));
		assert.equal(105, parsed.getLineC(cobol, 8).lineC);
		assert.equal(c, parsed.getLineC(cobol, 8).fileC);
		assert.equal(105, parsed.getLineC('hello.cbl', 8).lineC);
		assert.equal(c, parsed.getLineC('hello.cbl', 8).fileC);
		assert.equal(8, parsed.getLineCobol(c, 105).lineCobol);
		assert.equal(cobol, parsed.getLineCobol(c, 105).fileCobol);
		assert.equal(8, parsed.getLineCobol('hello.c', 105).lineCobol);
		assert.equal(cobol, parsed.getLineCobol('hello.c', 105).fileCobol);
	});
	test("Compilation Group", () => {
		const cSample = nativePath.resolve(cwd, 'sample.c');
		const cSubSample = nativePath.resolve(cwd, 'subsample.c');
		const cSubSubSample = nativePath.resolve(cwd, 'subsubsample.c');
		const parsed = new SourceMap(cwd, [cSample, cSubSample, cSubSubSample]);

		assert.equal(7, parsed.getLinesCount());
		assert.equal(7, parsed.getVarsCount());
	});
});
