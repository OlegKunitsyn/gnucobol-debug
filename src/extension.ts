import * as vscode from "vscode";
import { GDBDebugSession } from "./gdb";
import { CoverageStatus } from './coverage';

const dockerTerminal = vscode.window.createTerminal("GnuCOBOL Docker");
const dockerImage = 'olegkunitsyn/gnucobol:3.1-dev';
const dockerMessage = 'GnuCOBOL Docker container is not defined in launch.json';

export function activate(context: vscode.ExtensionContext) {
    const containerStart = vscode.commands.registerCommand('gnucobol-debug.containerStart', function () {
        const workspaceRoot: string = vscode.workspace.workspaceFolders[0].uri.fsPath;
        let config: vscode.DebugConfiguration;
        for (config of vscode.workspace.getConfiguration('launch', vscode.workspace.workspaceFolders[0].uri).get('configurations') as []) {
            if (config.type !== 'gdb') {
                continue;
            }
            if (config.container === undefined) {
                vscode.window.showInformationMessage(dockerMessage);
                break;
            }
            dockerTerminal.show(true);
            dockerTerminal.sendText(`docker run -d -i --name ${config.container} -w ${workspaceRoot} -v ${workspaceRoot}:${workspaceRoot} ${dockerImage}`);
            break;
        };
    });

    const containerStop = vscode.commands.registerCommand('gnucobol-debug.containerStop', function () {
        let config: vscode.DebugConfiguration;
        for (config of vscode.workspace.getConfiguration('launch', vscode.workspace.workspaceFolders[0].uri).get('configurations') as []) {
            if (config.type !== 'gdb') {
                continue;
            }
            if (config.container === undefined) {
                vscode.window.showInformationMessage(dockerMessage);
                break;
            }
            dockerTerminal.show(true);
            dockerTerminal.sendText(`docker rm --force ${config.container}`);
            break;
        };
    });

    context.subscriptions.push(
        containerStart,
        containerStop,
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
        if (config.container !== undefined) {
            config.cobcpath = 'docker';
            config.gdbpath = 'docker';
            config.cobcargs = ['exec', '-i', config.container, 'cobc'].concat(config.cobcargs);
            config.gdbargs = ['exec', '-i', config.container, 'gdb'].concat(config.gdbargs);
        }
        return config;
    }
}

class GdbAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
    constructor(public coverageBar: CoverageStatus, public debugSession: GDBDebugSession) { }
    createDebugAdapterDescriptor(_session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
        this.debugSession.coverageStatus = this.coverageBar;
        return new vscode.DebugAdapterInlineImplementation(this.debugSession);
    }
}
