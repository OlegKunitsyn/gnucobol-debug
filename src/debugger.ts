import { MINode } from "./parser.mi2";
import { DebugProtocol } from "vscode-debugprotocol/lib/debugProtocol";
import { removeLeadingZeroes } from "./parser.expression";

export interface Breakpoint {
	file?: string;
	line?: number;
	raw?: string;
	condition: string;
	countCondition?: string;
}

export interface Thread {
	id: number;
	targetId: string;
	name?: string;
}

export interface Stack {
	level: number;
	address: string;
	function: string;
	fileName: string;
	file: string;
	line: number;
}

export enum CobFlag {
	HAVE_SIGN,
	SIGN_SEPARATE,
	SIGN_LEADING,
	BLANK_ZERO,
	JUSTIFIED,
	BINARY_SWAP,
	REAL_BINARY,
	IS_POINTER,
	NO_SIGN_NIBBLE,
	IS_FP,
	REAL_SIGN,
	BINARY_TRUNC,
	CONSTANT
}

const flagMatchers = new Map<RegExp, CobFlag>();
flagMatchers.set(/0x\d\d\d1/, CobFlag.HAVE_SIGN);
flagMatchers.set(/0x\d\d\d2/, CobFlag.SIGN_SEPARATE);
flagMatchers.set(/0x\d\d\d4/, CobFlag.SIGN_LEADING);
flagMatchers.set(/0x\d\d\d8/, CobFlag.BLANK_ZERO);
flagMatchers.set(/0x\d\d1\d/, CobFlag.JUSTIFIED);
flagMatchers.set(/0x\d\d2\d/, CobFlag.BINARY_SWAP);
flagMatchers.set(/0x\d\d4\d/, CobFlag.REAL_BINARY);
flagMatchers.set(/0x\d\d8\d/, CobFlag.IS_POINTER);
flagMatchers.set(/0x\d1\d\d/, CobFlag.NO_SIGN_NIBBLE);
flagMatchers.set(/0x\d2\d\d/, CobFlag.IS_FP);
flagMatchers.set(/0x\d4\d\d/, CobFlag.REAL_SIGN);
flagMatchers.set(/0x\d8\d\d/, CobFlag.BINARY_TRUNC);
flagMatchers.set(/0x1\d\d\d/, CobFlag.CONSTANT);

export interface VariableDetail {
	type: string,
	name: string,
	value: string
}

export enum VariableType {
	'0x00' = 'unknown',
	'0x01' = 'group',
	'0x02' = 'boolean',
	'0x10' = 'numeric',
	'0x11' = 'numeric binary',
	'0x12' = 'numeric packed',
	'0x13' = 'numeric float',
	'0x14' = 'numeric double',
	'0x15' = 'numeric l double',
	'0x16' = 'numeric FP DEC64',
	'0x17' = 'numeric FP DEC128',
	'0x18' = 'numeric FP BIN32',
	'0x19' = 'numeric FP BIN64',
	'0x1A' = 'numeric FP BIN128',
	'0x1B' = 'numeric COMP5',
	'0x24' = 'numeric edited',
	'0x20' = 'alphanumeric',
	'0x21' = 'alphanumeric',
	'0x22' = 'alphanumeric',
	'0x23' = 'alphanumeric edited',
	'0x40' = 'national',
	'0x41' = 'national edited',
	'int' = 'integer',
	'cob_u8_t' = 'group'
}

export class Attribute {
	public flags: Set<CobFlag>;

	public constructor(
		public cName: string,
		public type: string,
		public digits: number,
		public scale: number,
		flagStr?: string) {
		this.flags = this.buildFlags(flagStr);
	}

	public has(flag: CobFlag): boolean {
		return this.flags.has(flag);
	}

	private buildFlags(flagsStr: string): Set<CobFlag> {
		if (!flagsStr) {
			return new Set();
		}
		const flags = new Set<CobFlag>();
		flagMatchers.forEach((flag, matcher) => {
			if (matcher.test(flagsStr)) {
				flags.add(flag);
			}
		});
		return flags;
	}

	public getDetails(size: string): [string, VariableDetail[]] {
		const details: VariableDetail[] = [];
		let type = this.type;

		switch (this.type) {
			case 'boolean':
				type = "bit";
				details.push({ type: 'number', name: 'digits', value: `${this.digits}` });
				break;
			case 'numeric binary':
				if (this.has(CobFlag.IS_POINTER)) {
					type = "pointer";
				}
			case 'numeric':
			case 'numeric packed':
			case 'numeric float':
			case 'numeric double':
			case 'numeric edited':
				details.push({ type: 'boolean', name: 'signed', value: `${this.has(CobFlag.HAVE_SIGN)}` });
				details.push({ type: 'number', name: 'digits', value: `${this.digits}` });
				details.push({ type: 'number', name: 'scale', value: `${this.scale}` });
				break;
			case 'group':
			case 'alphanumeric':
			case 'national':
				details.push({ type: 'number', name: 'size', value: `${size}` });
				break;
			default:
				break;
		}

		return [type, details];
	}

	public parse(valueStr: string): string {
		if (!valueStr) {
			return null;
		}
		switch (this.type) {
			case 'group':
				return valueStr;
			case 'boolean':
			case 'numeric':
			case 'numeric binary':
			case 'numeric packed':
			case 'numeric float':
			case 'numeric double':
			case 'numeric long double':
			case 'numeric fp dec64':
			case 'numeric fp dec128':
			case 'numeric fp bin32':
			case 'numeric fp bin64':
			case 'numeric fp bin128':
			case 'numeric comp5':
			case 'integer':
				return removeLeadingZeroes(valueStr);
			default:
				return `"${valueStr.trim()}"`;
		}
	}
}

