import * as assert from 'assert';
import * as nativePath from "path";
import * as readline from "n-readlines";
import { Coverage, parseGcov } from '../src/gcov/gcov';

suite("Gcov", () => {
	const cwd = nativePath.resolve(__dirname, '../../test/resources/gcov');
	test("Hello", () => {
		const expected = parseLcov(nativePath.resolve(cwd, 'hello.info'));
		const test = parseGcov([nativePath.resolve(cwd, 'hello')]);

		assert.equal(expected.length, test.length);
		assert.equal(expected[0].fileC, test[0].fileC);
        assert.equal(expected.length, test.length);
        for (let i = 0; i < expected.length; i++) {
            const e = "" + expected[i].lineC + "," + expected[i].hasExecuted; 
            const t = "" + test[i].lineC + "," + test[i].hasExecuted;
            assert.equal(e, t);
        }
    });
    test("Sample", () => {
		const expected = parseLcov(nativePath.resolve(cwd, 'cob23203.info'));
		const test = parseGcov([
            nativePath.resolve(cwd, 'cob23203_1'),
            nativePath.resolve(cwd, 'cob23203_2'),
            nativePath.resolve(cwd, 'cob23203_0')
        ]);

		assert.equal(expected.length, test.length);
		assert.equal(expected[0].fileC, test[0].fileC);
        assert.equal(expected.length, test.length);
        for (let i = 0; i < expected.length; i++) {
            const e = "" + expected[i].lineC + "," + expected[i].hasExecuted; 
            const t = "" + test[i].lineC + "," + test[i].hasExecuted;
            assert.equal(e, t);
        }
	});

	function parseLcov(file:string):Coverage[] {
        let covs:Map<string, Coverage> = new Map<string, Coverage>();
		let fileName:string;
		let reader = new readline(file);
		let line:string;
		while (line = reader.next()) {
            const tags:string[] = line.toString().split(":");
            switch (tags[0]) {
                case "SF":
                    fileName = tags[1];
                    break;
                case "DA":
                    const parts:string[] = tags[1].split(',');
                    covs.set(`${fileName}${parts[0]}`, {
                        fileC:fileName,
                        lineC:parseInt(parts[0]),
                        hasExecuted: parseInt(parts[1]) > 0
                    } as Coverage);
                    break;
            }
		}
        return Array.from(covs.values());
    }
});
