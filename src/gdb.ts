import * as DebugAdapter from 'vscode-debugadapter';
import {
	DebugSession,
	Handles,
	InitializedEvent,
	OutputEvent,
	Scope,
	Source,
	StackFrame,
	StoppedEvent,
	TerminatedEvent,
	Thread,
	ThreadEvent
} from 'vscode-debugadapter';
import {DebugProtocol} from 'vscode-debugprotocol';
import * as systemPath from "path";
import * as net from "net";
import * as os from "os";
import * as fs from "fs";
import {MIError, Variable, VariableObject} from './debugger';
import {MINode} from './parser.mi2';
import {MI2} from './mi2';

const resultRegex = /^([a-zA-Z_\-][a-zA-Z0-9_\-]*|\[\d+\])\s*=\s*/;
const variableRegex = /^[a-zA-Z_\-][a-zA-Z0-9_\-]*/;
const errorRegex = /^\<.+?\>/;
const referenceStringRegex = /^(0x[0-9a-fA-F]+\s*)"/;
const referenceRegex = /^0x[0-9a-fA-F]+/;
const cppReferenceRegex = /^@0x[0-9a-fA-F]+/;
const nullpointerRegex = /^0x0+\b/;
const charRegex = /^(\d+) ['"]/;
const numberRegex = /^\d+(\.\d+)?/;
const pointerCombineChar = ".";
const STACK_HANDLES_START = 1000;
const VAR_HANDLES_START = 512 * 256 + 1000;

class ExtendedVariable {
	constructor(public name, public options) {
	}
}

export interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
	cwd: string;
	target: string;
	targetargs: string[];
	gdbpath: string;
	cobcpath: string;
	cobcver: string;
	cobcargs: string[];
	env: any;
	group: string[];
	verbose: boolean;
}

class GDBDebugSession extends DebugSession {
	protected variableHandles = new Handles<string | VariableObject | ExtendedVariable>(VAR_HANDLES_START);
	protected variableHandlesReverse: { [id: string]: number } = {};
	protected useVarObjects: boolean;
	protected quit: boolean;
	protected needContinue: boolean;
	protected started: boolean;
	protected crashed: boolean;
	protected debugReady: boolean;
	protected miDebugger: MI2;
	protected commandServer: net.Server;
	protected serverPath: string;

