import * as readline from "n-readlines";
import * as nativePath from "path";
import { DebuggerVariable, Attribute, VariableType } from "./debugger";

const procedureRegex = /\/\*\sLine:\s([0-9]+)/i;
const attributeRegex = /static\sconst\scob_field_attr\s(a_[0-9]+).*\{(0x\d+),\s*([0-9-]*),\s*([0-9-]*),\s*(0x\d{4}),.*/i;
const dataStorageRegex = /static\s+(.*)\s+(b_[0-9]+)(\;|\[\d+\]).*\/\*\s+([0-9a-z_\-]+)\s+\*\//i;
const fieldRegex = /static\s+cob_field\s+([0-9a-z_]+)\s+\=\s+\{(\d+)\,\s+([0-9a-z_]+).+\&(a_\d+).*\/\*\s+([0-9a-z_\-]+)\s+\*\//i;
const fileIncludeRegex = /#include\s+\"([0-9a-z_\-\.\s]+)\"/i;
const fileCobolRegex = /\/\*\sGenerated from\s+([0-9a-z_\-\/\.\s\\:]+)\s+\*\//i;
const functionRegex = /\/\*\sProgram\slocal\svariables\sfor\s'(.*)'\s\*\//i;

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
	private variablesByCobol = new Map<string, DebuggerVariable>();
	private variablesByC = new Map<string, DebuggerVariable>();
	private attributes = new Map<string, Attribute>();
	private dataStorages = new Map<string, DebuggerVariable>();

	constructor(cwd: string, filesCobol: string[]) {
		this.cwd = cwd;
		filesCobol.forEach(e => {
			this.parse(nativePath.basename(e.split('.').slice(0, -1).join('.') + '.c'));
		});
	}

	private parse(fileC: string): void {
		if (!nativePath.isAbsolute(fileC))
			fileC = nativePath.resolve(this.cwd, fileC);

		const basename = nativePath.basename(fileC);
		const cleanedFile = basename.substring(0, basename.lastIndexOf(".c"));

		let lineNumber = 0;
		let reader = new readline(fileC);
		let row: false | Buffer;
		let fileCobol: string;
		let functionName: string;
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
			match = functionRegex.exec(line);
			if (match) {
				functionName = match[1].toLowerCase() + "_";
			}
			match = procedureRegex.exec(line);
			if (match) {
				if (this.lines.length > 0 && this.lines[this.lines.length - 1].fileCobol === fileCobol && this.lines[this.lines.length - 1].lineCobol === parseInt(match[1])) {
					this.lines.pop();
				}
				this.lines.push(new Line(fileCobol, parseInt(match[1]), fileC, lineNumber + 2));
			}
			match = attributeRegex.exec(line);
			if (match) {
				const attribute = new Attribute(match[1], VariableType[match[2]], parseInt(match[3]), parseInt(match[4]), match[5]);
				this.attributes.set(`${cleanedFile}.${match[1]}`, attribute);
			}
			match = dataStorageRegex.exec(line);
			if (match) {
				let size = "unknown";
				if(match[3].startsWith("[")) {
					size = match[3].substring(1, match[3].length - 1);
				}
				const dataStorage = new DebuggerVariable(match[4], match[2], functionName, new Attribute(null, VariableType[match[1]], 0, 0), size);
				this.dataStorages.set(`${functionName}.${dataStorage.cName}`, dataStorage);
				this.variablesByC.set(`${functionName}.${dataStorage.cName}`, dataStorage);
				this.variablesByCobol.set(`${functionName}.${dataStorage.cobolName}`, dataStorage);
			}
			match = fieldRegex.exec(line);
			if (match) {
				const attribute = this.attributes.get(`${cleanedFile}.${match[4]}`);
				const dataStorage = this.dataStorages.get(`${functionName}.${match[3]}`);
				const field = new DebuggerVariable(match[5], match[1], functionName, attribute, match[2]);

				if (dataStorage && dataStorage.cobolName === field.cobolName) {
					this.variablesByC.delete(`${functionName}.${dataStorage.cName}`);

					dataStorage.cName = field.cName;
					dataStorage.attribute = field.attribute;
					dataStorage.size = field.size;

					this.variablesByC.set(`${functionName}.${dataStorage.cName}`, dataStorage);
				} else {
					this.variablesByC.set(`${functionName}.${field.cName}`, field);

					if (dataStorage) {
						dataStorage.addChild(field);
						this.variablesByCobol.set(`${functionName}.${dataStorage.cobolName}.${field.cobolName}`, field);
					} else {
						this.variablesByCobol.set(`${functionName}.${field.cobolName}`, field);
					}
				}
			}
			match = fileIncludeRegex.exec(line);
			if (match) {
				this.parse(match[1]);
			}
			lineNumber++;
		}
	}

	public getVariablesByC(): IterableIterator<DebuggerVariable> {
		return this.variablesByC.values();
	}

	public getVariablesByCobol(): IterableIterator<DebuggerVariable> {
		return this.variablesByCobol.values();
	}

	public getLinesCount(): number {
		return this.lines.length;
	}

	public getVariablesCount(): number {
		return this.variablesByC.size;
	}

	public getVariableByC(varC: string): DebuggerVariable {
		if (this.variablesByC.has(varC)) {
			return this.variablesByC.get(varC);
		}
		return null;
	}

	public findVariableByCobol(functionName: string, name: string): DebuggerVariable {
		for (const key of this.variablesByCobol.keys()) {
			if (key.startsWith(functionName) && key.endsWith(`.${name}`)) {
				return this.variablesByCobol.get(key);
			}
		}
		return null;
	}

	public getVariableByCobol(path: string): DebuggerVariable {
		return this.variablesByCobol.get(path);
	}

	public hasLineCobol(fileC: string, lineC: number): boolean {
		if (!nativePath.isAbsolute(fileC))
			fileC = nativePath.join(this.cwd, fileC);
		return this.lines.some(e => e.fileC === fileC && e.lineC === lineC);
	}

	public hasLineC(fileCobol: string, lineCobol: number): boolean {
		if (!nativePath.isAbsolute(fileCobol))
			fileCobol = nativePath.join(this.cwd, fileCobol);
		return this.lines.some(e => e.fileCobol === fileCobol && e.lineCobol === lineCobol);
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

	public toString(): string {
		let out = `SourceMap created: lines ${this.lines.length}, vars ${this.variablesByC.size}\n`;

		this.lines.forEach(e => {
			out += e.toString() + "\n";
		});

		this.variablesByC.forEach((value, key) => {
			out += `${key}[${value.attribute?.cName}] > ${value.cobolName}\n`;
		});

		this.variablesByCobol.forEach((value, key) => {
			out += `${key}[${value.attribute?.cName}] > ${value.cName}\n`;
		});

		return out;
	}
}