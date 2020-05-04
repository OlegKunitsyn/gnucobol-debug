import * as vscode from "vscode";
import * as ChildProcess from "child_process";

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.debug.registerDebugConfigurationProvider('gdb', new GdbConfigurationProvider())
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

    dispose() {
    }
}
