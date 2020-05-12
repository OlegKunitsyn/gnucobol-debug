import * as readline from "n-readlines";
import * as nativePath from "path";
import { DebuggerVariable } from "./debugger";

const procedureRegex = /\/\*\sLine:\s([0-9]+)/i;
const dataStorageRegex = /static\s+.*\s+(b_[0-9]+)[;\[].*\/\*\s+([0-9a-z_\-]+)\s+\*\//i;
const fieldRegex = /static\s+cob_field\s+([0-9a-z_]+)\s+\=\s+\{[0-9]+\,\s+([0-9a-z_]+).*\/\*\s+([0-9a-z_\-]+)\s+\*\//i;
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

export class SourceMap {
	private cwd: string;
	private lines: Line[] = new Array<Line>();
	private variableRoot = new DebuggerVariable("ROOT", "ROOT");
	private variablesByC: Map<string, DebuggerVariable> = new Map<string, DebuggerVariable>();

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
			match = dataStorageRegex.exec(line);
			if (match) {
				const dataStorage = new DebuggerVariable(match[2], match[1]);
				this.variablesByC.set(match[1], dataStorage);
				this.variableRoot.addChild(dataStorage);
			}
			match = fieldRegex.exec(line);
			if (match) {
				//TODO - Add placeholder for fields without data storages or simply ignore them.
				const dataStorage = this.variablesByC.get(match[2]);
				if (dataStorage !== undefined) {
					const field = new DebuggerVariable(match[3], match[1]);
					dataStorage.addChild(field);
					this.variablesByC.set(field.cName, field);
				}
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

	public getDataStoragesCount(): number {
		return this.variableRoot.size();
	}

	public getDataStorages(): DebuggerVariable[] {
		const ret: DebuggerVariable[] = [];
		for (let variable of this.variableRoot.children.values()) {
			ret.push(variable);
		}
		return ret;
	}

	public getCobolVariableByC(varC: string): DebuggerVariable {
		if (this.variablesByC.has(varC)) {
			return this.variablesByC.get(varC);
		}
		return null;
	}

	public getCobolVariableByCobol(cobolPath: string): DebuggerVariable {
		return this.variableRoot.getChild(cobolPath);
	}

	public hasDataStorageCobol(dataStorageC: string): boolean {
		return this.variablesByC.has(dataStorageC);
	}

	public hasLineCobol(fileC: string, lineC: number): boolean {
		if (!nativePath.isAbsolute(fileC))
			fileC = nativePath.join(this.cwd, fileC);
		return this.lines.some(e => e.fileC === fileC && e.lineC === lineC);
	}

	public getDataStorageCobol(dataStorageC: string): string {
		return this.variablesByC.get(dataStorageC)?.cobolName;
	}

	public getDataStorageC(dataStorageCobol: string): string {
		dataStorageCobol = dataStorageCobol.replace(replaceRegex, '');
		return this.variableRoot.getChild(dataStorageCobol)?.cName;
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

		out += this.variableRoot.toString() + "\n";
		
		return out;
	}
}