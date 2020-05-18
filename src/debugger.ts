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
	'0x00' = 'unknown',
	'0x01' = 'group',
	'0x02' = 'boolean',
	'0x10' = 'number',
	'0x11' = 'number',
	'0x12' = 'number',
	'0x13' = 'number',
	'0x14' = 'number',
	'0x15' = 'number',
	'0x16' = 'number',
	'0x17' = 'number',
	'0x18' = 'number',
	'0x19' = 'number',
	'0x1A' = 'number',
	'0x1B' = 'number',
	'0x24' = 'string',
	'0x20' = 'string',
	'0x21' = 'string',
	'0x22' = 'string',
	'0x23' = 'string',
	'0x40' = 'string',
	'0x41' = 'string'
}

export class Attribute {
	public constructor(
		public type: string,
		public digits: number,
		public scale: number) { }

	public parse(valueStr: string): string {
		if (!valueStr) {
			return valueStr;
		}
		if (this.type === 'number') {
			valueStr = valueStr.substring(1, valueStr.length - 1);
			const wholeNumber = valueStr.substring(0, valueStr.length - this.scale);
			const decimals = valueStr.substring(valueStr.length - this.scale);
			let numericValue = `${wholeNumber}`;
			if(decimals.length > 0) {
				numericValue = `${wholeNumber}.${decimals}`;
			}
			const sign = numericValue.charCodeAt(numericValue.length - 1);
			if(sign >= 112) {
				numericValue = `-${numericValue.substring(0, numericValue.length - 1)}${sign - 112}`;
			}
			return `${parseFloat(numericValue)}`;
		}
		return valueStr;
	}
}

export class DebuggerVariable {

	public constructor(
		public cobolName: string,
		public cName: string,
		public sourceFile: string,
		public attribute: Attribute = null,
		public size: number = null,
		public value: string = null,
		public parent: DebuggerVariable = null,
		public children: Map<string, DebuggerVariable> = new Map<string, DebuggerVariable>()) { }

	public addChild(child: DebuggerVariable): void {
		child.parent = this;
		this.children.set(child.cobolName, child);
	}

	public getChild(path: string): DebuggerVariable {
		let childName = path;
		let pathHasEnded = true;
		if (path.indexOf(".") !== -1) {
			childName = path.substring(0, path.indexOf("."));
			pathHasEnded = false;
		}
		const child = this.children.get(childName);
		if (pathHasEnded) {
			return child;
		} else if (child !== undefined) {
			return child.getChild(path.substring(path.indexOf(".") + 1));
		}
		return undefined;
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

	public setType(type: string): void {
		if(!this.attribute) {
			this.attribute = new Attribute(type, 0, 0);
		}
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
