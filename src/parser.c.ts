import * as readline from "n-readlines";
import * as nativePath from "path";

const procedureRegex = /\/\*\sLine:\s([0-9]+)/i;
const dataStorageRegex = /static\s+[0-9a-z_\-]+\s+(b_[0-9]+).*\/\*\s+([0-9a-z_\-]+)\s+\*\//i;
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

export interface CobolVariable {
	setType(value: string): void;
	setValue(type: string): void;
	setRaw(raw: any): void;
	getCobolName(): string;
	getCName(): string;
	getType(): string;
	getValue(): string;
	getRaw(): any;
}

export class DataStorage implements CobolVariable {
	
	private type: string;
	private value: string;
	private raw: any;

	constructor(
		public dataStorageCobol: string,
		public dataStorageC: string,
		public vars: Map<string, Field> = new Map<string, Field>()
	) { }

	setType(type: string): void {
		this.type = type;
	}

	setValue(value: string): void {
		this.value = value;
	}

	setRaw(raw: any): void {
		this.raw = raw;
	}

	getCobolName(): string {
		return this.dataStorageCobol;
	}

	getCName(): string {
		return this.dataStorageC;
	}

	getType(): string {
		return this.type;
	}

	getValue(): string {
		return this.value;
	}

	getRaw(): any {
		return this.raw;
	}

	public toString(): string {
		let out = `${this.dataStorageCobol} > ${this.dataStorageC}:\n\t`;
		this.vars.forEach(e => {
			out += e.toString() + "\n\t";
		});
		return out;
	}
}

export class Field implements CobolVariable {
	
	private type: string;
	private value: string;
	private raw: any;

	constructor(
		public fieldCobol: string,
		public fieldC: string
	) { }

	setType(type: string): void {
		this.type = type;
	}

	setValue(value: string): void {
		this.value = value;
	}

	setRaw(raw: any): void {
		this.raw = raw;
	}

	getCobolName(): string {
		return this.fieldCobol;
	}

	getCName(): string {
		return this.fieldC;
	}

	getType(): string {
		return this.type;
	}

	getValue(): string {
		return this.value;
	}

	getRaw(): any {
		return this.raw;
	}

	public toString(): string {
		return `${this.fieldCobol} > ${this.fieldC}`;
	}
}

export class SourceMap {
	private cwd: string;
	private lines: Line[] = new Array<Line>();
	private dataStoragesByC: Map<string, DataStorage> = new Map<string, DataStorage>();
	private dataStoragesByCobol: Map<string, DataStorage> = new Map<string, DataStorage>();
	private fieldsByC: Map<string, Field> = new Map<string, Field>();
	private fieldsByCobol: Map<string, Field> = new Map<string, Field>();

	constructor(cwd: string, filesCobol: string[]) {
		this.cwd = cwd;
		filesCobol.forEach(e => {
			this.parse(nativePath.basename(e.split('.').slice(0, -1).join('.') + '.c'));
		});
	}

	private parse(fileC: string): void {
		if (!nativePath.isAbsolute(fileC))
			fileC = nativePath.resolve(this.cwd, fileC);
		let line = 0;
		let reader = new readline(fileC);
		let row: string;
		let fileCobol: string;
		while (row = reader.next()) {
			let match = fileCobolRegex.exec(row);
			if (match) {
				if (!nativePath.isAbsolute(match[1])) {
					fileCobol = nativePath.resolve(this.cwd, match[1]);
				} else {
					fileCobol = match[1];
				}
			}
			match = procedureRegex.exec(row);
			if (match) {
				if (this.lines.length > 0 && this.lines[this.lines.length - 1].fileCobol === fileCobol && this.lines[this.lines.length - 1].lineCobol === parseInt(match[1])) {
					this.lines.pop();
				}
				this.lines.push(new Line(fileCobol, parseInt(match[1]), fileC, line + 2));
			}
			match = dataStorageRegex.exec(row);
			if (match) {
				const dataStorage = new DataStorage(match[2], match[1]);
				this.dataStoragesByC.set(match[1], dataStorage);
				this.dataStoragesByCobol.set(match[2], dataStorage);
			}
			match = fieldRegex.exec(row);
			if (match) {
				const dataStorage = this.dataStoragesByC.get(match[2]);
				if (dataStorage.dataStorageCobol !== match[3]) {
					const field = new Field(match[3], match[1]);
					dataStorage.vars.set(match[1], field);
					this.fieldsByC.set(field.fieldC, field);
					this.fieldsByCobol.set(field.fieldCobol, field);
				}
			}
			match = fileIncludeRegex.exec(row);
			if (match) {
				this.parse(match[1]);
			}
			line++;
		}
	}

	public getLinesCount(): number {
		return this.lines.length;
	}

	public getDataStoragesCount(): number {
		return this.dataStoragesByC.size;
	}

	public getDataStorages(): IterableIterator<CobolVariable> {
		return this.dataStoragesByC.values();
	}

	public getFields(): IterableIterator<CobolVariable> {
		return this.fieldsByC.values();
	}

	public getCobolVariableByC(varC: string): CobolVariable {
		if(this.dataStoragesByC.has(varC)) {
			return this.dataStoragesByC.get(varC);
		}
		if(this.fieldsByC.has(varC)) {
			return this.fieldsByC.get(varC);
		}
		return null;
	}

	public getCobolVariableByCobol(varCobol: string): CobolVariable {
		if(this.dataStoragesByCobol.has(varCobol)) {
			return this.dataStoragesByCobol.get(varCobol);
		}
		if(this.fieldsByCobol.has(varCobol)) {
			return this.fieldsByCobol.get(varCobol);
		}
		return null;
	}

	public hasDataStorageCobol(dataStorageC: string): boolean {
		return this.dataStoragesByC.has(dataStorageC);
	}

	public hasLineCobol(fileC: string, lineC: number): boolean {
		if (!nativePath.isAbsolute(fileC))
			fileC = nativePath.join(this.cwd, fileC);
		return this.lines.some(e => e.fileC === fileC && e.lineC === lineC);
	}

	public getDataStorageCobol(dataStorageC: string): string {
		return this.dataStoragesByC.get(dataStorageC)?.dataStorageCobol;
	}

	public getDataStorageC(dataStorageCobol: string): string {
		dataStorageCobol = dataStorageCobol.replace(replaceRegex, '');
		return this.dataStoragesByCobol.get(dataStorageCobol)?.dataStorageC;
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
		this.dataStoragesByC.forEach(e => {
			out += e.toString() + "\n";
		});
		return out;
	}
}