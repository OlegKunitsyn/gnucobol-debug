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
import { DebugProtocol } from 'vscode-debugprotocol';
import { VariableObject } from './debugger';
import { MINode } from './parser.mi2';
import { MI2 } from './mi2';
import { CoverageStatus } from './coverage';

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
	gdbargs: string[];
	cobcpath: string;
	cobcargs: string[];
	env: any;
	group: string[];
	verbose: boolean;
	coverage: boolean;
	container: string;
}

export interface AttachRequestArguments extends DebugProtocol.LaunchRequestArguments {
	cwd: string;
	target: string;
	targetargs: string[];
	gdbpath: string;
	gdbargs: string[];
	cobcpath: string;
	cobcargs: string[];
	env: any;
	group: string[];
	verbose: boolean;
	pid: string;
}

export class GDBDebugSession extends DebugSession {
	protected variableHandles = new Handles<string | VariableObject | ExtendedVariable>(VAR_HANDLES_START);
	protected variableHandlesReverse: { [id: string]: number } = {};
	protected useVarObjects: boolean;
	protected quit: boolean;
	protected needContinue: boolean;
	protected started: boolean;
	protected attached: boolean;
	protected crashed: boolean;
	protected debugReady: boolean;
	protected miDebugger: MI2;
	coverageStatus: CoverageStatus;
	private container: string;

	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
		this.sendResponse(response);
	}

	protected launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments): void {
		if (!args.coverage) {
			this.coverageStatus = undefined;
		}
		this.container = args.container;
		this.started = false;
		this.attached = false;

		this.miDebugger = new MI2(args.gdbpath, args.gdbargs, args.cobcpath, args.cobcargs, args.env, args.verbose, args.noDebug);
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
		this.quit = false;
		this.needContinue = false;
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

	protected attachRequest(response: DebugProtocol.AttachResponse, args: AttachRequestArguments): void {
		this.coverageStatus = undefined;
		this.attached = true;
		this.started = false;

		this.miDebugger = new MI2(args.gdbpath, args.gdbargs, args.cobcpath, args.cobcargs, args.env, args.verbose, false);
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
		this.quit = false;
		this.needContinue = true;
		this.crashed = false;
		this.debugReady = false;
		this.useVarObjects = false;
		this.miDebugger.attach(args.cwd, args.target, args.targetargs, args.group).then(() => {
			setTimeout(() => {
				this.miDebugger.emit("ui-break-done");
			}, 50);
			this.sendResponse(response);
			this.miDebugger.start(args.pid).then(() => {
				this.attached = true;
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
		if (this.quit)
			return;

		if (this.coverageStatus !== undefined) {
			this.coverageStatus.show(this.miDebugger.getGcovFiles(), this.miDebugger.getSourceMap(), this.container);
		}

		this.quit = true;
		this.sendEvent(new TerminatedEvent());
	}

	protected launchError(err: any) {
		this.handleMsg("stderr", "Could not start debugger process\n");
		this.handleMsg("stderr", err.toString() + "\n");
		this.quitEvent();
	}

	protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments): void {
		if (this.attached)
			this.miDebugger.detach();
		else
			this.miDebugger.stop();
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
		let id: number | string | VariableObject | ExtendedVariable;
		if (args.variablesReference < VAR_HANDLES_START) {
			id = args.variablesReference - STACK_HANDLES_START;
		} else {
			id = this.variableHandles.get(args.variablesReference);
		}

		if (typeof id == "number") {
			try {
				const variables: DebugProtocol.Variable[] = [];
				const [threadId, level] = this.frameIdToThreadAndLevel(id);
				const stackVariables = await this.miDebugger.getStackVariables(threadId, level);
				for (const stackVariable of stackVariables) {
					variables.push({
						name: stackVariable.cobolName,
						type: stackVariable.attribute.type,
						value: stackVariable.attribute.type,
						variablesReference: this.variableHandles.create(stackVariable.cobolName)
					});
				}

				response.body = {
					variables: variables
				};
				this.sendResponse(response);
			} catch (err) {
				this.sendErrorResponse(response, 1, `Could not expand variable: ${err}`);
			}
		} else if (typeof id == "string") {
			try {
				// TODO: this evals on an (effectively) unknown thread for multithreaded programs.
				const stackVariable = await this.miDebugger.evalCobField(id, 0, 0);

				const variables: DebugProtocol.Variable[] = [];
				variables.push({
					name: 'Value',
					type: stackVariable.attribute.type,
					value: stackVariable.value || "null",
					variablesReference: 0
				});
				for (const child of stackVariable.children.values()) {
					variables.push({
						name: child.cobolName,
						type: child.attribute.type,
						value: child.attribute.type,
						variablesReference: this.variableHandles.create(`${id}.${child.cobolName}`)
					});
				}
				response.body = {
					variables: variables
				};
				this.sendResponse(response);
			} catch (err) {
				this.sendErrorResponse(response, 1, `Could not expand variable: ${err}`);
			}
		} else {
			response.body = {
				variables: []
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
					result: res || "not available"
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

DebugSession.run(GDBDebugSession);
