import {
    Range,
    workspace,
    window,
    StatusBarItem,
    TextEditorDecorationType,
    DecorationRangeBehavior,
    OverviewRulerLane,
    ThemeColor,
    StatusBarAlignment,
    Disposable,
    commands
} from "vscode";
import * as os from "os";
import * as nativePath from "path";
import * as ChildProcess from "child_process";
import {Coverage, parseGcov} from "./gcov/gcov";
import {SourceMap} from "./parser.c";

export class CoverageStatus implements Disposable {
    private coverage: Coverage[] = [];
    private sourceMap: SourceMap;
    private statusBar: StatusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 100);
    readonly RED: TextEditorDecorationType = window.createTextEditorDecorationType({
        isWholeLine: true,
        rangeBehavior: DecorationRangeBehavior.ClosedClosed,
        outline: 'none',
        backgroundColor: 'rgba(255, 20, 20, 0.2)',
        overviewRulerColor: new ThemeColor('editorOverviewRuler.errorForeground'),
        overviewRulerLane: OverviewRulerLane.Center
    });
    readonly GREEN: TextEditorDecorationType = window.createTextEditorDecorationType({
        isWholeLine: true,
        rangeBehavior: DecorationRangeBehavior.ClosedClosed,
        outline: 'none',
        backgroundColor: 'rgba(20, 250, 20, 0.2)'
    });
    readonly COMMAND = 'gdb.coverage-toggle';
    private highlight: boolean = true;

    constructor() {
        workspace.onDidOpenTextDocument(() => {
            this.updateStatus();
        });
        workspace.onDidCloseTextDocument(() => {
            this.updateStatus();
        });
        window.onDidChangeActiveTextEditor(() => {
            this.updateStatus();
        });
        commands.registerCommand(this.COMMAND, () => {
            this.highlight = !this.highlight;
            this.updateStatus();
        });
        this.statusBar.command = this.COMMAND;
    }

    public show(gcovFiles: string[], sourceMap: SourceMap, docker: string = undefined) {
        if (docker !== undefined) {
            for (let i = 0; i < gcovFiles.length; i++) {
                const localPath = nativePath.resolve(os.tmpdir(), nativePath.basename(gcovFiles[i]));
                ChildProcess.spawnSync('docker', ['cp', `gnucobol:${gcovFiles[i]}.gcda`, `${localPath}.gcda`]);
                ChildProcess.spawnSync('docker', ['cp', `gnucobol:${gcovFiles[i]}.gcno`, `${localPath}.gcno`]);
                gcovFiles[i] = localPath;
            }
        }

        this.coverage = parseGcov(gcovFiles);
        this.sourceMap = sourceMap;
        this.updateStatus();
    }

    public dispose() {
        this.statusBar.dispose();
    }

    private updateStatus() {
        const editor = window.activeTextEditor;
        if (editor === undefined) {
            this.statusBar.hide();
            return;
        }
        const red: Range[] = [];
        const green: Range[] = [];
        for (const line of this.coverage) {
            if (this.sourceMap.hasLineCobol(line.fileC, line.lineC)) {
                const map = this.sourceMap.getLineCobol(line.fileC, line.lineC);
                if (editor.document.uri.fsPath !== map.fileCobol) {
                    continue;
                }
                const range = new Range(map.lineCobol - 1, 0, map.lineCobol - 1, Number.MAX_VALUE);
                if (line.hasExecuted) {
                    green.push(range);
                } else {
                    red.push(range);
                }
            }
        }
        if (red.length === 0 || !this.highlight) {
            editor.setDecorations(this.RED, []);
        } else {
            editor.setDecorations(this.RED, red);
        }
        if (green.length === 0 || !this.highlight) {
            editor.setDecorations(this.GREEN, []);
        } else {
            editor.setDecorations(this.GREEN, green);
        }
        this.statusBar.text = (this.highlight ? `$(eye) ` : `$(eye-closed) `) + Math.ceil(green.length * 100 / Math.max(1, red.length + green.length)) + '%';
        this.statusBar.tooltip = `Covered ${green.length} of ${red.length} lines`;
        this.statusBar.show();
    }
}
