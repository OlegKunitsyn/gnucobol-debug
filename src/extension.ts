import * as vscode from "vscode";
import * as ChildProcess from "child_process";
import { GDBDebugSession } from "./gdb";

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.debug.registerDebugConfigurationProvider('gdb', new GdbConfigurationProvider()),
        vscode.debug.registerDebugAdapterDescriptorFactory('gdb', new GdbAdapterDescriptorFactory())
    );
}

class GdbConfigurationProvider implements vscode.DebugConfigurationProvider {
    resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration> {
        const stdout = ChildProcess.spawnSync(config.cobcpath, ['-v'], { cwd: config.wd, env: config.procEnv }).stdout.toString();
        const match = /cobc\s\(GnuCOBOL\)\s([0-9]+)\.([0-9]+)\.[0-9]+/ig.exec(stdout);
        if (match) {
            config.cobcver = match[1] + match[2];
        }
        return config;
    }
}

class GdbAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
    createDebugAdapterDescriptor(_session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
        return new vscode.DebugAdapterInlineImplementation(new GDBDebugSession());
    }
}
