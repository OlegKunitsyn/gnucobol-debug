import { Breakpoint, IDebugger, MIError, Stack, Thread, Variable, VariableObject } from "./debugger";
import * as ChildProcess from "child_process";
import { EventEmitter } from "events";
import { MINode, parseMI } from './parser.mi2';
import * as nativePath from "path";
import { SourceMap } from "./parser.c";

const nonOutput = /(^(?:\d*|undefined)[\*\+\-\=\~\@\&\^])([^\*\+\-\=\~\@\&\^]{1,})/;
const gdbRegex = /(?:\d*|undefined)\(gdb\)/;
const numRegex = /\d+/;
const dataValueRegex = /.*size\s\=\s(\d+).*?\>\s(.*),\sattr.*/i;

export function escape(str: string) {
	return str.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
}

export function couldBeOutput(line: string) {
	return !nonOutput.exec(line);
}

export class MI2 extends EventEmitter implements IDebugger {
	private map: SourceMap;
	public procEnv: any;
	private currentToken: number = 1;
	private handlers: { [index: number]: (info: MINode) => any } = {};
	private breakpoints: Map<Breakpoint, Number> = new Map();
	private buffer: string;
	private errbuf: string;
	private process: ChildProcess.ChildProcess;
	private gdbArgs: string[] = ["-q", "--interpreter=mi2"];
	private lastStepCommand: Function;

	constructor(public gdbpath: string, public cobcpath: string, public cobcver: number, public cobcArgs: string[], procEnv: any, public verbose: boolean, public noDebug: boolean) {
		super();
		if (procEnv) {
			const env = {};
			// Duplicate process.env so we don't override it
			for (const key in process.env)
				if (process.env.hasOwnProperty(key))
					env[key] = process.env[key];

			// Overwrite with user specified variables
			for (const key in procEnv) {
				if (procEnv.hasOwnProperty(key)) {
					if (procEnv === null)
						delete env[key];
					else
						env[key] = procEnv[key];
				}
			}
			this.procEnv = env;
		}
	}

	load(cwd: string, target: string, targetargs: string[], group: string[]): Thenable<any> {
		if (!nativePath.isAbsolute(target))
			target = nativePath.join(cwd, target);
		group.forEach(e => { e = nativePath.join(cwd, e); });

		if (this.verbose)
			this.log("stderr", `GnuCOBOL version: ${this.cobcver}`);

		return new Promise((resolve, reject) => {
			if (!!this.noDebug) {
				const args = this.cobcArgs
					.concat([target])
					.concat(group)
					.concat(['-job=' + targetargs.join(' ')]);
				this.process = ChildProcess.spawn(this.cobcpath, args, { cwd: cwd, env: this.procEnv });
				this.process.stderr.on("data", ((data) => { this.log("stderr", data); }).bind(this));
				this.process.stdout.on("data", ((data) => { this.log("stdout", data); }).bind(this));
				this.process.on("exit", (() => { this.emit("quit"); }).bind(this));
				return;
			}

			const args = this.cobcArgs.concat(['-g', '-fsource-location', '-ftraceall', target]).concat(group);
			const buildProcess = ChildProcess.spawn(this.cobcpath, args, { cwd: cwd, env: this.procEnv });
			buildProcess.stderr.on("data", ((err) => { this.emit("launcherror", err); }).bind(this));
			buildProcess.on('exit', (code) => {
				if (code !== 0) {
					this.emit("quit");
					return;
				}

				if (this.verbose)
					this.log("stderr", `COBOL file ${target} compiled with exit code: ${code}`);

					try {
						this.map = new SourceMap(cwd, [target].concat(group));
					} catch(e) {
						this.log('stderr', e);
					}

				if (this.verbose) {
					this.log("stderr", `SourceMap created: lines ${this.map.getLinesCount()}, vars ${this.map.getDataStoragesCount()}`);
					this.log("stderr", this.map.toString());
				}

				target = nativePath.resolve(cwd, nativePath.basename(target));
				if (process.platform === "win32") {
					target = target.split('.').slice(0, -1).join('.') + '.exe';
				} else {
					target = target.split('.').slice(0, -1).join('.');
				}

				this.process = ChildProcess.spawn(this.gdbpath, this.gdbArgs, { cwd: cwd, env: this.procEnv });
				this.process.stdout.on("data", this.stdout.bind(this));
				this.process.stderr.on("data", ((data) => { this.log("stderr", data); }).bind(this));
				this.process.on("exit", (() => { this.emit("quit"); }).bind(this));
				this.process.on("error", ((err) => { this.emit("launcherror", err); }).bind(this));
				const promises = this.initCommands(target, targetargs, cwd);
				Promise.all(promises).then(() => {
					this.emit("debug-ready");
					resolve();
				}, reject);
			});
		});
	}

