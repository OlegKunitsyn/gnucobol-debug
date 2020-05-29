import { MINode } from "./parser.mi2";
import { DebugProtocol } from "vscode-debugprotocol/lib/debugProtocol";

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

export enum VariableType {
	'0x00' = 'Unknown',
	'0x01' = 'Group',
	'0x02' = 'Boolean',
	'0x10' = 'Numeric',
	'0x11' = 'Numeric binary',
	'0x12' = 'Numeric packed',
	'0x13' = 'Numeric float',
	'0x14' = 'Numeric double',
	'0x15' = 'Numeric l double',
	'0x16' = 'Numeric FP DEC64',
	'0x17' = 'Numeric FP DEC128',
	'0x18' = 'Numeric FP BIN32',
	'0x19' = 'Numeric FP BIN64',
	'0x1A' = 'Numeric FP BIN128',
	'0x1B' = 'Numeric COMP5',
	'0x24' = 'Numeric edited',
	'0x20' = 'Alphanumeric',
	'0x21' = 'Alphanumeric',
	'0x22' = 'Alphanumeric',
	'0x23' = 'Alphanumeric edited',
	'0x40' = 'National',
	'0x41' = 'National edited',
	'int' = 'Numeric',
	'cob_u8_t' = 'Group'
}

export class Attribute {
	public constructor(
		public type: string,
		public digits: number,
		public scale: number) { }

	public parse(valueStr: string): string {
		if (!valueStr) {
			return null;
		}
		switch (this.type) {
			case 'Group':
			case 'Boolean':
			case 'Numeric':
			case 'Numeric binary':
			case 'Numeric packed':
			case 'Numeric float':
			case 'Numeric double':
			case 'Numeric long double':
			case 'Numeric FP DEC64':
			case 'Numeric FP DEC128':
			case 'Numeric FP BIN32':
			case 'Numeric FP BIN64':
			case 'Numeric FP BIN128':
			case 'Numeric COMP5':
				return valueStr;
			default:
				return `"${valueStr.trim()}"`;
		}
	}
}

export class DebuggerVariable {

	public constructor(
		public cobolName: string,
		public cName: string,
		public functionName: string,
		public attribute: Attribute = null,
		public size: number = null,
		public value: string = null,
		public parent: DebuggerVariable = null,
		public children: Map<string, DebuggerVariable> = new Map<string, DebuggerVariable>()) { }

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
