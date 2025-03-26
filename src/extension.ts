import * as vscode from 'vscode';
import { RolePanel } from './rolePanel';

export function activate(context: vscode.ExtensionContext) {
    // 注册显示角色面板的命令
    let disposable = vscode.commands.registerCommand('trae-rules-manager.showRolePanel', () => {
        RolePanel.createOrShow(context.extensionUri);
    });

    context.subscriptions.push(disposable);

    // 注册文本编辑器变更事件监听
    let activeEditor = vscode.window.activeTextEditor;
    let timeout: NodeJS.Timeout | undefined = undefined;

    function triggerRolePanel() {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const position = editor.selection.active;
                const document = editor.document;
                const line = document.lineAt(position.line);
                const lineText = line.text.substring(0, position.character);
                
                // 检查是否输入了触发字符
                const config = vscode.workspace.getConfiguration('trae-rules-manager');
                const triggerChar = config.get<string>('triggerChar', '@');
                if (lineText.endsWith(triggerChar)) {
                    RolePanel.createOrShow(context.extensionUri);
                }
            }
        }, vscode.workspace.getConfiguration('trae-rules-manager').get('debounceDelay', 300));
    }

    // 监听文本变更事件
    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            triggerRolePanel();
        }
    }, null, context.subscriptions);

    // 监听活动编辑器变更事件
    vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
    }, null, context.subscriptions);
}

export function deactivate() {}