	protected initCommands(target: string, targetargs: string[], cwd: string) {
		if (!nativePath.isAbsolute(target))
			target = nativePath.join(cwd, target);
		const cmds = [
			this.sendCommand("gdb-set target-async on", false),
			this.sendCommand("gdb-set args " + targetargs.join(' '), false),
			this.sendCommand("environment-directory \"" + escape(cwd) + "\"", false),
			this.sendCommand("file-exec-and-symbols \"" + escape(target) + "\"", false),
		];
		return cmds;
	}

	connect(cwd: string, executable: string, target: string): Thenable<any> {
		return new Promise((resolve, reject) => {
			let args = [];
			if (executable && !nativePath.isAbsolute(executable))
				executable = nativePath.join(cwd, executable);
			if (executable)
				args = args.concat([executable], this.gdbArgs);
			else
				args = this.gdbArgs;
			this.process = ChildProcess.spawn(this.gdbpath, args, { cwd: cwd, env: this.procEnv });
			this.process.stdout.on("data", this.stdout.bind(this));
			this.process.stderr.on("data", this.stderr.bind(this));
			this.process.on("exit", (() => { this.emit("quit"); }).bind(this));
			this.process.on("error", ((err) => { this.emit("launcherror", err); }).bind(this));
			Promise.all([
				this.sendCommand("gdb-set target-async on"),
				this.sendCommand("environment-directory \"" + escape(cwd) + "\""),
				this.sendCommand("target-select remote " + target)
			]).then(() => {
				this.emit("debug-ready");
				resolve();
			}, reject);
		});
	}

	stdout(data) {
		if (this.verbose)
			this.log("stderr", "stdout: " + data);
		if (typeof data == "string")
			this.buffer += data;
		else
			this.buffer += data.toString("utf8");
		const end = this.buffer.lastIndexOf('\n');
		if (end != -1) {
			this.onOutput(this.buffer.substr(0, end));
			this.buffer = this.buffer.substr(end + 1);
		}
		if (this.buffer.length) {
			if (this.onOutputPartial(this.buffer)) {
				this.buffer = "";
			}
		}
	}

	stderr(data) {
		if (this.verbose)
			this.log("stderr", "stderr: " + data);
		if (typeof data == "string")
			this.errbuf += data;
		else
			this.errbuf += data.toString("utf8");
		const end = this.errbuf.lastIndexOf('\n');
		if (end != -1) {
			this.onOutputStderr(this.errbuf.substr(0, end));
			this.errbuf = this.errbuf.substr(end + 1);
		}
		if (this.errbuf.length) {
			this.logNoNewLine("stderr", this.errbuf);
			this.errbuf = "";
		}
	}

	stdin(data: string) {
		if (this.isReady()) {
			if (this.verbose)
				this.log("stderr", "stdin: " + data);
			this.process.stdin.write(data + "\n");
		}
	}

	onOutputStderr(lines) {
		lines = <string[]>lines.split('\n');
		lines.forEach(line => {
			this.log("stderr", line);
		});
	}

	onOutputPartial(line) {
		if (couldBeOutput(line)) {
			this.logNoNewLine("stdout", line);
			return true;
		}
		return false;
	}

