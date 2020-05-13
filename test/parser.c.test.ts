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
		assert.equal(2, parsed.getDataStoragesCount());
		assert.equal('b_6', parsed.getVariableByCobol('MYVAR').cName);
		assert.equal('MYVAR', parsed.getVariableByC('b_6').cobolName);
		assert.equal(105, parsed.getLineC(cobol, 8).lineC);
		assert.equal(c, parsed.getLineC(cobol, 8).fileC);
		assert.equal(105, parsed.getLineC('hello.cbl', 8).lineC);
		assert.equal(c, parsed.getLineC('hello.cbl', 8).fileC);
		assert.equal(8, parsed.getLineCobol(c, 105).lineCobol);
		assert.equal(cobol, parsed.getLineCobol(c, 105).fileCobol);
		assert.equal(8, parsed.getLineCobol('hello.c', 105).lineCobol);
		assert.equal(cobol, parsed.getLineCobol('hello.c', 105).fileCobol);
		assert.equal(cobol, parsed.getLineCobol(c, 105).fileCobol);
	});
	test("Compilation Group", () => {
		const cSample = nativePath.resolve(cwd, 'sample.c');
		const cSubSample = nativePath.resolve(cwd, 'subsample.c');
		const cSubSubSample = nativePath.resolve(cwd, 'subsubsample.c');
		const parsed = new SourceMap(cwd, [cSample, cSubSample, cSubSubSample]);

		assert.equal(8, parsed.getLinesCount());
		assert.equal(8, parsed.getDataStoragesCount());
	});
	test("Variables Hierarchy", () => {
		const c = nativePath.resolve(cwd, 'petstore.c');
		const parsed = new SourceMap(cwd, [c]);

		assert.equal('b_14', parsed.getVariableByCobol('WS-BILL').cName);
		assert.equal('f_15', parsed.getVariableByCobol('WS-BILL.TOTAL-QUANTITY').cName);
		assert.equal('WS-BILL', parsed.getVariableByC('b_14').cobolName);
		assert.equal('TOTAL-QUANTITY', parsed.getVariableByC('f_15').cobolName);
	});
});
