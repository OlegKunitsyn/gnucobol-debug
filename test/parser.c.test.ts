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
		assert.equal(2, parsed.getVariablesCount());
		assert.equal('f_6', parsed.getVariableByCobol('hello_.MYVAR').cName);
		assert.equal('MYVAR', parsed.getVariableByC('hello_.f_6').cobolName);
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
		assert.equal(13, parsed.getVariablesCount());

		assert.equal('f_11', parsed.getVariableByCobol('sample_.WS-GROUP').cName);
		assert.equal('f_6', parsed.getVariableByCobol('subsample_.WS-GROUP').cName);
		assert.equal('f_11', parsed.getVariableByCobol('subsubsample_.WS-GROUP-ALPHANUMERIC').cName);

		assert.equal('WS-GROUP', parsed.getVariableByC('sample_.f_11').cobolName);
		assert.equal('WS-GROUP', parsed.getVariableByC('subsample_.f_6').cobolName);
		assert.equal('WS-GROUP-ALPHANUMERIC', parsed.getVariableByC('subsubsample_.f_11').cobolName);
	});
	test("Variables Hierarchy", () => {
		const c = nativePath.resolve(cwd, 'petstore.c');
		const parsed = new SourceMap(cwd, [c]);

		assert.equal('b_14', parsed.getVariableByCobol('petstore_.WS-BILL').cName);
		assert.equal('f_15', parsed.getVariableByCobol('petstore_.WS-BILL.TOTAL-QUANTITY').cName);
		assert.equal('WS-BILL', parsed.getVariableByC('petstore_.b_14').cobolName);
		assert.equal('TOTAL-QUANTITY', parsed.getVariableByC('petstore_.f_15').cobolName);
	});
	test("Find variables by function and COBOL name", () => {
		const c = nativePath.resolve(cwd, 'petstore.c');
		const parsed = new SourceMap(cwd, [c]);

		assert.equal('f_15', parsed.findVariableByCobol('petstore_', 'TOTAL-QUANTITY').cName);
		assert.equal('f_15', parsed.findVariableByCobol('petstore_', 'WS-BILL.TOTAL-QUANTITY').cName);
		assert.equal(null, parsed.findVariableByCobol('petstore_', 'BLABLABLA'));
		assert.equal(null, parsed.findVariableByCobol('blablaba_', 'WS-BILL.TOTAL-QUANTITY'));
	});
	test("Attributes", () => {
		const c = nativePath.resolve(cwd, 'datatypes.c');
		const parsed = new SourceMap(cwd, [c]);

		for (let variable of parsed.getVariablesByCobol()) {
			assert.notEqual(variable.attribute, null);
			assert.notEqual(variable.attribute, undefined);
			assert.notEqual(variable.attribute.type, null);
			assert.notEqual(variable.attribute.type, undefined);
			assert.notEqual(variable.attribute.digits, null);
			assert.notEqual(variable.attribute.digits, undefined);
			assert.notEqual(variable.attribute.scale, null);
			assert.notEqual(variable.attribute.scale, undefined);
		}

		const variable = parsed.getVariableByCobol('datatypes_.numeric-data.dispp');
		assert.equal('Numeric', variable.attribute.type);
		assert.equal(8, variable.attribute.digits);
		assert.equal(8, variable.attribute.scale);
	});
	test("Multiple Functions", () => {
		const c = nativePath.resolve(cwd, 'func.c');
		const parsed = new SourceMap(cwd, [c]);

		const f_6 = parsed.getVariableByC('func_.f_6');
		assert.equal('argA', f_6.cobolName);

		const f_14 = parsed.getVariableByC('dvd_.f_14');
		assert.equal('dividend', f_14.cobolName);

		const f_23 = parsed.getVariableByC('mlp_.f_23');
		assert.equal('argA', f_23.cobolName);

		const argAFunc = parsed.getVariableByCobol('func_.argA');
		assert.equal('f_6', argAFunc.cName);

		const dividendDvd = parsed.getVariableByCobol('dvd_.dividend');
		assert.equal('f_14', dividendDvd.cName);

		const argAMlp = parsed.getVariableByCobol('mlp_.argA');
		assert.equal('f_23', argAMlp.cName);
	});
});
