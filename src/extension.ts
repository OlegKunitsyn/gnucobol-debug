import * as vscode from "vscode";
import {GDBDebugSession} from "./gdb";
import {CoverageStatus} from './coverage';
import {DebuggerSettings} from "./settings";
import { EvaluatableExpressionProvider, TextDocument, Position, EvaluatableExpression, ProviderResult, window, Range } from "vscode";

const dockerTerminal = vscode.window.createTerminal("GnuCOBOL Docker");
const dockerMessage = "Property 'docker' is not defined in launch.json";
/** Max column index to retrieve line content */
const MAX_COLUMN_INDEX = 300;
/** Array of COBOL Reserved words */
const COBOL_RESERVED_WORDS = ["perform", "move", "to", "set", "add", "subtract", "call", "inquire", "modify", "invoke", "if", "not", "end-if", "until", "varying", "evaluate", "true", "when", "false", "go", "thru", "zeros", "spaces", "zero", "space", "inspect", "tallying", "exit", "paragraph", "method", "cycle", "from", "by", "and", "or", "of", "length", "function", "program", "synchronized", "end-synchronized", "string", "end-string", "on", "reference", "value", "returning", "giving", "replacing", "goback", "all", "open", "i-o", "input", "output", "close", "compute", "unstring", "using", "delete", "start", "read", "write", "rewrite", "with", "lock", "else", "upper-case", "lower-case", "display", "accept", "at", "clear-screen", "initialize", "line", "col", "key", "is", "self", "null", "stop", "run", "upon", "environment-name", "environment-value"]

export function activate(context: vscode.ExtensionContext) {
    const dockerStart = vscode.commands.registerCommand('gnucobol-debug.dockerStart', function () {
        let config: vscode.DebugConfiguration;
        let workspaceRoot: string = vscode.workspace.workspaceFolders[0].uri.fsPath;
        for (config of vscode.workspace.getConfiguration('launch', vscode.workspace.workspaceFolders[0].uri).get('configurations') as []) {
            if (config.type !== 'gdb') {
                continue;
            }
            if (config.docker === undefined) {
                vscode.window.showInformationMessage(dockerMessage);
                break;
            }
            if (process.platform === "win32") {
                workspaceRoot = workspaceRoot
                    .replace(/.*:/, s => "/" + s.toLowerCase().replace(":", ""))
                    .replace(/\\/g, "/");
            }
            vscode.workspace.workspaceFolders[0].uri.fsPath
                .replace(/.*:/, s => "/" + s.toLowerCase().replace(":", "")).replace(/\\/g, "/");
            dockerTerminal.show(true);
            dockerTerminal.sendText(`docker run -d -i --name gnucobol -w ${workspaceRoot} -v ${workspaceRoot}:${workspaceRoot} ${config.docker}`);
            break;
        }
    });

    const dockerStop = vscode.commands.registerCommand('gnucobol-debug.dockerStop', function () {
        let config: vscode.DebugConfiguration;
        for (config of vscode.workspace.getConfiguration('launch', vscode.workspace.workspaceFolders[0].uri).get('configurations') as []) {
            if (config.type !== 'gdb') {
                continue;
            }
            if (config.docker === undefined) {
                vscode.window.showInformationMessage(dockerMessage);
                break;
            }
            dockerTerminal.show(true);
            dockerTerminal.sendText(`docker rm --force gnucobol`);
            break;
        }
    });

    context.subscriptions.push(
        dockerStart,
        dockerStop,
        vscode.debug.registerDebugConfigurationProvider('gdb', new GdbConfigurationProvider()),
        vscode.debug.registerDebugAdapterDescriptorFactory('gdb', new GdbAdapterDescriptorFactory(new CoverageStatus(), new GDBDebugSession())),
        vscode.languages.registerEvaluatableExpressionProvider('GnuCOBOL', new GnuCOBOLEvalExpressionFactory()),
        vscode.languages.registerEvaluatableExpressionProvider('GnuCOBOL31', new GnuCOBOLEvalExpressionFactory()),
        vscode.languages.registerEvaluatableExpressionProvider('GnuCOBOL32', new GnuCOBOLEvalExpressionFactory()),
        vscode.languages.registerEvaluatableExpressionProvider('COBOL', new GnuCOBOLEvalExpressionFactory()),
    );
}