	public constructor(debuggerLinesStartAt1: boolean, isServer: boolean = false) {
		super(debuggerLinesStartAt1, isServer);
	}

	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
		this.sendResponse(response);
	}

	protected launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments): void {		
		this.miDebugger = new MI2(args.gdbpath, args.cobcpath, args.cobcver, args.cobcargs, args.env, args.verbose, args.noDebug);
		this.miDebugger.on("launcherror", this.launchError.bind(this));
		this.miDebugger.on("quit", this.quitEvent.bind(this));
		this.miDebugger.on("exited-normally", this.quitEvent.bind(this));
		this.miDebugger.on("stopped", this.stopEvent.bind(this));
		this.miDebugger.on("msg", this.handleMsg.bind(this));
		this.miDebugger.on("breakpoint", this.handleBreakpoint.bind(this));
		this.miDebugger.on("step-end", this.handleBreak.bind(this));
		this.miDebugger.on("step-out-end", this.handleBreak.bind(this));
		this.miDebugger.on("step-other", this.handleBreak.bind(this));
		this.miDebugger.on("signal-stop", this.handlePause.bind(this));
		this.miDebugger.on("thread-created", this.threadCreatedEvent.bind(this));
		this.miDebugger.on("thread-exited", this.threadExitedEvent.bind(this));
		this.sendEvent(new InitializedEvent());
		try {
			this.commandServer = net.createServer(c => {
				c.on("data", data => {
					const rawCmd = data.toString();
					const spaceIndex = rawCmd.indexOf(" ");
					let func = rawCmd;
					let args = [];
					if (spaceIndex != -1) {
						func = rawCmd.substr(0, spaceIndex);
						args = JSON.parse(rawCmd.substr(spaceIndex + 1));
					}
					Promise.resolve(this.miDebugger[func].apply(this.miDebugger, args)).then(data => {
						c.write(data.toString());
					});
				});
			});
			this.commandServer.on("error", err => {
				this.handleMsg("stderr", "WARNING: Utility Command Server: Error in command socket " + err.toString() + "\nWARNING: The examine memory location command won't work");
			});
			if (!fs.existsSync(systemPath.join(os.tmpdir(), "gnucobol-debug-sockets")))
				fs.mkdirSync(systemPath.join(os.tmpdir(), "gnucobol-debug-sockets"));
			this.commandServer.listen(this.serverPath = systemPath.join(os.tmpdir(), "gnucobol-debug-sockets", ("Debug-Instance-" + Math.floor(Math.random() * 36 * 36 * 36 * 36).toString(36)).toLowerCase()));
		} catch (e) {
			this.handleMsg("stderr", "WARNING: Utility Command Server: Failed to start " + e.toString() + "\nWARNING: The examine memory location command won't work");
		}

		this.quit = false;
		this.needContinue = false;
		this.started = false;
		this.crashed = false;
		this.debugReady = false;
		this.useVarObjects = false;
		this.miDebugger.load(args.cwd, args.target, args.targetargs, args.group).then(() => {
			setTimeout(() => {
				this.miDebugger.emit("ui-break-done");
			}, 50);
			this.sendResponse(response);
			this.miDebugger.start().then(() => {
				this.started = true;
				if (this.crashed)
					this.handlePause(undefined);
			}, err => {
				this.sendErrorResponse(response, 100, `Failed to start MI Debugger: ${err.toString()}`);
			});
		}, err => {
			this.sendErrorResponse(response, 103, `Failed to load MI Debugger: ${err.toString()}`);
		});
	}

	protected handleMsg(type: string, msg: string) {
		if (type == "target")
			type = "stdout";
		if (type == "log")
			type = "stderr";
		this.sendEvent(new OutputEvent(msg, type));
	}

	protected handleBreakpoint(info: MINode) {
		const event = new StoppedEvent("breakpoint", parseInt(info.record("thread-id")));
		(event as DebugProtocol.StoppedEvent).body.allThreadsStopped = info.record("stopped-threads") == "all";
		this.sendEvent(event);
	}

	protected handleBreak(info?: MINode) {
		const event = new StoppedEvent("step", info ? parseInt(info.record("thread-id")) : 1);
		(event as DebugProtocol.StoppedEvent).body.allThreadsStopped = info ? info.record("stopped-threads") == "all" : true;
		this.sendEvent(event);
	}

	protected handlePause(info: MINode) {
		const event = new StoppedEvent("user request", parseInt(info.record("thread-id")));
		(event as DebugProtocol.StoppedEvent).body.allThreadsStopped = info.record("stopped-threads") == "all";
		this.sendEvent(event);
	}

	protected stopEvent(info: MINode) {
		if (!this.started)
			this.crashed = true;
		if (!this.quit) {
			const event = new StoppedEvent("exception", parseInt(info.record("thread-id")));
			(event as DebugProtocol.StoppedEvent).body.allThreadsStopped = info.record("stopped-threads") == "all";
			this.sendEvent(event);
		}
	}

	protected threadCreatedEvent(info: MINode) {
		this.sendEvent(new ThreadEvent("started", info.record("id")));
	}

	protected threadExitedEvent(info: MINode) {
		this.sendEvent(new ThreadEvent("exited", info.record("id")));
	}

	protected quitEvent() {
		this.quit = true;
		this.sendEvent(new TerminatedEvent());

		if (this.serverPath)
			fs.unlink(this.serverPath, (err) => {
				console.error("Failed to unlink debug server");
			});
	}

	protected launchError(err: any) {
		this.handleMsg("stderr", "Could not start debugger process\n");
		this.handleMsg("stderr", err.toString() + "\n");
		this.quitEvent();
	}

	protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments): void {
		this.miDebugger.stop();
		this.commandServer.close();
		this.commandServer = undefined;
		this.sendResponse(response);
	}

	protected async setVariableRequest(response: DebugProtocol.SetVariableResponse, args: DebugProtocol.SetVariableArguments): Promise<void> {
		try {
			if (this.useVarObjects) {
				let name = args.name;
				if (args.variablesReference >= VAR_HANDLES_START) {
					const parent = this.variableHandles.get(args.variablesReference) as VariableObject;
					name = `${parent.name}.${name}`;
				}

				const res = await this.miDebugger.varAssign(name, args.value);
				response.body = {
					value: res.result("value")
				};
			} else {
				await this.miDebugger.changeVariable(args.name, args.value);
				response.body = {
					value: args.value
				};
			}
			this.sendResponse(response);
		} catch (err) {
			this.sendErrorResponse(response, 11, `Could not continue: ${err}`);
		}
	}

	protected setFunctionBreakPointsRequest(response: DebugProtocol.SetFunctionBreakpointsResponse, args: DebugProtocol.SetFunctionBreakpointsArguments): void {
		const cb = (() => {
			this.debugReady = true;
			const all = [];
			args.breakpoints.forEach(brk => {
				all.push(this.miDebugger.addBreakPoint({ raw: brk.name, condition: brk.condition, countCondition: brk.hitCondition }));
			});
			Promise.all(all).then(brkpoints => {
				const finalBrks = [];
				brkpoints.forEach(brkp => {
					if (brkp[0])
						finalBrks.push({ line: brkp[1].line });
				});
				response.body = {
					breakpoints: finalBrks
				};
				this.sendResponse(response);
			}, msg => {
				this.sendErrorResponse(response, 10, msg.toString());
			});
		}).bind(this);
		if (this.debugReady)
			cb();
		else
			this.miDebugger.once("debug-ready", cb);
	}

	protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {
		const cb = (() => {
			this.debugReady = true;
			this.miDebugger.clearBreakPoints().then(() => {
				let path = args.source.path;
				const all = args.breakpoints.map(brk => {
					return this.miDebugger.addBreakPoint({ file: path, line: brk.line, condition: brk.condition, countCondition: brk.hitCondition });
				});
				Promise.all(all).then(brkpoints => {
					const finalBrks = [];
					brkpoints.forEach(brkp => {
						if (brkp[0])
							finalBrks.push(new DebugAdapter.Breakpoint(true, brkp[1].line));
					});
					response.body = {
						breakpoints: finalBrks
					};
					this.sendResponse(response);
				}, msg => {
					this.sendErrorResponse(response, 9, msg.toString());
				});
			}, msg => {
				this.sendErrorResponse(response, 9, msg.toString());
			});
		}).bind(this);
		if (this.debugReady)
			cb();
		else
			this.miDebugger.once("debug-ready", cb);
	}

	protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
		if (!this.miDebugger) {
			this.sendResponse(response);
			return;
		}
		this.miDebugger.getThreads().then(
			threads => {
				response.body = {
					threads: []
				};
				for (const thread of threads) {
					let threadName = thread.name;
					if (threadName === undefined) {
						threadName = thread.targetId;
					}
					if (threadName === undefined) {
						threadName = "<unnamed>";
					}
					response.body.threads.push(new Thread(thread.id, thread.id + ":" + threadName));
				}
				this.sendResponse(response);
			});
	}

	// Supports 256 threads.
	protected threadAndLevelToFrameId(threadId: number, level: number) {
		return level << 8 | threadId;
	}
	protected frameIdToThreadAndLevel(frameId: number) {
		return [frameId & 0xff, frameId >> 8];
	}

	protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): void {
		this.miDebugger.getStack(args.levels, args.threadId).then(stack => {
			const ret: StackFrame[] = [];
			stack.forEach(element => {
				let source = undefined;
				let file = element.file;
				if (file) {
					source = new Source(element.fileName, file);
				}

				ret.push(new StackFrame(
					this.threadAndLevelToFrameId(args.threadId, element.level),
					element.function + "@" + element.address,
					source,
					element.line,
					0));
			});
			response.body = {
				stackFrames: ret
			};
			this.sendResponse(response);
		}, err => {
			this.sendErrorResponse(response, 12, `Failed to get Stack Trace: ${err.toString()}`);
		});
	}

	protected configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments): void {
		if (this.needContinue) {
			this.miDebugger.continue().then(done => {
				this.sendResponse(response);
			}, msg => {
				this.sendErrorResponse(response, 2, `Could not continue: ${msg}`);
			});
		} else
			this.sendResponse(response);
	}

	protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {
		const scopes = new Array<Scope>();
		scopes.push(new Scope("Local", STACK_HANDLES_START + (parseInt(args.frameId as any) || 0), false));

		response.body = {
			scopes: scopes
		};
		this.sendResponse(response);
	}

	protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments): Promise<void> {
		const variables: DebugProtocol.Variable[] = [];
		let id: number | string | VariableObject | ExtendedVariable;
		if (args.variablesReference < VAR_HANDLES_START) {
			id = args.variablesReference - STACK_HANDLES_START;
		} else {
			id = this.variableHandles.get(args.variablesReference);
		}

		const createVariable = (arg, options?) => {
			if (options)
				return this.variableHandles.create(new ExtendedVariable(arg, options));
			else
				return this.variableHandles.create(arg);
		};

		const findOrCreateVariable = (varObj: VariableObject): number => {
			let id: number;
			if (this.variableHandlesReverse.hasOwnProperty(varObj.name)) {
				id = this.variableHandlesReverse[varObj.name];
			} else {
				id = createVariable(varObj);
				this.variableHandlesReverse[varObj.name] = id;
			}
			return varObj.isCompound() ? id : 0;
		};

		if (typeof id == "number") {
			let stack: Variable[];
			try {
				const [threadId, level] = this.frameIdToThreadAndLevel(id);
				stack = await this.miDebugger.getStackVariables(threadId, level);
				for (const variable of stack) {
					if (this.useVarObjects) {
						try {
							const varObjName = `var_${id}_${variable.name}`;
							let varObj: VariableObject;
							try {
								const changes = await this.miDebugger.varUpdate(varObjName);
								const changelist = changes.result("changelist");
								changelist.forEach((change) => {
									const name = MINode.valueOf(change, "name");
									const vId = this.variableHandlesReverse[name];
									const v = this.variableHandles.get(vId) as any;
									v.applyChanges(change);
								});
								const varId = this.variableHandlesReverse[varObjName];
								varObj = this.variableHandles.get(varId) as any;
							} catch (err) {
								if (err instanceof MIError && err.message == "Variable object not found") {
									varObj = await this.miDebugger.varCreate(variable.name, varObjName);
									const varId = findOrCreateVariable(varObj);
									varObj.exp = variable.name;
									varObj.id = varId;
								} else {
									throw err;
								}
							}
							variables.push(varObj.toProtocolVariable());
						} catch (err) {
							variables.push({
								name: variable.name,
								value: `<${err}>`,
								variablesReference: 0
							});
						}
					} else {
						if (variable.valueStr !== undefined) {
							let expanded = expandValue(createVariable, `{${variable.name}=${variable.valueStr})`, "", variable.raw);
							if (expanded) {
								if (typeof expanded[0] == "string")
									expanded = [
										{
											name: "Value",
											value: prettyStringArray(expanded),
											variablesReference: 0
										}
									];
								variables.push(expanded[0]);
							}
						} else
							variables.push({
								name: variable.name,
								type: variable.type,
								value: variable.type,
								variablesReference: createVariable(variable.name)
							});
					}
				}
				response.body = {
					variables: variables
				};
				this.sendResponse(response);
			} catch (err) {
				this.sendErrorResponse(response, 1, `Could not expand variable: ${err}`);
			}
		} else if (typeof id == "string") {
			// Variable members
			let variable;
			try {
				// TODO: this evals on an (effectively) unknown thread for multithreaded programs.
				variable = await this.miDebugger.evalExpression(JSON.stringify(id), 0, 0);
				try {
					let expanded = expandValue(createVariable, variable.result("value"), id, variable);
					if (!expanded) {
						this.sendErrorResponse(response, 2, `Could not expand variable`);
					} else {
						if (typeof expanded[0] == "string")
							expanded = [
								{
									name: "Value",
									value: prettyStringArray(expanded),
									variablesReference: 0
								}
							];
						response.body = {
							variables: expanded
						};
						this.sendResponse(response);
					}
				} catch (e) {
					this.sendErrorResponse(response, 2, `Could not expand variable: ${e}`);
				}
			} catch (err) {
				this.sendErrorResponse(response, 1, `Could not expand variable: ${err}`);
			}
		} else if (typeof id == "object") {
			if (id instanceof VariableObject) {
				// Variable members
				let children: VariableObject[];
				try {
					children = await this.miDebugger.varListChildren(id.name);
					const vars = children.map(child => {
						child.id = findOrCreateVariable(child);
						return child.toProtocolVariable();
					});

					response.body = {
						variables: vars
					};
					this.sendResponse(response);
				} catch (err) {
					this.sendErrorResponse(response, 1, `Could not expand variable: ${err}`);
				}
			} else if (id instanceof ExtendedVariable) {
				const varReq = id;
				if (varReq.options.arg) {
					const strArr = [];
					let argsPart = true;
					let arrIndex = 0;
					const submit = () => {
						response.body = {
							variables: strArr
						};
						this.sendResponse(response);
					};
					const addOne = async () => {
						// TODO: this evals on an (effectively) unknown thread for multithreaded programs.
						const variable = await this.miDebugger.evalExpression(JSON.stringify(`${varReq.name}+${arrIndex})`), 0, 0);
						try {
							const expanded = expandValue(createVariable, variable.result("value"), varReq.name, variable);
							if (!expanded) {
								this.sendErrorResponse(response, 15, `Could not expand variable`);
							} else {
								if (typeof expanded == "string") {
									if (expanded == "<nullptr>") {
										if (argsPart)
											argsPart = false;
										else
											return submit();
									} else if (expanded[0] != '"') {
										strArr.push({
											name: "[err]",
											value: expanded,
											variablesReference: 0
										});
										return submit();
									}
									strArr.push({
										name: `[${(arrIndex++)}]`,
										value: expanded,
										variablesReference: 0
									});
									await addOne();
								} else {
									strArr.push({
										name: "[err]",
										value: expanded,
										variablesReference: 0
									});
									submit();
								}
							}
						} catch (e) {
							this.sendErrorResponse(response, 14, `Could not expand variable: ${e}`);
						}
					};
					await addOne();
				} else
					this.sendErrorResponse(response, 13, `Unimplemented variable request options: ${JSON.stringify(varReq.options)}`);
			} else {
				response.body = {
					variables: id
				};
				this.sendResponse(response);
			}
		} else {
			response.body = {
				variables: variables
			};
			this.sendResponse(response);
		}
	}

	protected pauseRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {
		this.miDebugger.interrupt().then(done => {
			this.sendResponse(response);
		}, msg => {
			this.sendErrorResponse(response, 3, `Could not pause: ${msg}`);
		});
	}

	protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {
		this.miDebugger.continue().then(done => {
			this.sendResponse(response);
		}, msg => {
			this.sendErrorResponse(response, 2, `Could not continue: ${msg}`);
		});
	}

	protected stepInRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
		this.miDebugger.stepInto().then(done => {
			this.sendResponse(response);
		}, msg => {
			this.sendErrorResponse(response, 4, `Could not step in: ${msg}`);
		});
	}

	protected stepOutRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
		this.miDebugger.stepOut().then(done => {
			this.sendResponse(response);
		}, msg => {
			this.sendErrorResponse(response, 5, `Could not step out: ${msg}`);
		});
	}

	protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
		this.miDebugger.stepOver().then(done => {
			this.sendResponse(response);
		}, msg => {
			this.sendErrorResponse(response, 6, `Could not step over: ${msg}`);
		});
	}

	protected evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): void {
		const [threadId, level] = this.frameIdToThreadAndLevel(args.frameId);
		if (args.context == "watch" || args.context == "hover") {
			this.miDebugger.evalExpression(args.expression, threadId, level).then((res) => {
				response.body = {
					variablesReference: 0,
					result: res.result("value")
				};
				this.sendResponse(response);
			}, msg => {
				this.sendErrorResponse(response, 7, msg.toString());
			});
		} else {
			this.miDebugger.sendUserInput(args.expression, threadId, level).then(output => {
				if (typeof output == "undefined")
					response.body = {
						result: "",
						variablesReference: 0
					};
				else
					response.body = {
						result: JSON.stringify(output),
						variablesReference: 0
					};
				this.sendResponse(response);
			}, msg => {
				this.sendErrorResponse(response, 8, msg.toString());
			});
		}
	}

	protected gotoTargetsRequest(response: DebugProtocol.GotoTargetsResponse, args: DebugProtocol.GotoTargetsArguments): void {
		this.miDebugger.goto(args.source.path, args.line).then(done => {
			response.body = {
				targets: [{
					id: 1,
					label: args.source.name,
					column: args.column,
					line: args.line
				}]
			};
			this.sendResponse(response);
		}, msg => {
			this.sendErrorResponse(response, 16, `Could not jump: ${msg}`);
		});
	}

	protected gotoRequest(response: DebugProtocol.GotoResponse, args: DebugProtocol.GotoArguments): void {
		this.sendResponse(response);
	}
}