	onOutput(lines) {
		lines = <string[]>lines.split('\n');
		lines.forEach(line => {
			if (couldBeOutput(line)) {
				if (!gdbRegex.exec(line))
					this.log("stdout", line);
			} else {
				const parsed = parseMI(line);
				if (this.verbose)
					this.log("stderr", "GDB -> App: " + JSON.stringify(parsed));
				let handled = false;
				if (parsed.token !== undefined) {
					if (this.handlers[parsed.token]) {
						this.handlers[parsed.token](parsed);
						delete this.handlers[parsed.token];
						handled = true;
					}
				}
				if (!handled && parsed.resultRecords && parsed.resultRecords.resultClass == "error") {
					this.log("stderr", parsed.result("msg") || line);
				}
				if (parsed.outOfBandRecord) {
					parsed.outOfBandRecord.forEach(record => {
						if (record.isStream) {
							this.log(record.type, record.content);
						} else {
							if (record.type == "exec") {
								this.emit("exec-async-output", parsed);
								if (record.asyncClass == "running")
									this.emit("running", parsed);
								else if (record.asyncClass == "stopped") {
									const reason = parsed.record("reason");
									if (this.verbose)
										this.log("stderr", "stop: " + reason);
									if (reason == "breakpoint-hit") {
										this.emit("breakpoint", parsed);
									}
									else if (reason == "end-stepping-range") {
										if (!this.map.hasLineCobol(parsed.record('frame.fullname'), parseInt(parsed.record('frame.line')))) {
											this.lastStepCommand();
										} else {
											this.emit("step-end", parsed);
										}
									}
									else if (reason == "function-finished") {
										if (!this.map.hasLineCobol(parsed.record('frame.fullname'), parseInt(parsed.record('frame.line')))) {
											this.lastStepCommand();
										} else {
											this.emit("step-out-end", parsed);
										}
									}
									else if (reason == "signal-received")
										this.emit("signal-stop", parsed);
									else if (reason == "exited-normally")
										this.emit("exited-normally", parsed);
									else if (reason == "exited") { // exit with error code != 0
										if (this.verbose)
											this.log("stderr", "Program exited with code " + parsed.record("exit-code"));
										this.emit("exited-normally", parsed);
									} else {
										if (this.verbose)
											this.log("stderr", "Not implemented stop reason (assuming exception): " + reason);
										this.emit("stopped", parsed);
									}
								} else {
									if (this.verbose)
										this.log("stderr", JSON.stringify(parsed));
								}
							} else if (record.type == "notify") {
								if (record.asyncClass == "thread-created") {
									this.emit("thread-created", parsed);
								} else if (record.asyncClass == "thread-exited") {
									this.emit("thread-exited", parsed);
								}
							}
						}
					});
					handled = true;
				}
				if (parsed.token == undefined && parsed.resultRecords == undefined && parsed.outOfBandRecord.length == 0)
					handled = true;
				if (!handled) {
					if (this.verbose)
						this.log("stderr", "Unhandled: " + JSON.stringify(parsed));
				}
			}
		});
	}

	start(): Thenable<boolean> {
		return new Promise((resolve, reject) => {
			if (!!this.noDebug) {
				return;
			}
			this.once("ui-break-done", () => {
				this.sendCommand("exec-run").then((info) => {
					if (info.resultRecords.resultClass == "running")
						resolve();
					else
						reject();
				}, reject);
			});
		});
	}

	stop() {
		const proc = this.process;
		const to = setTimeout(() => {
			process.kill(-proc.pid);
		}, 1000);
		this.process.on("exit", function (code) {
			clearTimeout(to);
		});
		this.sendCommand("gdb-exit");
	}

	detach() {
		const proc = this.process;
		const to = setTimeout(() => {
			process.kill(-proc.pid);
		}, 1000);
		this.process.on("exit", function (code) {
			clearTimeout(to);
		});
		this.sendCommand("target-detach");
	}

	interrupt(): Thenable<boolean> {
		if (this.verbose)
			this.log("stderr", "interrupt");
		return new Promise((resolve, reject) => {
			this.sendCommand("exec-interrupt").then((info) => {
				resolve(info.resultRecords.resultClass == "done");
			}, reject);
		});
	}

	continue(): Thenable<boolean> {
		if (this.verbose)
			this.log("stderr", "continue");
		return new Promise((resolve, reject) => {
			this.sendCommand("exec-continue").then((info) => {
				resolve(info.resultRecords.resultClass == "running");
			}, reject);
		});
	}

