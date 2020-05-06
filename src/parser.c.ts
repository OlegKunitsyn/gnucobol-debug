import * as readline from "n-readlines";
import * as nativePath from "path";

const procedureRegex = /\/\*\sLine:\s([0-9]+)/i;
const varRegex = /static\s+cob_u8_t\s+([0-9a-z_]+).*\/\*\s+([0-9a-z_\-]+)\s+\*\//i;
const fieldRegex = /static\s+cob_field\s+([0-9a-z_]+).*\/\*\s+([0-9a-z_\-]+)\s+\*\//i;
const fileIncludeRegex = /#include\s+\"([0-9a-z_\-\.\s]+)\"/i;
const fileCobolRegex = /\/\*\sGenerated from\s+([0-9a-z_\-\/\.\s]+)\s+\*\//i;
const replaceRegex = /\"/gi;

export class Line {
	fileCobol: string;
	fileC: string;
	lineCobol: number;
	lineC: number;
	public constructor(filePathCobol: string, lineCobol: number, filePathC: string, lineC: number) {
		this.fileCobol = filePathCobol;
		this.lineCobol = lineCobol;
		this.fileC = filePathC;
		this.lineC = lineC;
	}
	public toString(): string {
		return `${this.fileCobol} ${this.lineCobol} > ${this.fileC} ${this.lineC}`;
	}
}

export class Variable {
	varCobol: string;
	varC: string;
	constructor(varCobol: string, varC: string) {
		this.varCobol = varCobol;
		this.varC = varC;
	}
	public toString(): string {
		return `${this.varCobol} > ${this.varC}`;
	}
}

export class SourceMap {
	private cwd: string;
	private lines: Line[] = new Array<Line>();
	private vars: Variable[] = new Array<Variable>();
	constructor(cwd: string, filesCobol: string[]) {
		this.cwd = cwd;
		filesCobol.forEach(e => {
			this.parse(nativePath.basename(e.split('.').slice(0, -1).join('.') + '.c'));
		});
	}

	private parse(fileC: string): void {
		if (!nativePath.isAbsolute(fileC))
			fileC = nativePath.resolve(this.cwd, fileC);
		let lineNumber = 0;
		let reader = new readline(fileC);
		let row: false | Buffer;
		let fileCobol: string;
		while (row = reader.next()) {
			let line = row.toString();
			let match = fileCobolRegex.exec(line);
			if (match) {
				if (!nativePath.isAbsolute(match[1])) {
					fileCobol = nativePath.resolve(this.cwd, match[1]);
				} else {
					fileCobol = match[1];
				}
			}
			match = procedureRegex.exec(line);
			if (match) {
				if (this.lines.length > 0 && this.lines[this.lines.length - 1].fileCobol === fileCobol && this.lines[this.lines.length - 1].lineCobol === parseInt(match[1])) {
					this.lines.pop();
				}
				this.lines.push(new Line(fileCobol, parseInt(match[1]), fileC, lineNumber + 2));
			}
			match = varRegex.exec(line);
			if (match) {
				this.vars.push(new Variable(match[2], match[1]));
			}
			match = fieldRegex.exec(line);
			if (match) {
				this.vars.push(new Variable(match[2], match[1]));
			}
			match = fileIncludeRegex.exec(line);
			if (match) {
				this.parse(match[1]);
			}
			lineNumber++;
		}
	}

	public getLinesCount(): number {
		return this.lines.length;
	}

	public getVarsCount(): number {
		return this.vars.length;
	}

	public hasVarCobol(varC: string): boolean {
		return this.vars.some(e => e.varC === varC);
	}

	public hasLineCobol(fileC: string, lineC: number): boolean {
		if (!nativePath.isAbsolute(fileC))
			fileC = nativePath.join(this.cwd, fileC);
		return this.lines.some(e => e.fileC === fileC && e.lineC === lineC);
	}

	public getVarCobol(varC: string): string {
		return this.vars.find(e => e.varC === varC)?.varCobol;
	}

	public getVarC(varCobol: string): string {
		varCobol = varCobol.replace(replaceRegex, '');
		return this.vars.find(e => e.varCobol === varCobol)?.varC;
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

	public getNextStep(fileC: string, lineC: number): Line {
		let result = null;
		const idx = this.lines.findIndex(e => e.fileC === fileC && e.lineC === lineC) + 1;
		if (idx < this.lines.length) {
			let line = this.getLineC(this.lines[idx].fileCobol, this.lines[idx].lineCobol);
			if (line.lineC > 0) {
				result = line;
			}
		}
		return result;
	}

	public toString(): string {
		let out = '';
		this.lines.forEach(e => {
			out += e.toString() + "\n";
		});
		this.vars.forEach(e => {
			out += e.toString() + "\n";
		});
		return out;
	}
}