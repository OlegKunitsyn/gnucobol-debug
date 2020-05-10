import * as vscode from "vscode";
import * as ChildProcess from "child_process";
import { GDBDebugSession } from "./gdb";
import { CoverageStatus } from './coverage';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.debug.registerDebugConfigurationProvider('gdb', new GdbConfigurationProvider()),
        vscode.debug.registerDebugAdapterDescriptorFactory('gdb', new GdbAdapterDescriptorFactory(new CoverageStatus(), new GDBDebugSession())),
    );
}

class GdbConfigurationProvider implements vscode.DebugConfigurationProvider {
    resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration> {
        const stdout = ChildProcess.spawnSync(config.cobcpath, ['-v'], { cwd: config.wd, env: config.procEnv }).stdout.toString();
        const match = /cobc\s\(GnuCOBOL\)\s([0-9]+)/ig.exec(stdout);
        if (match) {
            config.cobcver = parseInt(match[1]);
        }
        return config;
    }
}

class GdbAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
    constructor(public coverageBar:CoverageStatus, public debugSession:GDBDebugSession) {}
    createDebugAdapterDescriptor(_session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
        this.debugSession.coverageStatus = this.coverageBar;
        return new vscode.DebugAdapterInlineImplementation(this.debugSession);
    }
}
