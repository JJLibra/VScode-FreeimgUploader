const vscode = require('vscode');
const screenshot = require('screenshot-desktop'); // 导入 screenshot-desktop
const axios = require('axios'); // 导入 axios

/**
 * 激活插件
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Congratulations, your extension "screenshot-uploader" is now active!');

    // 注册命令
    let disposable = vscode.commands.registerCommand('extension.uploadScreenshot', async () => {
        try {
            // 获取当前编辑器
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active text editor found.');
                return;
            }

            // 获取当前窗口截图
            const screenshotData = await takeScreenshot();

            // 复制截图到剪贴板
            vscode.env.clipboard.writeText(screenshotData);

            // 上传截图到兰空图床
            const imageUrl = await uploadToLankong(screenshotData);
            if (imageUrl) {
                vscode.window.showInformationMessage(`Screenshot uploaded successfully! Image URL: ${imageUrl}`);
            } else {
                vscode.window.showErrorMessage('Failed to upload screenshot.');
            }
        } catch (error) {
            console.error('Error:', error.message);
            vscode.window.showErrorMessage('An error occurred while processing the screenshot.');
        }
    });

    context.subscriptions.push(disposable);
}

/**
 * 获取当前窗口截图
 * @returns {Promise<string>} 截图的 base64 编码
 */
async function takeScreenshot() {
    try {
        // 获取截图数据
        const screenshotData = await screenshot();
        return screenshotData.toString('base64');
    } catch (error) {
        console.error('Error taking screenshot:', error.message);
        throw error;
    }
}

/**
 * 将截图上传到兰空图床
 * @param {string} screenshotData 截图的 base64 编码
 * @returns {Promise<string>} 图片的 URL
 */
async function uploadToLankong(screenshotData) {
    try {
        // 构建请求参数
        const formData = new FormData();
        formData.append('file', Buffer.from(screenshotData, 'base64'));

        // 发起 POST 请求
        const response = await axios.post('https://www.freeimg.cn/api/v1/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: 'Bearer 283|4I35l3oW5AWguA7q1xE0ztZ9h8NAirFEJSgqGUxk',
            },
        });

        // 解析响应
        const imageUrl = response.data.url;
        return imageUrl;
    } catch (error) {
        console.error('Error uploading screenshot:', error.message);
        return null;
    }
}

module.exports = {
    activate
};



