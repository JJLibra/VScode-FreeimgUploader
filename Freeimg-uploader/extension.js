const vscode = require('vscode');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// 配置API和Token
function getConfiguration() {
    const config = vscode.workspace.getConfiguration('yourExtension');
    const apiUrl = config.get('apiUrl');
    const apiToken = config.get('apiToken');
    return { apiUrl, apiToken };
}

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
        const { apiUrl, apiToken } = getConfiguration();

        try {
            const formData = new FormData();
            formData.append('file', fs.createReadStream(filePath));

            const response = await axios.post(apiUrl, formData, {
                headers: {
                    'Authorization': apiToken,
                    ...formData.getHeaders(),
                },
            });

            // 检查是否正确获取到了URL
            // const imageUrl = response.data && response.data.data && response.data.data.url;
            // if (imageUrl) {
            //     vscode.window.showInformationMessage(`图片上传成功: ${imageUrl}`);
            //     insertImageUrl(imageUrl);
            // } else {
            //     vscode.window.showErrorMessage('图片上传成功，但未找到URL。');
            //     console.log(response.data);
            // }

            // 根据API响应结构调整获取URL的方式
            const imageUrl = response.data.data.links.url;
            if (imageUrl) {
                vscode.window.showInformationMessage(`图片上传成功: ${imageUrl}`);
                insertImageUrl(imageUrl); // 插入图片URL到编辑器
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

function insertImageUrl(imageUrl) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        editor.edit(editBuilder => {
            const position = editor.selection.active;
            editBuilder.insert(position, `![image](${imageUrl})`);
        });
        vscode.window.showInformationMessage('图片URL已插入到编辑器。');
    }    
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};