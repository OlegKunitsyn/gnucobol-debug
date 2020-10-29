import * as vscode from "vscode";
import {GDBDebugSession} from "./gdb";
import {CoverageStatus} from './coverage';
import {DebuggerSettings} from "./settings";

const dockerTerminal = vscode.window.createTerminal("GnuCOBOL Docker");
const dockerMessage = "Property 'docker' is not defined in launch.json";

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

    createDebugAdapterDescriptor(_session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
        this.debugSession.coverageStatus = this.coverageBar;
        return new vscode.DebugAdapterInlineImplementation(this.debugSession);
    }
}