export class DebuggerVariable {

	public displayableType: string;
	public details: VariableDetail[];

	public constructor(
		public cobolName: string,
		public cName: string,
		public functionName: string,
		public attribute: Attribute = null,
		public size: string = null,
		public value: string = null,
		public parent: DebuggerVariable = null,
		public children: Map<string, DebuggerVariable> = new Map<string, DebuggerVariable>()) {
		[this.displayableType, this.details] = this.attribute.getDetails(this.size);
	}

	public addChild(child: DebuggerVariable): void {
		child.parent = this;
		this.children.set(child.cobolName, child);
	}

	public getDataStorage(): DebuggerVariable {
		if (this.parent) {
			return this.parent.getDataStorage();
		}
		return this;
	}

	public hasChildren(): boolean {
		return this.children.size > 0;
	}

	public setValue(value: string): void {
		this.value = this.attribute.parse(value);
	}

	public toDebugProtocolVariable(): DebugProtocol.Variable[] {
		const result: DebugProtocol.Variable[] = [];

		for (const detail of this.details) {
			result.push({
				name: detail.name,
				type: detail.type,
				value: detail.value,
				variablesReference: 0
			});
		}

		result.push({
			name: 'value',
			type: this.displayableType,
			value: this.value || "null",
			variablesReference: 0
		});
		return result;
	}
}

export interface IDebugger {
	load(cwd: string, target: string, targetargs: string[], group: string[]): Thenable<any>;
	connect(cwd: string, executable: string, target: string): Thenable<any>;
	start(): Thenable<boolean>;
	stop(): void;
	detach(): void;
	interrupt(): Thenable<boolean>;
	continue(): Thenable<boolean>;
	stepOver(): Thenable<boolean>;
	stepInto(): Thenable<boolean>;
	stepOut(): Thenable<boolean>;
	loadBreakPoints(breakpoints: Breakpoint[]): Thenable<[boolean, Breakpoint][]>;
	addBreakPoint(breakpoint: Breakpoint): Thenable<[boolean, Breakpoint]>;
	removeBreakPoint(breakpoint: Breakpoint): Thenable<boolean>;
	clearBreakPoints(): Thenable<any>;
	getThreads(): Thenable<Thread[]>;
	getStack(maxLevels: number, thread: number): Thenable<Stack[]>;
	getStackVariables(thread: number, frame: number): Thenable<DebuggerVariable[]>;
	evalExpression(name: string, thread: number, frame: number): Thenable<any>;
	isReady(): boolean;
	changeVariable(name: string, rawValue: string): Thenable<any>;
	examineMemory(from: number, to: number): Thenable<any>;
}

export class VariableObject {
	name: string;
	exp: string;
	numchild: number;
	type: string;
	value: string;
	threadId: string;
	frozen: boolean;
	dynamic: boolean;
	displayhint: string;
	hasMore: boolean;
	id: number;
	constructor(node: any) {
		this.name = MINode.valueOf(node, "name");
		this.exp = MINode.valueOf(node, "exp");
		this.numchild = parseInt(MINode.valueOf(node, "numchild"));
		this.type = MINode.valueOf(node, "type");
		this.value = MINode.valueOf(node, "value");
		this.threadId = MINode.valueOf(node, "thread-id");
		this.frozen = !!MINode.valueOf(node, "frozen");
		this.dynamic = !!MINode.valueOf(node, "dynamic");
		this.displayhint = MINode.valueOf(node, "displayhint");
		// TODO: use has_more when it's > 0
		this.hasMore = !!MINode.valueOf(node, "has_more");
	}

	public applyChanges(node: MINode) {
		this.value = MINode.valueOf(node, "value");
		if (!!MINode.valueOf(node, "type_changed")) {
			this.type = MINode.valueOf(node, "new_type");
		}
		this.dynamic = !!MINode.valueOf(node, "dynamic");
		this.displayhint = MINode.valueOf(node, "displayhint");
		this.hasMore = !!MINode.valueOf(node, "has_more");
	}

	public isCompound(): boolean {
		return this.numchild > 0 ||
			this.value === "{...}" ||
			(this.dynamic && (this.displayhint === "array" || this.displayhint === "map"));
	}

	public toProtocolVariable(): DebugProtocol.Variable {
		return {
			name: this.exp,
			evaluateName: this.name,
			value: (this.value === void 0) ? "<unknown>" : this.value,
			type: this.type,
			variablesReference: this.id
		};
	}
}

// from https://gist.github.com/justmoon/15511f92e5216fa2624b#gistcomment-1928632
export interface MIError extends Error {
	readonly name: string;
	readonly message: string;
	readonly source: string;
}
export interface MIErrorConstructor {
	new(message: string, source: string): MIError;
	readonly prototype: MIError;
}

export const MIError: MIErrorConstructor = <any>class MIError {
	readonly name: string;
	readonly message: string;
	readonly source: string;
	public constructor(message: string, source: string) {
		Object.defineProperty(this, 'name', {
			get: () => (this.constructor as any).name,
		});
		Object.defineProperty(this, 'message', {
			get: () => message,
		});
		Object.defineProperty(this, 'source', {
			get: () => source,
		});
		Error.captureStackTrace(this, this.constructor);
	}

	public toString() {
		return `${this.message} (from ${this.source})`;
	}
};
Object.setPrototypeOf(MIError as any, Object.create(Error.prototype));
MIError.prototype.constructor = MIError;