function prettyStringArray(strings) {
	if (typeof strings == "object") {
		if (strings.length !== undefined)
			return strings.join(", ");
		else
			return JSON.stringify(strings);
	} else return strings;
}

function expandValue(variableCreate: Function, value: string, root: string = "", extra: any = undefined): any {
	const parseCString = () => {
		value = value.trim();
		if (value[0] != '"' && value[0] != '\'')
			return "";
		let stringEnd = 1;
		let inString = true;
		const charStr = value[0];
		let remaining = value.substr(1);
		let escaped = false;
		while (inString) {
			if (escaped)
				escaped = false;
			else if (remaining[0] == '\\')
				escaped = true;
			else if (remaining[0] == charStr)
				inString = false;

			remaining = remaining.substr(1);
			stringEnd++;
		}
		const str = value.substr(0, stringEnd).trim();
		value = value.substr(stringEnd).trim();
		return str;
	};

	const stack = [root];
	let parseValue, parseCommaResult, parseCommaValue, parseResult, createValue;
	let variable = "";

	const getNamespace = (variable) => {
		let namespace = "";
		let prefix = "";
		stack.push(variable);
		stack.forEach(name => {
			prefix = "";
			if (name != "") {
				if (name.startsWith("["))
					namespace = namespace + name;
				else {
					if (namespace) {
						while (name.startsWith("*")) {
							prefix += "*";
							name = name.substr(1);
						}
						namespace = namespace + pointerCombineChar + name;
					} else
						namespace = name;
				}
			}
		});
		stack.pop();
		return prefix + namespace;
	};

	const parseTupleOrList = () => {
		value = value.trim();
		if (value[0] != '{')
			return undefined;
		const oldContent = value;
		value = value.substr(1).trim();
		if (value[0] == '}') {
			value = value.substr(1).trim();
			return [];
		}
		if (value.startsWith("...")) {
			value = value.substr(3).trim();
			if (value[0] == '}') {
				value = value.substr(1).trim();
				return <any>"<...>";
			}
		}
		const eqPos = value.indexOf("=");
		const newValPos1 = value.indexOf("{");
		const newValPos2 = value.indexOf(",");
		let newValPos = newValPos1;
		if (newValPos2 != -1 && newValPos2 < newValPos1)
			newValPos = newValPos2;
		if (newValPos != -1 && eqPos > newValPos || eqPos == -1) { // is value list
			const values = [];
			stack.push("[0]");
			let val = parseValue();
			stack.pop();
			values.push(createValue("[0]", val));
			const remaining = value;
			let i = 0;
			while (true) {
				stack.push("[" + (++i) + "]");
				if (!(val = parseCommaValue())) {
					stack.pop();
					break;
				}
				stack.pop();
				values.push(createValue("[" + i + "]", val));
			}
			value = value.substr(1).trim(); // }
			return values;
		}

		let result = parseResult(true);
		if (result) {
			const results = [];
			results.push(result);
			while (result = parseCommaResult(true))
				results.push(result);
			value = value.substr(1).trim(); // }
			return results;
		}

		return undefined;
	};

	const parsePrimitive = () => {
		let primitive: any;
		let match;
		value = value.trim();
		if (value.length == 0)
			primitive = undefined;
		else if (value.startsWith("true")) {
			primitive = "true";
			value = value.substr(4).trim();
		} else if (value.startsWith("false")) {
			primitive = "false";
			value = value.substr(5).trim();
		} else if (match = nullpointerRegex.exec(value)) {
			primitive = "<nullptr>";
			value = value.substr(match[0].length).trim();
		} else if (match = referenceStringRegex.exec(value)) {
			value = value.substr(match[1].length).trim();
			primitive = parseCString();
		} else if (match = referenceRegex.exec(value)) {
			primitive = "*" + match[0];
			value = value.substr(match[0].length).trim();
		} else if (match = cppReferenceRegex.exec(value)) {
			primitive = match[0];
			value = value.substr(match[0].length).trim();
		} else if (match = charRegex.exec(value)) {
			primitive = match[1];
			value = value.substr(match[0].length - 1);
			primitive += " " + parseCString();
		} else if (match = numberRegex.exec(value)) {
			primitive = match[0];
			value = value.substr(match[0].length).trim();
		} else if (match = variableRegex.exec(value)) {
			primitive = match[0];
			value = value.substr(match[0].length).trim();
		} else if (match = errorRegex.exec(value)) {
			primitive = match[0];
			value = value.substr(match[0].length).trim();
		} else {
			primitive = value;
		}
		return primitive;
	};

	parseValue = () => {
		value = value.trim();
		if (value[0] == '"')
			return parseCString();
		else if (value[0] == '{')
			return parseTupleOrList();
		else
			return parsePrimitive();
	};

	parseResult = (pushToStack: boolean = false) => {
		value = value.trim();
		const variableMatch = resultRegex.exec(value);
		if (!variableMatch)
			return undefined;
		value = value.substr(variableMatch[0].length).trim();
		const name = variable = variableMatch[1];
		if (pushToStack)
			stack.push(variable);
		const val = parseValue();
		if (pushToStack)
			stack.pop();
		return createValue(name, val);
	};

	createValue = (name, val) => {
		let ref = 0;
		if (typeof val == "object") {
			ref = variableCreate(val);
			val = "Object";
		} else if (typeof val == "string" && val.startsWith("*0x")) {
			if (extra && MINode.valueOf(extra, "arg") == "1") {
				ref = variableCreate(getNamespace("*(" + name), { arg: true });
				val = "<args>";
			} else {
				ref = variableCreate(getNamespace("*" + name));
				val = "Object@" + val;
			}
		} else if (typeof val == "string" && val.startsWith("@0x")) {
			ref = variableCreate(getNamespace("*&" + name.substr));
			val = "Ref" + val;
		} else if (typeof val == "string" && val.startsWith("<...>")) {
			ref = variableCreate(getNamespace(name));
			val = "...";
		}
		return {
			name: name,
			value: val,
			variablesReference: ref
		};
	};

	parseCommaValue = () => {
		value = value.trim();
		if (value[0] != ',')
			return undefined;
		value = value.substr(1).trim();
		return parseValue();
	};

	parseCommaResult = (pushToStack: boolean = false) => {
		value = value.trim();
		if (value[0] != ',')
			return undefined;
		value = value.substr(1).trim();
		return parseResult(pushToStack);
	};


	value = value.trim();
	return parseValue();
}

DebugSession.run(GDBDebugSession);
