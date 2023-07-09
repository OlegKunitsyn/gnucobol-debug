import * as vscode from 'vscode';

export class DebuggerSettings {
    private readonly extensionSettings: vscode.WorkspaceConfiguration;

    constructor() {
        this.extensionSettings = vscode.workspace.getConfiguration("Cobol_Debugger");
    }

    private getWithFallback<T>(settings: vscode.WorkspaceConfiguration, section: string): T {
        const info: any = settings.inspect<T>(section);
        if (info.workspaceFolderValue !== undefined) {
            return info.workspaceFolderValue;
        } else if (info.workspaceValue !== undefined) {
            return info.workspaceValue;
        } else if (info.globalValue !== undefined) {
            return info.globalValue;
        }
        return info.defaultValue;
    }

    public get displayVariableAttributes(): boolean {
        return this.getWithFallback<boolean>(this.extensionSettings, "display_variable_attributes");
    }

    public get cwd(): string {
        return this.getWithFallback<string>(this.extensionSettings, "cwd");
    }

    public get target(): string {
        return this.getWithFallback<string>(this.extensionSettings, "target");
    }

    public get gdbpath(): string {
        return this.getWithFallback<string>(this.extensionSettings, "gdbpath");
    }

    public get cobcpath(): string {
        return this.getWithFallback<string>(this.extensionSettings, "cobcpath");
    }

    public get gdbtty(): string {
        return this.getWithFallback<string>(this.extensionSettings, "gdbtty");
    }

}
