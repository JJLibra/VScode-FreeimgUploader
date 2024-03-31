// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
"use strict";
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const spawn = require("child_process").spawn;
const oss = require('ali-oss');
const moment = require('moment');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log(
		'Congratulations, your extension "vscode-plugin-picbed" is now active!'
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("extension.pastePicbed", pastePicbed)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('extension.pastePicbedUploadSwitch', pastePicbedUploadSwitch)
	);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
	console.log("插件已被释放。");
}
exports.deacivate = deactivate;

module.exports = {
	activate,
	deactivate
};

var filePath; // 文件的路径
var fileName;
var ext;
var folderPath;
var projectPath;
var localPath;
var config;

function pastePicbedUploadSwitch() {
	config = vscode.workspace.getConfiguration("pastePicbed");
	if (config.onlySaveLocal) {
		config.update('onlySaveLocal', false);
		vscode.window.showInformationMessage('Paste Picbed: 粘贴的图片将上传至图床。');
	} else {
		config.update('onlySaveLocal', true);
		vscode.window.showInformationMessage('Paste Picbed: 粘贴的图片仅保存在本地。');
	}
}

function pastePicbed() {
	// 加载配置
	config = vscode.workspace.getConfiguration("pastePicbed");
	if (config.alioss.accessKeyId == '' || config.alioss.accessKeySecret == '' || config.alioss.bucket == '' || config.alioss.region == '') {
		vscode.window.showErrorMessage(`accessKeyId, accessKeySecret, bucket or region can't be empty.`);
		return;
	}
	// console.log(config);

	let editor = vscode.window.activeTextEditor;
	if (!editor) return;

	let m = moment(); // 记录当前时间，用于替换路径和文件名中的关键字

	let fileUri = editor.document.uri;
	if (!fileUri) return;
	if (fileUri.scheme === "untitled") {
		// filePath = folderPath;
		// 未保存的文件没有路径
		vscode.window.showInformationMessage(`Can't get the path of file . You need to save the file first.`);
		return;
	}

	filePath = fileUri.fsPath; // 文件的路径
	ext = path.extname(filePath);
	fileName = path.basename(filePath, ext);
	folderPath = path.dirname(filePath);
	projectPath = vscode.workspace.rootPath;

	if (!config.localPath) {
		// 未设置路径的时候默认取当前文件的位置
		localPath = folderPath;
	} else {
		localPath = replaceToken(m, config.localPath);
	}

	// TODO: 将选中文本作为文件名
	var selection = editor.selection;
	// var selectText = editor.document.getText(selection);
	// if (selectText && /[\\:*?<>|]/.test(selectText)){
	// 	console.log('Your selection is not a valid filename!');
	// 	return;
	// }
	// console.log("", selectText);

	let imageName = replaceToken(m, config.imageName) + '.png';

	// win平台使用正斜杠\做路径，unix平台使用反斜杠/
	// path会根据平台自动切换，在win平台远程路径会出错，这里需指定远程路径是unix格式。
	let remotePath = path.posix.join(replaceToken(m, config.remotePath), imageName);
	let imagePath = path.join(localPath, imageName)
	// console.log(localPath);

	createImageLocalPath(localPath, () => {
		// 保存剪贴板的图像，并返回成功后的路径
		saveClipboardImageToFileAndGetPath(
			imagePath,
			(imagePath, imagePathReturnByScript) => {

				// console.log(imagePath, imagePathReturnByScript, remotePath);
				if (imagePathReturnByScript === 'no image') {
					// 非图像则执行粘贴
					console.log('no image');
					vscode.commands.executeCommand('editor.action.clipboardPasteAction');
					return;
				} else if (config.onlySaveLocal) {

					// if (config.localPath.indexOf('${') == 0){
					// 	imagePath = '![](' + path.relative(folderPath, imagePath) + ')';
					// } else {
					// 	// 绝对路径在预览的时候可能会有问题
					// 	imagePath = '![](' + imagePath + ')';
					// }

					// 采用相对路径
					imagePath = '![](' + path.relative(folderPath, imagePath) + ')';
					editor.edit(edit => {
						// let current = editor.selection;
						// if (current.isEmpty) {
						// 	edit.insert(current.start, imagePath);
						// } else {
						// 	edit.replace(current, imagePath);
						// }
						edit.insert(selection.start, imagePath);
					});

				} else {

					let client = new oss({
						region: config.alioss.region,
						accessKeyId: config.alioss.accessKeyId,
						accessKeySecret: config.alioss.accessKeySecret,
						bucket: config.alioss.bucket,
						secure: true
					});

					client.put(remotePath, imagePath).then(function (response) {
						// console.log('put success: ', response);
						// @ts-ignore
						imagePath = '![](' + response.url + ')';
						editor.edit(edit => {
							// let current = editor.selection;
							// if (current.isEmpty) {
							// 	edit.insert(current.start, imagePath);
							// } else {
							// 	edit.replace(current, imagePath);
							// }
							edit.insert(selection.start, imagePath);
						});
					}).catch(function (err) {
						vscode.window.showErrorMessage(err);
					});
				}
			}
		);
	});
}

