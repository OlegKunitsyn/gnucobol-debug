import * as vscode from 'vscode';

export class DebuggerSettings {
    private readonly settings: vscode.WorkspaceConfiguration;

    constructor() {
        this.settings = vscode.workspace.getConfiguration("Cobol_Debugger");
    }

    private getWithFallback<T>(section: string): T {
        const info: any = this.settings.inspect<T>(section);
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
        return this.getWithFallback<boolean>("display_variable_attributes");
    }
}
