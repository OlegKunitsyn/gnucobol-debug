import * as fs from "fs";
import * as readline from "n-readlines";
import * as nativePath from "path";

const procedureRegex = /\/\*\sLine:\s([0-9]+).*:\s+([0-9a-z_\-\/\.]+)\s+\*\//i;
const includeRegex = /#include\s+\"([0-9a-z_\-\.]+)\"/i;
const dataRegex = /static\s+cob_u8_t\s+([0-9a-z_]+).*\/\*\s+([0-9a-z_\-]+)\s+\*\//i;
let replaceRegex = /\"/gi;

export class Line {
	fileCobol: string;
	fileC: string;
	lineCobol: number;
	lineC: number;
	constructor(filePathCobol: string, lineCobol: number, filePathC: string, lineC: number) {
		this.fileCobol = filePathCobol;
		this.lineCobol = lineCobol;
		this.fileC = filePathC;
		this.lineC = lineC;
	}
}

export class Variable {
	varCobol: string;
	varC: string;
	constructor(varCobol: string, varC: string) {
		this.varCobol = varCobol;
		this.varC = varC;
	}
}

export class SourceMap {
	private cwd: string;
	private lines: Line[] = new Array<Line>();
	private variables: Variable[] = new Array<Variable>();
	constructor(cwd: string, fileCobol: string) {
		this.cwd = cwd;
		this.parse(nativePath.basename(fileCobol.split('.').slice(0, -1).join('.') + '.c'));
	}

	private parse(fileNameC: string): void {
		let line = 0;
		let reader = new readline(nativePath.resolve(this.cwd, fileNameC));
		var row: string;
		while (row = reader.next()) {
			let match = procedureRegex.exec(row);
			if (match) {
				this.lines.push(new Line(match[2], parseInt(match[1]), nativePath.resolve(this.cwd, fileNameC), line + 2));
			}
			match = dataRegex.exec(row);
			if (match) {
				this.variables.push(new Variable(match[2], match[1]));
			}
			match = includeRegex.exec(row);
			if (match) {
				this.parse(match[1]);
			}
			line++;
		}
	}

	public getLinesCount(): number {
		return this.lines.length;
	}

	public getVarsCount(): number {
		return this.variables.length;
	}

	public hasVarCobol(varC: string): boolean {
		return this.variables.some(e => e.varC === varC);
	}

	public getVarCobol(varC: string): string {
		return this.variables.find(e => e.varC === varC)?.varCobol;
	}

	public getVarC(varCobol: string): string {
		varCobol = varCobol.replace(replaceRegex, '');
		return this.variables.find(e => e.varCobol === varCobol)?.varC;
	}

	public getLineC(fileCobol: string, lineCobol: number): Line {
		if (!nativePath.isAbsolute(fileCobol))
			fileCobol = nativePath.join(this.cwd, fileCobol);
		return this.lines.find(e => e.fileCobol === fileCobol && e.lineCobol === lineCobol) ?? new Line('', 0, '', 0);
	}

	public getLineCobol(fileC: string, lineC: number): Line {
		if (!nativePath.isAbsolute(fileC))
			fileC = nativePath.join(this.cwd, fileC);
		return this.lines.find(e => e.fileC === fileC && e.lineC === lineC) ?? new Line('', 0, '', 0);
	}
}