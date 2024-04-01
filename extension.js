const vscode = require('vscode');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
let lastUsedFolder = undefined;

async function uploadImage(filePath) {
    const { apiUrl, apiToken } = getConfiguration();

    try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));

        // 注意：这里直接使用 await 并返回 imageUrl
        const response = await axios.post(apiUrl, formData, {
            headers: {
                'Authorization': apiToken,
                ...formData.getHeaders(),
            },
        });

        // 确保API响应中有预期的数据结构
        if (response.data && response.data.data && response.data.data.links && response.data.data.links.url) {
            const imageUrl = response.data.data.links.url;
            vscode.window.showInformationMessage(`图片上传成功: ${imageUrl}`);
            return imageUrl; // 返回图片URL
        } else {
            throw new Error('未找到图片URL');
        }
    } catch (error) {
        console.error('上传失败:', error);
        vscode.window.showErrorMessage(`图片上传失败: ${error.message}`);
        return null; // 出错时返回 null
    }
}

async function activate(context) {
    let disposable = vscode.commands.registerCommand('extension.uploadImage', async function () {
        const { defaultUploadFolder, imageLinkFormat } = getConfiguration();
        let defaultUri = lastUsedFolder ? vscode.Uri.file(lastUsedFolder) : (defaultUploadFolder ? vscode.Uri.file(defaultUploadFolder) : undefined);

        const fileUri = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: '上传',
            filters: { 'Images': ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
            defaultUri: defaultUri
        });

        if (!fileUri || fileUri.length === 0) {
            vscode.window.showInformationMessage('已取消上传');
            return;
        }

        const filePath = fileUri[0].fsPath;
        lastUsedFolder = path.dirname(filePath);
        const imageUrl = await uploadImage(filePath);
        if (imageUrl) {
            insertImageUrl(imageUrl, imageLinkFormat);
        } else {
            vscode.window.showErrorMessage('图片上传失败或未找到URL。');
        }        
    });

    context.subscriptions.push(disposable);
}

function insertImageUrl(imageUrl, imageLinkFormat) {
    const editor = vscode.window.activeTextEditor;
    if (editor && imageUrl) {
        const formattedImageLink = imageLinkFormat.replace('${url}', imageUrl);
        editor.edit(editBuilder => {
            const position = editor.selection.active;
            editBuilder.insert(position, formattedImageLink);
        });
        vscode.window.showInformationMessage('图片链接已插入到编辑器。');
    }
}

function getConfiguration() {
    const config = vscode.workspace.getConfiguration('Freeimg-uploader');
    return {
        apiUrl: config.get('apiUrl'),
        apiToken: `Bearer ${config.get('apiToken')}`,
        imageLinkFormat: config.get('imageLinkFormat'),
        defaultUploadFolder: config.get('defaultUploadFolder')
    };
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
