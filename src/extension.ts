import * as vscode from "vscode";
import * as ChildProcess from "child_process";
import { GDBDebugSession } from "./gdb";
import { CoverageStatus } from './coverage';

const docker = vscode.window.createTerminal("GnuCOBOL Docker");

export function activate(context: vscode.ExtensionContext) {
    const containerStart = vscode.commands.registerCommand('gnucobol-debug.containerStart', function () {
        const workspaceRoot:string = vscode.workspace.workspaceFolders[0].uri.fsPath;
        let config: vscode.DebugConfiguration; 
        for (config of vscode.workspace.getConfiguration('launch', vscode.workspace.workspaceFolders[0].uri).get('configurations') as []) {
            if (config.type === 'gdb' && config.container !== undefined) {
                docker.show(true);
                docker.sendText(`docker run -d -i --name ${config.container} -w ${workspaceRoot} -v ${workspaceRoot}:${workspaceRoot} olegkunitsyn/gnucobol:3.1-dev`);
            }
        };
    });

    const containerStop = vscode.commands.registerCommand('gnucobol-debug.containerStop', function () {
        let config: vscode.DebugConfiguration; 
        for (config of vscode.workspace.getConfiguration('launch', vscode.workspace.workspaceFolders[0].uri).get('configurations') as []) {
            if (config.type === 'gdb' && config.container !== undefined) {
                docker.show(true);
                docker.sendText(`docker rm --force ${config.container}`);
            }
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
    docker.dispose();
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
        
        const process = ChildProcess.spawnSync(config.cobcpath, config.cobcargs.concat(['-V']), { cwd: config.wd, env: config.procEnv });
        if (process.status === 0) {
            const match = /cobc\s\(GnuCOBOL\)\s([0-9]+)/ig.exec(process.stdout.toString());
            if (match) {
                config.cobcver = parseInt(match[1]);
            }
        } else {
            vscode.window.showErrorMessage(`${process.error?.message ?? process.output?.join(' ')} when executing '${config.cobcpath} ${config.cobcargs.concat(['-V']).join(' ')}'`);
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