	/**
	 * The command executes the line, then pauses at the next line.
	 * The underlying function executes entirely.
	 * FIXME: Implement execution graph instead of exec-next fallback
	 */
	stepOver(): Thenable<boolean> {
		this.lastStepCommand = this.stepOver;
		if (this.verbose)
			this.log("stderr", "stepOver");
		return new Promise((resolve, reject) => {
			this.sendCommand("exec-next").then((info) => {
				resolve(info.resultRecords.resultClass == "running");
			}, reject);
		});
	}

	/**
	 * The command executes the line, then pauses at the next line.
	 * The command goes into the underlying function, then pauses at the first line.
	 */
	stepInto(): Thenable<boolean> {
		this.lastStepCommand = this.stepInto;
		if (this.verbose)
			this.log("stderr", "stepInto");
		return new Promise((resolve, reject) => {
			this.sendCommand("exec-step").then((info) => {
				resolve(info.resultRecords.resultClass == "running");
			}, reject);
		});
	}

	/**
	 * The comand executes the function, then pauses at the next line outside.
	 */
	stepOut(): Thenable<boolean> {
		this.lastStepCommand = this.stepOut;
		if (this.verbose)
			this.log("stderr", "stepOut");
		return new Promise((resolve, reject) => {
			this.sendCommand("exec-finish").then((info) => {
				resolve(info.resultRecords.resultClass == "running");
			}, reject);
		});
	}

	goto(filename: string, line: number): Thenable<Boolean> {
		if (this.verbose)
			this.log("stderr", "goto");
		return new Promise((resolve, reject) => {
			const target: string = '"' + (filename ? escape(filename) + ":" : "") + line + '"';
			this.sendCommand("break-insert -t " + target).then(() => {
				this.sendCommand("exec-jump " + target).then((info) => {
					resolve(info.resultRecords.resultClass == "running");
				}, reject);
			}, reject);
		});
	}

	changeVariable(name: string, rawValue: string): Thenable<any> {
		if (this.verbose)
			this.log("stderr", "changeVariable");
		return this.sendCommand("gdb-set var " + name + "=" + rawValue);
	}

	loadBreakPoints(breakpoints: Breakpoint[]): Thenable<[boolean, Breakpoint][]> {
		if (this.verbose)
			this.log("stderr", "loadBreakPoints");
		const promisses = [];
		breakpoints.forEach(breakpoint => {
			promisses.push(this.addBreakPoint(breakpoint));
		});
		return Promise.all(promisses);
	}

	setBreakPointCondition(bkptNum, condition): Thenable<any> {
		if (this.verbose)
			this.log("stderr", "setBreakPointCondition");
		return this.sendCommand("break-condition " + bkptNum + " " + condition);
	}

	addBreakPoint(breakpoint: Breakpoint): Thenable<[boolean, Breakpoint]> {
		if (this.verbose)
			this.log("stderr", "addBreakPoint ");

		return new Promise((resolve, reject) => {
			if (this.breakpoints.has(breakpoint))
				return resolve([false, undefined]);
			let location = "";
			if (breakpoint.countCondition) {
				if (breakpoint.countCondition[0] == ">")
					location += "-i " + numRegex.exec(breakpoint.countCondition.substr(1))[0] + " ";
				else {
					const match = numRegex.exec(breakpoint.countCondition)[0];
					if (match.length != breakpoint.countCondition.length) {
						this.log("stderr", "Unsupported break count expression: '" + breakpoint.countCondition + "'. Only supports 'X' for breaking once after X times or '>X' for ignoring the first X breaks");
						location += "-t ";
					} else if (parseInt(match) != 0)
						location += "-t -i " + parseInt(match) + " ";
				}
			}

			let map = this.map.getLineC(breakpoint.file, breakpoint.line);
			if (breakpoint.raw)
				location += '"' + escape(breakpoint.raw) + '"';
			else
				location += '"' + escape(map.fileC) + ":" + map.lineC + '"';

			this.sendCommand("break-insert -f " + location).then((result) => {
				if (result.resultRecords.resultClass == "done") {
					const bkptNum = parseInt(result.result("bkpt.number"));
					let map = this.map.getLineCobol(result.result("bkpt.file"), parseInt(result.result("bkpt.line")));
					const newBrk = {
						file: map.fileCobol,
						line: map.lineCobol,
						condition: breakpoint.condition
					};
					if (breakpoint.condition) {
						this.setBreakPointCondition(bkptNum, breakpoint.condition).then((result) => {
							if (result.resultRecords.resultClass == "done") {
								this.breakpoints.set(newBrk, bkptNum);
								resolve([true, newBrk]);
							} else {
								resolve([false, undefined]);
							}
						}, reject);
					} else {
						this.breakpoints.set(newBrk, bkptNum);
						resolve([true, newBrk]);
					}
				} else {
					reject(result);
				}
			}, reject);
		});
	}

