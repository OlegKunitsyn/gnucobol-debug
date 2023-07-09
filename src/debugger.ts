import {MINode} from "./parser.mi2";
import {DebugProtocol} from "@vscode/debugprotocol/lib/debugProtocol";
import {removeLeadingZeroes} from "./functions";
import {SourceMap} from "./parser.c";

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

const repeatTimeRegex = /(\"\,\s|^)\'(\s|0)\'\s\<repeats\s(\d+)\stimes\>/i;

export class CobolFieldDataParser {

    public static parse(valueStr: string): string {
        let value = valueStr;
        if (value.indexOf(" ") === -1) {
            return null;
        }

        value = value.substring(value.indexOf(" ") + 1);
        if (value.startsWith("<")) {
            if (value.indexOf(" ") === -1) {
                return null;
            }
            value = value.substring(value.indexOf(" ") + 1);
        }

        const fieldMatch = repeatTimeRegex.exec(value);
        if (fieldMatch) {
            let replacement = "";
            const size = parseInt(fieldMatch[3]);
            for (let i = 0; i < size; i++) {
                replacement += fieldMatch[2];
            }
            replacement += "\"";
            value = value.replace(repeatTimeRegex, replacement);
            if (!value.startsWith("\"")) {
                value = `"${value}`;
            }
        }

        return value;
    }
}

export class NumericValueParser {

    private static ZERO_SIGN_CHAR_CODE = 112;

    public static format(valueStr: string, fieldSize: number, scale: number, signed: boolean): string {
        let value = valueStr;

        let isNegative = false;
        if (/^[-\+].+$/.test(value)) {
            isNegative = value.startsWith("-");
            value = value.substring(1, value.length);
        }

        let [wholeNumber, decimals] = value.split(/\./);
        if (!value.includes(".")) {
            decimals = "";
        }

        if (scale < 0) {
            decimals = "";
            wholeNumber = wholeNumber.substring(0, Math.max(0, wholeNumber.length - Math.abs(scale)));
        } else if (scale > fieldSize) {
            wholeNumber = "";
            decimals = decimals.substring(Math.min(decimals.length, scale - fieldSize), decimals.length);
        }

        value = wholeNumber + decimals;

        const diff = fieldSize - value.length;
        if (diff > 0) {
            let append = "";
            for (let i = 0; i < diff; i++) {
                append += "0";
            }

            if (fieldSize - scale < 0) {
                value += append;
            } else {
                value = append + value;
            }
        } else if (diff < 0) {
            if (fieldSize - scale < 0) {
                value = value.substring(0, value.length - Math.abs(diff));
            } else {
                value = value.substring(Math.abs(diff), value.length);
            }
        }

        if (signed && isNegative) {
            const sign = String.fromCharCode(parseInt(value[value.length - 1]) + this.ZERO_SIGN_CHAR_CODE);
            value = value.substring(0, value.length - 1) + sign;
        }

        return value;
    }

    public static parse(valueStr: string, fieldSize: number, scale: number): string {
        let value = valueStr;
        if (value.startsWith('"')) {
            value = value.substring(1, fieldSize + 1);
            const signCharCode = value.charCodeAt(value.length - 1);
            let sign = "";
            if (signCharCode >= this.ZERO_SIGN_CHAR_CODE) {
                sign = "-";
                value = `${value.substring(0, value.length - 1)}${signCharCode - this.ZERO_SIGN_CHAR_CODE}`;
            }
            if (value.length < scale) {
                const diff = scale - value.length;
                let prefix = "";
                for (let i = 0; i < diff; i++) {
                    prefix += "0";
                }
                value = prefix + value;
            } else if (scale < 0) {
                const diff = scale * -1;
                let suffix = "";
                for (let i = 0; i < diff; i++) {
                    suffix += "0";
                }
                value += suffix;
            }
            const wholeNumber = value.substring(0, value.length - scale);
            const decimals = value.substring(value.length - scale);
            let numericValue = `${sign}${wholeNumber}`;
            if (decimals.length > 0) {
                numericValue = `${numericValue}.${decimals}`;
            }
            return `${parseFloat(numericValue)}`;
        }
        return value;
    }
}

export class AlphanumericValueParser {

    public static format(valueStr: string, fieldSize: number): string {
        let value = valueStr;
        if (value.startsWith('"')) {
            value = value.substring(1);
        }
        if (value.endsWith('"')) {
            value = value.substring(0, value.length - 1);
        }

        const diff = fieldSize - value.length;
        if (diff > 0) {
            let suffix = "";
            for (let i = 0; i < diff; i++) {
                suffix += " ";
            }
            value += suffix;
        } else {
            value = value.substring(0, value.length + diff);
        }
        return value;
    }

    public static parse(valueStr: string, fieldSize: number): string {
        const value = valueStr;
        let shift = 0;
        if (value.startsWith('"')) {
            shift = 1;
        }
        const size = Math.min(fieldSize + shift, valueStr.length - shift);
        return `"${value.substring(shift, size).trim()}"`;
    }
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
    type: string;
    name: string;
    value: string;
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

    public getDetails(size: number): [string, VariableDetail[]] {
        const details: VariableDetail[] = [];
        let type = this.type;

        switch (this.type) {
            case 'boolean':
                type = "bit";
                details.push({type: 'number', name: 'digits', value: `${this.digits}`});
                break;
            case 'numeric binary':
                if (this.has(CobFlag.IS_POINTER)) {
                    type = "pointer";
                    details.push({type: 'number', name: 'digits', value: `${this.digits}`});
                    break;
                }
            case 'numeric':
            case 'numeric packed':
            case 'numeric float':
            case 'numeric double':
            case 'numeric edited':
                details.push({type: 'boolean', name: 'signed', value: `${this.has(CobFlag.HAVE_SIGN)}`});
                details.push({type: 'number', name: 'digits', value: `${this.digits}`});
                details.push({type: 'number', name: 'scale', value: `${this.scale}`});
                break;
            case 'group':
            case 'alphanumeric':
            case 'national':
                details.push({type: 'number', name: 'size', value: `${size}`});
                break;
            default:
                break;
        }

        return [type, details];
    }

    public format(valueStr: string, fieldSize: number): string {
        if (!valueStr) {
            return null;
        }
        switch (this.type) {
            case 'numeric':
                return NumericValueParser.format(valueStr, fieldSize, this.scale, this.has(CobFlag.HAVE_SIGN));
            case 'group':
            case 'numeric edited':
            case 'alphanumeric':
            case 'alphanumeric edited':
            case 'national':
            case 'national edited':
                return AlphanumericValueParser.format(valueStr, fieldSize);
            default:
                throw new Error(`Not supported type: ${this.type}`);
        }
    }

    public parse(valueStr: string, fieldSize: number): string {
        if (!valueStr) {
            return null;
        }
        if (valueStr.startsWith("0x")) {
            valueStr = CobolFieldDataParser.parse(valueStr);
        }
        if (!valueStr) {
            return null;
        }
        switch (this.type) {
            case 'numeric':
                return NumericValueParser.parse(valueStr, fieldSize, this.scale);
            case 'numeric edited':
            case 'alphanumeric':
            case 'alphanumeric edited':
            case 'national':
            case 'national edited':
                return AlphanumericValueParser.parse(valueStr, fieldSize);
            case 'integer':
            case 'group':
                return valueStr;
            default:
                throw new Error(`Not supported type: ${this.type}`);
        }
    }

    public parseUsage(valueStr: string): string {
        if (!valueStr) {
            return null;
        }
        if (valueStr.startsWith("0x")) {
            valueStr = CobolFieldDataParser.parse(valueStr);
        }
        if (!valueStr) {
            return null;
        }
        switch (this.type) {
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
                return removeLeadingZeroes(valueStr.substring(1, valueStr.length - 1));
            default:
                return valueStr;
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
        public size: number = null,
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
        this.value = this.attribute.parse(value, this.size);
    }

    public formatValue(value: string): string {
        return this.attribute.format(value, this.size);
    }

    public setValueUsage(value: string): void {
        this.value = this.attribute.parseUsage(value);
    }

    public toDebugProtocolVariable(showDetails: boolean): DebugProtocol.Variable[] {
        const result: DebugProtocol.Variable[] = [];

        if (showDetails) {
            for (const detail of this.details) {
                result.push({
                    name: detail.name,
                    evaluateName: this.cobolName,
                    type: detail.type,
                    value: detail.value,
                    variablesReference: 0
                });
            }
        }

        result.push({
            name: 'value',
            evaluateName: this.cobolName,
            value: this.value || "null",
            variablesReference: 0
        });
        return result;
    }
}

export interface IDebugger {
    load(cwd: string, target: string, targetargs: string, group: string[], gdbtty: boolean): Thenable<any>;

    attach(cwd: string, target: string, targetargs: string, group: string[]): Thenable<any>;

    start(pid?: string): Thenable<boolean>;

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

    evalCobField(name: string, thread: number, frame: number): Promise<DebuggerVariable>;

    isReady(): boolean;

    changeVariable(name: string, rawValue: string): Promise<any>;

    examineMemory(from: number, to: number): Thenable<any>;

    getGcovFiles(): string[];

    sendUserInput(command: string, threadId: number, frameLevel: number): Thenable<any>;

    getSourceMap(): SourceMap;
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

export const MIError: MIErrorConstructor = <any> class MIError {
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