/**
 * 返回符合 ISO 8601 格式的时间字符串
 * @param {number} expire 距离当前时间的秒数
 */
function getISOTime(expire) {
	let d = new Date();
	d.setTime(d.getTime() + expire * 1000);
	d.setHours(d.getHours(), d.getMinutes() - d.getTimezoneOffset());
	return d.toISOString();
}

function replaceToken(m, str) {
	str = str.replace('${year}', m.format('Y'));
	str = str.replace('${month}', m.format('MM'));
	str = str.replace('${day}', m.format('DD'));
	str = str.replace('${hour}', m.format('HH'));
	str = str.replace('${min}', m.format('mm'));
	str = str.replace('${sec}', m.format('ss'));
	str = str.replace('${fileName}', fileName);
	str = str.replace('${folderPath}', folderPath);
	str = str.replace('${projectPath}', projectPath);
	// console.log(str);
	return str
}


function createImageLocalPath(localPath, callback) {
	fs.mkdir(localPath, { recursive: true }, (err) => {
		if (err) {
			// throw err;
			vscode.window.showErrorMessage(err.message);
		} else {
			callback();
		}
	});
}


/**
 * use applescript to save image from clipboard and get file path
 */
function saveClipboardImageToFileAndGetPath(imagePath, callback) {
	if (!imagePath) return;

	let platform = process.platform;
	if (platform === "win32") {
		// Windows
		const scriptPath = path.join(__dirname, "../res/pc.ps1");

		let command =
			"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
		let powershellExisted = fs.existsSync(command);
		if (!powershellExisted) {
			command = "powershell";
		}

		const powershell = spawn(command, [
			"-noprofile",
			"-noninteractive",
			"-nologo",
			"-sta",
			"-executionpolicy",
			"unrestricted",
			"-windowstyle",
			"hidden",
			"-file",
			scriptPath,
			imagePath
		]);
		powershell.on("error", function (e) {
			if (e.code == "ENOENT") {
				// Logger.showErrorMessage(`The powershell command is not in you PATH environment variables. Please add it and retry.`);
				vscode.window.showErrorMessage(`The powershell command is not in you PATH environment variables. Please add it and retry.`);
			} else {
				// Logger.showErrorMessage(e);			
				vscode.window.showErrorMessage(e);
			}
		});
		powershell.on("exit", function (code, signal) {
			// console.log('exit', code, signal);
		});
		powershell.stdout.on("data", function (data) {
			// cb(imagePath, data.toString().trim());
			callback(imagePath, data.toString().trim());
		});
	} else if (platform === "darwin") {
		// Mac
		let scriptPath = path.join(__dirname, "../res/mac.applescript");

		let ascript = spawn("osascript", [scriptPath, imagePath]);
		ascript.on("error", function (e) {
			// Logger.showErrorMessage(e);
			vscode.window.showErrorMessage(e);
		});
		ascript.on("exit", function (code, signal) {
			// console.log('exit', code, signal);
		});
		ascript.stdout.on("data", function (data) {
			// cb(imagePath, data.toString().trim());
			callback(imagePath, data.toString().trim());
		});
	} else {
		// Linux

		let scriptPath = path.join(__dirname, "../res/linux.sh");

		let ascript = spawn("sh", [scriptPath, imagePath]);
		ascript.on("error", function (e) {
			// Logger.showErrorMessage(e);
			vscode.window.showErrorMessage(e);
		});
		ascript.on("exit", function (code, signal) {
			// console.log('exit', code, signal);
		});
		ascript.stdout.on("data", function (data) {
			let result = data.toString().trim();
			if (result == "no xclip") {
				// Logger.showInformationMessage('You need to install xclip command first.');
				vscode.window.showInformationMessage('You need to install xclip command first.');
				return;
			}
			// cb(imagePath, result);
			callback(imagePath, result);
		});
	}
}
