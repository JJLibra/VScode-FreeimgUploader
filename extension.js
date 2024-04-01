const vscode = require('vscode');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
let lastUsedFolder = undefined;

// 自定义配置项
function getConfiguration() {
    const config = vscode.workspace.getConfiguration('Freeimg-uploader');
    const apiUrl = config.get('apiUrl');
    let apiToken = config.get('apiToken');
    // 确保apiToken以"Bearer "开头
    if (!apiToken.startsWith('Bearer ')) {
        apiToken = `Bearer ${apiToken}`;
    }
    const imageLinkFormat = config.get('imageLinkFormat');
    const defaultUploadFolder = config.get('defaultUploadFolder');
    return { apiUrl, apiToken, imageLinkFormat, defaultUploadFolder };
}

let { apiUrl, apiToken, imageLinkFormat } = getConfiguration();

vscode.workspace.onDidChangeConfiguration((e) => {
if (e.affectsConfiguration('Freeimg-uploader.apiUrl') || e.affectsConfiguration('Freeimg-uploader.apiToken')) {
    ({ apiUrl, apiToken, imageLinkFormat } = getConfiguration());
}
});

// 上传图片
async function activate(context) {
    let disposable = vscode.commands.registerCommand('extension.uploadImage', async function () {
        const defaultUploadFolder = getConfiguration().defaultUploadFolder;
        let defaultUri = defaultUploadFolder ? vscode.Uri.file(defaultUploadFolder) : lastUsedFolder;

        const fileUri = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: '上传',
            filters: { 'Images': ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
            defaultUri: defaultUri
        });

        if (fileUri && fileUri.length > 0) {
            const filePath = fileUri[0].fsPath;
            lastUsedFolder = vscode.Uri.file(path.dirname(filePath));

            try {
                const formData = new FormData();
                formData.append('file', fs.createReadStream(filePath));
    
                const response = await axios.post(apiUrl, formData, {
                    headers: {
                        'Authorization': apiToken,
                        ...formData.getHeaders(),
                    }
                });
    
                // 根据API响应结构调整获取URL的方式
                const imageUrl = response.data.data.links.url;
                if (imageUrl) {
                    vscode.window.showInformationMessage(`图片上传成功: ${imageUrl}`);
                    insertImageUrl(imageUrl, imageLinkFormat);
                } else {
                    // 如果没有找到URL，给出提示
                    vscode.window.showErrorMessage('图片上传成功，但未找到URL。');
                    console.log(response.data);
                }
    
            } catch (error) {
                console.error('上传失败:', error);
                vscode.window.showErrorMessage(`图片上传失败: ${error.message}`);
            }  
        } else {
            // 用户没有选择文件，认为是取消了操作
            vscode.window.showInformationMessage('已取消上传');
        }     
    });

    context.subscriptions.push(disposable);
}

// 光标处插入图片链接
function insertImageUrl(imageUrl, imageLinkFormat) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const formattedImageLink = imageLinkFormat.replace('${url}', imageUrl);
        editor.edit(editBuilder => {
            const position = editor.selection.active;
            editBuilder.insert(position, formattedImageLink);
        });
        vscode.window.showInformationMessage('图片链接已插入到编辑器。');
    }
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};