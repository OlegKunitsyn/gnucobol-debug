import * as assert from 'assert';
import * as nativePath from "path";
import { SourceMap } from '../../src/parser.c';

suite("C code parse", () => {
	const cwd = nativePath.resolve(__dirname, '../../../test/resources');
	test("Minimal", () => {
		const c = nativePath.resolve(cwd, 'hello.c');
		const cobol = '/home/olegs/projects/gnucobol-debug/test/resources/hello.cbl';
		const parsed = new SourceMap(cwd, [c]);

		assert.equal(3, parsed.getLinesCount());
		assert.equal(3, parsed.getVariablesCount());
		assert.equal('b_6', parsed.getVariableByCobol('hello_.MYVAR').cName);
		assert.equal('f_6', parsed.getVariableByCobol('hello_.MYVAR.MYVAR').cName);
		assert.equal('MYVAR', parsed.getVariableByC('hello_.b_6').cobolName);
		assert.equal('MYVAR', parsed.getVariableByC('hello_.f_6').cobolName);
		assert.equal(105, parsed.getLineC(cobol, 8).lineC);
		assert.equal(c, parsed.getLineC(cobol, 8).fileC);
		assert.equal(8, parsed.getLineCobol(c, 105).lineCobol);
		assert.equal(cobol, parsed.getLineCobol(c, 105).fileCobol);

		assert.equal('2.2.0', parsed.getVersion());
	});
	test("GnuCOBOL 3.1.1", () => {
		const c = nativePath.resolve(cwd, 'hello3.c');
		const cobol = '/home/olegs/projects/gnucobol-debug/test/resources/hello3.cbl';
		const parsed = new SourceMap(cwd, [c]);

		assert.equal(3, parsed.getLinesCount());
		assert.equal(3, parsed.getVariablesCount());
		assert.equal('b_8', parsed.getVariableByCobol('hello3_.MYVAR').cName);
		assert.equal('f_8', parsed.getVariableByCobol('hello3_.MYVAR.MYVAR').cName);
		assert.equal('MYVAR', parsed.getVariableByC('hello3_.b_8').cobolName);
		assert.equal('MYVAR', parsed.getVariableByC('hello3_.f_8').cobolName);

		assert.equal(7, parsed.getLineCobol(c, 116).lineCobol);
		assert.equal(8, parsed.getLineCobol(c, 123).lineCobol);
		assert.equal(9, parsed.getLineCobol(c, 130).lineCobol);
		assert.equal(116, parsed.getLineC(cobol, 7).lineC);
		assert.equal(123, parsed.getLineC(cobol, 8).lineC);
		assert.equal(130, parsed.getLineC(cobol, 9).lineC);

		assert.equal('3.1.1.0', parsed.getVersion());
	});
	test("Compilation Group", () => {
		const cSample = nativePath.resolve(cwd, 'sample.c');
		const cSubSample = nativePath.resolve(cwd, 'subsample.c');
		const cSubSubSample = nativePath.resolve(cwd, 'subsubsample.c');
		const parsed = new SourceMap(cwd, [cSample, cSubSample, cSubSubSample]);

		assert.equal(7, parsed.getLinesCount());
		assert.equal(14, parsed.getVariablesCount());

		assert.equal('b_11', parsed.getVariableByCobol('sample_.WS-GROUP').cName);
		assert.equal('f_11', parsed.getVariableByCobol('sample_.WS-GROUP.WS-GROUP').cName);
		assert.equal('f_6', parsed.getVariableByCobol('subsample_.WS-GROUP').cName);
		assert.equal('f_11', parsed.getVariableByCobol('subsubsample_.WS-GROUP-ALPHANUMERIC').cName);

		assert.equal('WS-GROUP', parsed.getVariableByC('sample_.f_11').cobolName);
		assert.equal('WS-GROUP', parsed.getVariableByC('subsample_.f_6').cobolName);
		assert.equal('WS-GROUP-ALPHANUMERIC', parsed.getVariableByC('subsubsample_.f_11').cobolName);

		assert.equal('2.2.0', parsed.getVersion());
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

		assert.equal('3.1-dev.0', parsed.getVersion());
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
			assert.notEqual(variable.attribute.flags, undefined);
		}

		const variable = parsed.getVariableByCobol('datatypes_.NUMERIC-DATA.DISPP');
		assert.equal('numeric', variable.attribute.type);
		assert.equal(8, variable.attribute.digits);
		assert.equal(8, variable.attribute.scale);

		assert.equal('3.1-dev.0', parsed.getVersion());
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

		const argADataStorageFunc = parsed.getVariableByCobol('func_.ARGA');
		assert.equal('b_6', argADataStorageFunc.cName);

		const argAFunc = parsed.getVariableByCobol('func_.ARGA.ARGA');
		assert.equal('f_6', argAFunc.cName);

		const dividendDvd = parsed.getVariableByCobol('dvd_.DIVIDEND');
		assert.equal('f_14', dividendDvd.cName);

		const argAMlp = parsed.getVariableByCobol('mlp_.ARGA');
		assert.equal('f_23', argAMlp.cName);

		assert.equal('2.2.0', parsed.getVersion());
	});
});