export function deactivate() {
    dockerTerminal.dispose();
}

class GdbConfigurationProvider implements vscode.DebugConfigurationProvider {
    resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration> {
        config.gdbargs = ["-q", "--interpreter=mi2"];
        if (config.docker !== undefined) {
            config.cobcpath = 'docker';
            config.gdbpath = 'docker';
            config.cobcargs = ['exec', '-i', 'gnucobol', 'cobc'].concat(config.cobcargs);
            config.gdbargs = ['exec', '-i', 'gnucobol', 'gdb'].concat(config.gdbargs);
        }
        const settings = new DebuggerSettings();
        if (config.cwd === undefined) {
            config.cwd = settings.cwd;
        }
        if (config.target === undefined) {
            config.target = settings.target;
        }
        if (config.group === undefined) {
            config.group = [];
        }
        if (config.arguments === undefined) {
            config.arguments = "";
        }
        if (config.gdbpath === undefined) {
            config.gdbpath = settings.gdbpath;
        }
        if (config.cobcpath === undefined) {
            config.cobcpath = settings.cobcpath;
        }
        return config;
    }
}

class GdbAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
    constructor(public coverageBar: CoverageStatus, public debugSession: GDBDebugSession) {
    }

    createDebugAdapterDescriptor(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
        this.debugSession.coverageStatus = this.coverageBar;
        return new vscode.DebugAdapterInlineImplementation(this.debugSession);
    }
}

class GnuCOBOLEvalExpressionFactory implements EvaluatableExpressionProvider {

	provideEvaluatableExpression(document: TextDocument, position: Position): ProviderResult<EvaluatableExpression> {
		let txtLine = this.getDocumentLine(document, position);
        if(txtLine.startsWith("      *")) return undefined;
		const selectionRange = this.getSelectionRangeInEditor();
		if (selectionRange) {
			return new EvaluatableExpression(selectionRange);
		}
		const wordRange = document.getWordRangeAtPosition(position)
        const txtToEval = document.getText(wordRange);
        if (COBOL_RESERVED_WORDS.indexOf(txtToEval.toLowerCase()) >= 0) {
			return undefined;
		}
        let txtRegex = new RegExp(".*\\*>.*"+txtToEval+".*$", "i");
        let match = txtRegex.exec(txtLine);
        if(match){
            const posToCompare = new Position(position.line, txtLine.indexOf("*>"));
            if(wordRange.end.isAfter(posToCompare))
                return undefined;            
        }
        // TODO: Do not use a global variable
        const variableName =  globalThis.varGlobal.filter(it => it.children.toLowerCase() === txtToEval.toLowerCase());    
        if(variableName && variableName.length>0){
            return new EvaluatableExpression(wordRange, variableName[0].father);
        }
        return wordRange ? new EvaluatableExpression(wordRange) : undefined;
	}

	/**
	 * Return line text
	 *
	 * @param document document which is being evaluated
	 * @param position position of the current line
	 */
	private getDocumentLine(document: TextDocument, position: Position): string {
		const start = new Position(position.line, 0);
		const end = new Position(position.line, MAX_COLUMN_INDEX);
		const range = new Range(start, end);
		return document.getText(range);
	}

	/**
	 * Returns the range selected by the user on editor, or undefined when there is
	 * no selection
	 */
	private getSelectionRangeInEditor(): Range | undefined {
		const textEditor = window.activeTextEditor;
		if (textEditor) {
			const startRange = textEditor.selection.start;
			const endRange = textEditor.selection.end;
			if (startRange.compareTo(endRange) !== 0) {
				return new Range(startRange, endRange);
			}
		}
		return undefined;
	}

}