# README

借鉴了Paste Image的源码实现[GitHub](https://github.com/mushanshitiancai/vscode-paste-image)，在其基础上增加了上传图床功能。

## Features

默认快捷键是 `alt+v`(win)，`ctrl+v`(mac)。

若剪贴板中的数据是图片则将上传至图床（目前只支持阿里云OSS），并将 markdown 格式的图片链接粘贴到 markdown 文档中。

## Requirements

All requirements are listed in the end of file `package.json`.
You can install them by executing the following command.

```bash
npm install
```

## 支持格式化路径

目前可使用的关键字有：

- `${year}`: 四位的年份，例如 2020
- `${month}`: 两位的月份，例如 01
- `${day}`: 两位的日期，例如 02
- `${hour}`: 两位的小时，例如 15
- `${min}`: 两位的分钟，例如 25
- `${sec}`: 两位的秒数，例如 35
- `${fileName}`: 文件名，不包含后缀
- `${folderPath}`: 当前编辑的文件所在的文件夹
- `${projectPath}`: 当前项目的根目录

## Release Notes


### 0.0.3, 2020-02-27

增加图像不上传图床的开关设置。

### 0.0.1, 2020-02-26

初步实现功能。

- [x] bug: win平台上传的图片路径不正确，斜杠反了。

**Enjoy!**
