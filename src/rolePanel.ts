import * as vscode from 'vscode';

export class RolePanel {
    public static currentPanel: RolePanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'selectRole':
                        // 处理角色选择
                        const editor = vscode.window.activeTextEditor;
                        if (editor) {
                            const position = editor.selection.active;
                            const line = editor.document.lineAt(position.line);
                            const lineText = line.text.substring(0, position.character);
                            const triggerChar = vscode.workspace.getConfiguration('trae-rules-manager').get<string>('triggerChar', '@');
                            if (lineText.endsWith(triggerChar)) {
                                editor.edit(editBuilder => {
                                    // 删除触发字符
                                    const startPos = new vscode.Position(position.line, position.character - 1);
                                    const endPos = new vscode.Position(position.line, position.character);
                                    editBuilder.delete(new vscode.Range(startPos, endPos));
                                    // 插入角色提示词
                                    editBuilder.insert(position, message.role.prompt);
                                });
                            }
                        }
                        this._panel.dispose();
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (RolePanel.currentPanel) {
            RolePanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'traeRoleManager',
            'Trae Role Manager',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        RolePanel.currentPanel = new RolePanel(panel, extensionUri);
    }

    private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
        // 获取角色配置
        const roles = [
            { id: 1, name: '需求分析师', description: '专注于需求分析和文档编写', prompt: 'As a requirement analyst, please help me analyze the following requirements:\n' },
            { id: 2, name: '架构师', description: '系统架构设计专家', prompt: 'As a system architect, please help me design the architecture for:\n' },
            { id: 3, name: '代码审查员', description: '代码质量和最佳实践', prompt: 'As a code reviewer, please review the following code:\n' },
        ];
    
        return `
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Trae Role Manager</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        padding: 10px;
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                    }
                    .search-box {
                        width: 100%;
                        padding: 8px;
                        margin-bottom: 10px;
                        border: 1px solid var(--vscode-input-border);
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                    }
                    .role-list {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }
                    .role-item {
                        padding: 10px;
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 4px;
                        cursor: pointer;
                    }
                    .role-item:hover {
                        background: var(--vscode-list-hoverBackground);
                    }
                    .role-name {
                        font-weight: bold;
                        margin-bottom: 4px;
                    }
                    .role-description {
                        font-size: 0.9em;
                        color: var(--vscode-descriptionForeground);
                    }
                </style>
            </head>
            <body>
                <input type="text" class="search-box" placeholder="搜索角色..." id="searchInput">
                <div class="role-list" id="roleList">
                    ${roles.map(role => `
                        <div class="role-item" data-role='${JSON.stringify(role).replace(/'/g, "&apos;")}'>
                            <div class="role-name">${role.name}</div>
                            <div class="role-description">${role.description}</div>
                        </div>
                    `).join('')}
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    const searchInput = document.getElementById('searchInput');
                    const roleList = document.getElementById('roleList');
                    const roles = ${JSON.stringify(roles)};
    
                    // 搜索功能
                    searchInput.addEventListener('input', (e) => {
                        const searchText = e.target.value.toLowerCase();
                        const filteredRoles = roles.filter(role =>
                            role.name.toLowerCase().includes(searchText) ||
                            role.description.toLowerCase().includes(searchText)
                        );
                        
                        roleList.innerHTML = filteredRoles.map(role => \`
                            <div class="role-item" data-role='\${JSON.stringify(role).replace(/'/g, "&apos;")}'>
                                <div class="role-name">\${role.name}</div>
                                <div class="role-description">\${role.description}</div>
                            </div>
                        \`).join('');
                    });
    
                    // 角色选择
                    roleList.addEventListener('click', (e) => {
                        const roleItem = e.target.closest('.role-item');
                        if (roleItem) {
                            const role = JSON.parse(roleItem.dataset.role.replace(/&apos;/g, "'"));
                            vscode.postMessage({
                                command: 'selectRole',
                                role: role
                            });
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }

    public dispose() {
        RolePanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}