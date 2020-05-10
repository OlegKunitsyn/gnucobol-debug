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
  Disposable
} from "vscode";
import { Coverage, parseGcov } from "./gcov/gcov";
import { SourceMap } from "./parser.c";

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
  }

  public show(gcovFiles: string[], sourceMap: SourceMap) {
    this.coverage = parseGcov(gcovFiles);
    this.sourceMap = sourceMap;
    this.updateStatus();
  }

  public dispose() {
  }

  private updateStatus() {
    const editor = window.activeTextEditor;
    if (editor === undefined) {
      this.statusBar.hide();
      return;
    }
    const red: Range[] = [];
    const green: Range[] = [];
    for (let line of this.coverage) {
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
    if (red.length === 0) {
      editor.setDecorations(this.RED, []);
    } else {
      editor.setDecorations(this.RED, red);
    }
    if (green.length === 0) {
      editor.setDecorations(this.GREEN, []);
    } else {
      editor.setDecorations(this.GREEN, green);
    }
    const total = Math.max(1, red.length + green.length);
    this.statusBar.text = `$(eye) ` + Math.ceil(green.length * 100 / total) + '%';
    this.statusBar.tooltip = `Covered ${green.length} of ${total} lines`;
    this.statusBar.show();
  }
}
