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
		assert.equal(3, parsed.getVariablesCount());
		assert.equal('b_6', parsed.getVariableByCobol('hello.MYVAR').cName);
		assert.equal('MYVAR', parsed.getVariableByC('hello.b_6').cobolName);
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

		assert.equal(7, parsed.getLinesCount());
		assert.equal(14, parsed.getVariablesCount());

		assert.equal('b_11', parsed.getVariableByCobol('sample.WS-GROUP').cName);
		assert.equal('f_11', parsed.getVariableByCobol('sample.WS-GROUP.WS-GROUP').cName);
		assert.equal('f_6', parsed.getVariableByCobol('subsample.WS-GROUP').cName);
		assert.equal('f_11', parsed.getVariableByCobol('subsubsample.WS-GROUP-ALPHANUMERIC').cName);
		
		assert.equal('WS-GROUP', parsed.getVariableByC('sample.b_11').cobolName);
		assert.equal('WS-GROUP', parsed.getVariableByC('sample.f_11').cobolName);
		assert.equal('WS-GROUP', parsed.getVariableByC('subsample.f_6').cobolName);
		assert.equal('WS-GROUP-ALPHANUMERIC', parsed.getVariableByC('subsubsample.f_11').cobolName);
	});
	test("Variables Hierarchy", () => {
		const c = nativePath.resolve(cwd, 'petstore.c');
		const parsed = new SourceMap(cwd, [c]);

		assert.equal('b_14', parsed.getVariableByCobol('petstore.WS-BILL').cName);
		assert.equal('f_15', parsed.getVariableByCobol('petstore.WS-BILL.TOTAL-QUANTITY').cName);
		assert.equal('WS-BILL', parsed.getVariableByC('petstore.b_14').cobolName);
		assert.equal('TOTAL-QUANTITY', parsed.getVariableByC('petstore.f_15').cobolName);
	});
	test("Attributes", () => {
		const c = nativePath.resolve(cwd, 'datatypes.c');
		const parsed = new SourceMap(cwd, [c]);

		for(let variable of parsed.getVariablesByC()) {
			assert.notEqual(variable.attribute, null);
			assert.notEqual(variable.attribute.type, null);
			assert.notEqual(variable.attribute.digits, null);
			assert.notEqual(variable.attribute.scale, null);
		}

		const variable = parsed.getVariableByCobol('datatypes.numeric-data.disppp');
		assert.equal('Numeric', variable.attribute.type);
		assert.equal(8, variable.attribute.digits);
		assert.equal(-4, variable.attribute.scale);
	});
});
