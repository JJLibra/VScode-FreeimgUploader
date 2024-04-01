const vscode = require('vscode');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// 自定义配置项
function getConfiguration() {
    const config = vscode.workspace.getConfiguration('yourExtension');
    const apiUrl = config.get('apiUrl');
    const apiToken = config.get('apiToken');
    const imageLinkFormat = config.get('imageLinkFormat');
    return { apiUrl, apiToken, imageLinkFormat };
}

let { apiUrl, apiToken, imageLinkFormat } = getConfiguration();

vscode.workspace.onDidChangeConfiguration((e) => {
if (e.affectsConfiguration('Freeimg-uploader.apiUrl') || e.affectsConfiguration('Freeimg-uploader.apiToken')) {
    ({ apiUrl, apiToken } = getConfiguration());
}
});

// 上传图片
async function activate(context) {
    let disposable = vscode.commands.registerCommand('extension.uploadImage', async function () {
        const fileUri = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: '上传图片',
            filters: { 'Images': ['png', 'jpg', 'jpeg', 'gif'] }
        });

        if (!fileUri || fileUri.length === 0) {
            // 如果取消了文件选择，给出反馈
            vscode.window.showInformationMessage('没有选择任何文件');
            return;
        }

        const filePath = fileUri[0].fsPath;
        // const { apiUrl, apiToken, imageLinkFormat } = getConfiguration();

        try {
            const formData = new FormData();
            formData.append('file', fs.createReadStream(filePath));

            const response = await axios.post(apiUrl, formData, {
                headers: {
                    'Authorization': apiToken,
                    ...formData.getHeaders(),
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    // 更新进度条或状态栏信息
                    console.log(percentCompleted);
                },
            });

            // 根据API响应结构调整获取URL的方式
            const imageUrl = response.data.data.links.url;
            if (imageUrl) {
                vscode.window.showInformationMessage(`图片上传成功: ${imageUrl}`);
                insertImageUrl(imageUrl, imageLinkFormat); // 使用用户配置的格式插入图片链接
            } else {
                // 如果没有找到URL，给出提示
                vscode.window.showErrorMessage('图片上传成功，但未找到URL。');
                console.log(response.data);
            }

        } catch (error) {
            console.error('上传失败:', error);
            vscode.window.showErrorMessage(`图片上传失败: ${error.message}`);
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