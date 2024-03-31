"use strict";
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const spawn = require("child_process").spawn;
const oss = require('ali-oss');
const moment = require('moment');

const fetch = require('node-fetch');
const FormData = require('form-data');
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
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
function deactivate() {
	console.log("插件已被释放。");
}
exports.deacivate = deactivate;
module.exports = {
	activate,
	deactivate
};
var filePath;
var fileName;
var ext;
var folderPath;
var projectPath;
var localPath;
var config;

async function uploadToLanKong(filePath) {
    const file = fs.createReadStream(filePath);
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('https://www.freeimg.cn/api/v1/upload', {
        method: 'POST',
        body: formData,
        headers: {
            'Authorization': 'Bearer 284|JkbjqFTrYbgT2qsvL1TGPJHhRWvVdpvgk2IElrVx'
        }
    });

    const result = await response.json();
    return result;
}

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
	config = vscode.workspace.getConfiguration("pastePicbed");
	if (config.alioss.accessKeyId == '' || config.alioss.accessKeySecret == '' || config.alioss.bucket == '' || config.alioss.region == '') {
		vscode.window.showErrorMessage(`accessKeyId, accessKeySecret, bucket or region can't be empty.`);
		return;
	}
	let editor = vscode.window.activeTextEditor;
	if (!editor) return;
	let m = moment();
	let fileUri = editor.document.uri;
	if (!fileUri) return;
	if (fileUri.scheme === "untitled") {
		vscode.window.showInformationMessage(`Can't get the path of file . You need to save the file first.`);
		return;
	}
	filePath = fileUri.fsPath;
	ext = path.extname(filePath);
	fileName = path.basename(filePath, ext);
	folderPath = path.dirname(filePath);
	projectPath = vscode.workspace.rootPath;
	if (!config.localPath) {
		localPath = folderPath;
	} else {
		localPath = replaceToken(m, config.localPath);
	}
	var selection = editor.selection;
	let imageName = replaceToken(m, config.imageName) + '.png';
	let remotePath = path.posix.join(replaceToken(m, config.remotePath), imageName);
	let imagePath = path.join(localPath, imageName)
	createImageLocalPath(localPath, () => {
		saveClipboardImageToFileAndGetPath(
			imagePath,
			(imagePath, imagePathReturnByScript) => {
				if (imagePathReturnByScript === 'no image') {
					console.log('no image');
					vscode.commands.executeCommand('editor.action.clipboardPasteAction');
					return;
				} else if (config.onlySaveLocal) {
					imagePath = '![](' + path.relative(folderPath, imagePath) + ')';
					editor.edit(edit => {
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
						imagePath = '![](' + response.url + ')';
						editor.edit(edit => {
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
	return str
}
function createImageLocalPath(localPath, callback) {
	fs.mkdir(localPath, { recursive: true }, (err) => {
		if (err) {
			vscode.window.showErrorMessage(err.message);
		} else {
			callback();
		}
	});
}
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
				vscode.window.showErrorMessage(`The powershell command is not in you PATH environment variables. Please add it and retry.`);
			} else {
				vscode.window.showErrorMessage(e);
			}
		});
		powershell.on("exit", function (code, signal) {
		});
		powershell.stdout.on("data", function (data) {
			callback(imagePath, data.toString().trim());
		});
	} else if (platform === "darwin") {
		// Mac
		let scriptPath = path.join(__dirname, "../res/mac.applescript");
		let ascript = spawn("osascript", [scriptPath, imagePath]);
		ascript.on("error", function (e) {
			vscode.window.showErrorMessage(e);
		});
		ascript.on("exit", function (code, signal) {
		});
		ascript.stdout.on("data", function (data) {
			callback(imagePath, data.toString().trim());
		});
	} else {
		// Linux
		let scriptPath = path.join(__dirname, "../res/linux.sh");
		let ascript = spawn("sh", [scriptPath, imagePath]);
		ascript.on("error", function (e) {
			vscode.window.showErrorMessage(e);
		});
		ascript.on("exit", function (code, signal) {
		});
		ascript.stdout.on("data", function (data) {
			let result = data.toString().trim();
			if (result == "no xclip") {
				vscode.window.showInformationMessage('You need to install xclip command first.');
				return;
			}
			callback(imagePath, result);
		});
	}
}