	removeBreakPoint(breakpoint: Breakpoint): Thenable<boolean> {
		if (this.verbose)
			this.log("stderr", "removeBreakPoint");
		return new Promise((resolve, reject) => {
			if (!this.breakpoints.has(breakpoint))
				return resolve(false);
			this.sendCommand("break-delete " + this.breakpoints.get(breakpoint)).then((result) => {
				if (result.resultRecords.resultClass == "done") {
					this.breakpoints.delete(breakpoint);
					resolve(true);
				} else resolve(false);
			});
		});
	}

	clearBreakPoints(): Thenable<any> {
		if (this.verbose)
			this.log("stderr", "clearBreakPoints");
		return new Promise((resolve, reject) => {
			this.sendCommand("break-delete").then((result) => {
				if (result.resultRecords.resultClass == "done") {
					this.breakpoints.clear();
					resolve(true);
				} else resolve(false);
			}, () => {
				resolve(false);
			});
		});
	}

	async getThreads(): Promise<Thread[]> {
		if (this.verbose)
			this.log("stderr", "getThreads");
		return new Promise((resolve, reject) => {
			if (!!this.noDebug)
				return;
			this.sendCommand("thread-info").then((result) => {
				resolve(result.result("threads").map(element => {
					const ret: Thread = {
						id: parseInt(MINode.valueOf(element, "id")),
						targetId: MINode.valueOf(element, "target-id")
					};
					const name = MINode.valueOf(element, "name");
					if (name) {
						ret.name = name;
					}
					return ret;
				}));
			}, reject);
		});
	}

	async getStack(maxLevels: number, thread: number): Promise<Stack[]> {
		if (this.verbose)
			this.log("stderr", "getStack");
		let command = "stack-list-frames";
		if (thread != 0) {
			command += ` --thread ${thread}`;
		}
		if (maxLevels) {
			command += " 0 " + maxLevels;
		}
		const result = await this.sendCommand(command);
		const stack = result.result("stack");
		const ret: Stack[] = [];
		return stack.map(element => {
			const level = MINode.valueOf(element, "@frame.level");
			const addr = MINode.valueOf(element, "@frame.addr");
			const func = MINode.valueOf(element, "@frame.func");
			const filename = MINode.valueOf(element, "@frame.file");
			let file: string = MINode.valueOf(element, "@frame.fullname");
			if (file) {
				file = nativePath.normalize(file);
			}
			const from = parseInt(MINode.valueOf(element, "@frame.from"));

			let line = 0;
			const lnstr = MINode.valueOf(element, "@frame.line");
			if (lnstr)
				line = parseInt(lnstr);

			let map = this.map.getLineCobol(file, line);
			return {
				address: addr,
				fileName: nativePath.basename(map.fileCobol),
				file: map.fileCobol,
				function: func || from,
				level: level,
				line: map.lineCobol
			};
		});
	}

	async getStackVariables(thread: number, frame: number): Promise<Variable[]> {
		if (this.verbose)
			this.log("stderr", "getStackVariables");
		const result = await this.sendCommand(`stack-list-variables --thread ${thread} --frame ${frame} --all-values`);
		const variables = result.result("variables");

		for (let element of variables) {
			const key = MINode.valueOf(element, "name");
			const value = MINode.valueOf(element, "value");
			const type = MINode.valueOf(element, "type");

			const cobolVariable = this.map.getCobolVariableByC(key);

			if (cobolVariable !== null) {
				cobolVariable.setType(type);
				cobolVariable.setValue(value);
				cobolVariable.setRaw(element);
			}
		}

		return this.map.getFields();
	}

