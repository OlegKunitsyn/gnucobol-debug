import * as assert from 'assert';
import * as nativePath from "path";
import * as readline from "n-readlines";
import * as fs from "fs";
import { Coverage, SourceFile, Line, GcnoFunction, DataInput } from '../src/gcov/gcov';
import { GcdaRecordsParser } from '../src/gcov/parser.gcda';
import { GcnoRecordsParser } from '../src/gcov/parser.gcno';

suite("Gcov", () => {
	const cwd = nativePath.resolve(__dirname, '../../test/resources/gcov');
	test("Hello", () => {
		const expected = parseLcov(nativePath.resolve(cwd, 'hello.info'));
		const test = parseGcov([nativePath.resolve(cwd, 'hello.gcda')]);

		assert.equal(expected.length, test.length);
		assert.equal(expected[0].file, test[0].file);
        assert.equal(expected[0].lines.size, test[0].lines.size);
        for (let line of expected[0].lines.keys()) {
            const e = "" + line + "," + expected[0].lines[line];
            const t = "" + line + "," + test[0].lines[line];
            assert.equal(e, t);
        }
    });
    test("Sample", () => {
		const expected = parseLcov(nativePath.resolve(cwd, 'cob23203.info'));
		const test = parseGcov([
            nativePath.resolve(cwd, 'cob23203_1.gcda'),
            nativePath.resolve(cwd, 'cob23203_2.gcda'),
            nativePath.resolve(cwd, 'cob23203_0.gcda')
        ]);

		assert.equal(expected.length, test.length);
		assert.equal(expected[0].file, test[0].file);
        assert.equal(expected[0].lines.size, test[0].lines.size);
        for (let line of expected[0].lines.keys()) {
            const e = "" + line + "," + expected[0].lines[line];
            const t = "" + line + "," + test[0].lines[line];
            assert.equal(e, t);
        }
	});

	function parseGcov(gcdaFiles:string[]):Coverage[] {
		let gcdaRecordsParser:GcdaRecordsParser;
        let stream:DataInput;
        let sourceFiles:SourceFile[] = [];
        let gcnoFunctions:GcnoFunction[] = [];
        let sourceMap:Map<string, SourceFile> = new Map<string, SourceFile>();

        for (let gcdaFile of gcdaFiles) {
            let gcnoPath = gcdaFile.replace(".gcda", ".gcno");
            stream = new DataInput(fs.readFileSync(gcnoPath));
            let gcnoRecordsParser = new GcnoRecordsParser(sourceMap, sourceFiles);
            gcnoRecordsParser.parse(stream);

            // add new functions
            for (let f of gcnoRecordsParser.getFunctions()) {
                gcnoFunctions.push(f);
            }

			// parse GCDA file
			stream = new DataInput(fs.readFileSync(gcdaFile));
            if (gcnoRecordsParser.getFunctions().length === 0) {
                throw new Error("No functions");
            }
            gcdaRecordsParser = new GcdaRecordsParser(gcnoRecordsParser.getFunctions());
            gcdaRecordsParser.parse(stream);
        }

        let coverages:Coverage[] = [];
        for (let sourceFile of sourceFiles) {
            let linesCount = sourceFile.linesCount;
            for (let j = 0; j < linesCount; j++) {
                sourceFile.lines.push(new Line());
            }
            for (let gcnoFunction of sourceFile.funcs) {
                for (let block of gcnoFunction.functionBlocks) {
                    for (let lineno of block.lineNumbers) {
                        let line:Line = sourceFile.lines[lineno];
                        line.addBlock(block);
                    }
                }
                gcnoFunction.solveGraphFunction();
                gcnoFunction.addLineCounts(sourceFiles);
            }

            // coverage
            let coverage = new Coverage(sourceFile.name);
            for (let line of sourceFile.lines) {
                if (!line.exists) {
                    continue;
                }
                for (let block of line.blocks) {
                    for (let lineNum of block.lineNumbers) {
                        coverage.lines.set(lineNum, line.count > 0);
                    }
                }
            }
            coverages.push(coverage);
		}
		return coverages;
	}

	function parseLcov(file:string):Coverage[] {
        let covs:Coverage[] =[];
		let cov:Coverage = null;
		let reader = new readline(file);
		let line:string;
		while (line = reader.next()) {
            const tags:string[] = line.toString().split(":");
            switch (tags[0]) {
                case "SF":
                    cov = new Coverage(tags[1]);
                    covs.push(cov);
                    break;
                case "DA":
                    const parts:string[] = tags[1].split(',');
                    cov.lines.set(parseInt(parts[0]), parseInt(parts[1]) > 0);
                    break;
            }
		}
        return covs;
    }
});