	examineMemory(from: number, length: number): Thenable<any> {
		if (this.verbose)
			this.log("stderr", "examineMemory");
		return new Promise((resolve, reject) => {
			this.sendCommand("data-read-memory-bytes 0x" + from.toString(16) + " " + length).then((result) => {
				resolve(result.result("memory[0].contents"));
			}, reject);
		});
	}

	async evalExpression(name: string, thread: number, frame: number): Promise<Variable> {
		if (this.verbose)
			this.log("stderr", "evalExpression");
		let command = "data-evaluate-expression ";
		if (thread != 0) {
			command += `--thread ${thread} --frame ${frame} `;
		}

		let cleanedName = name;
		if(name.startsWith("*")) {
			cleanedName = name.substring(1, name.indexOf("."));
		}

		const variable = this.map.getCobolVariableByCobol(cleanedName);

		command += variable.getCName();

		const response = await this.sendCommand(command);
		const element = response.resultRecords.results;

		let value = MINode.valueOf(element, "value");

		if(value.startsWith("{")) {
			const match = dataValueRegex.exec(value);
			const size = parseInt(match[1]);
			value = match[2];
			if(value.startsWith("\"")) {
				value = `"${value.substring(1, size + 1)}"`;
			} else if(value.startsWith("'")) {
				value = `"${value.substring(0,3)} repeats ${size} times"`;
			}
		}

		variable.setValue(value);
		variable.setRaw(element);
		

		return variable;
	}

	async varCreate(expression: string, name: string = "-"): Promise<VariableObject> {
		if (this.verbose)
			this.log("stderr", "varCreate");
		const res = await this.sendCommand(`var-create ${name} @ "${expression}"`);
		return new VariableObject(res.result(""));
	}

	async varEvalExpression(name: string): Promise<MINode> {
		if (this.verbose)
			this.log("stderr", "varEvalExpression");
		return this.sendCommand(`var-evaluate-expression ${name}`);
	}

	async varListChildren(name: string): Promise<VariableObject[]> {
		if (this.verbose)
			this.log("stderr", "varListChildren");
		//TODO: add `from` and `to` arguments
		const res = await this.sendCommand(`var-list-children --all-values ${name}`);
		const children = res.result("children") || [];
		return children.map(child => new VariableObject(child[1]));
	}

	async varUpdate(name: string = "*"): Promise<MINode> {
		if (this.verbose)
			this.log("stderr", "varUpdate");
		return this.sendCommand(`var-update --all-values ${name}`);
	}

	async varAssign(name: string, rawValue: string): Promise<MINode> {
		if (this.verbose)
			this.log("stderr", "varAssign");
		return this.sendCommand(`var-assign ${name} ${rawValue}`);
	}

	logNoNewLine(type: string, msg: string) {
		this.emit("msg", type, msg);
	}

	log(type: string, msg: string) {
		this.emit("msg", type, msg[msg.length - 1] == '\n' ? msg : (msg + "\n"));
	}

	sendUserInput(command: string, threadId: number = 0, frameLevel: number = 0): Thenable<any> {
		return this.sendCliCommand(command, threadId, frameLevel);
	}

	sendCliCommand(command: string, threadId: number = 0, frameLevel: number = 0): Thenable<void> {
		return new Promise((resolve, reject) => {
			this.stdin(command);
		});
	}

	sendCommand(command: string, suppressFailure: boolean = false): Thenable<MINode> {
		return new Promise((resolve, reject) => {
			const sel = this.currentToken++;
			this.handlers[sel] = (node: MINode) => {
				if (node && node.resultRecords && node.resultRecords.resultClass === "error") {
					if (suppressFailure) {
						this.log("stderr", `WARNING: Error executing command '${command}'`);
						resolve(node);
					} else
						reject(new MIError(node.result("msg") || "Internal error", command));
				} else
					resolve(node);
			};
			this.stdin(sel + "-" + command);
		});
	}

	isReady(): boolean {
		return !!this.process;
	}
}
