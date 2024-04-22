'use strict';

import * as vscode from 'vscode';

import { ThisExtension } from './ThisExtension';
import { OneLakeFileSystemProvider } from './vscode/filesystemProvider/OneLakeFileSystemProvider';
import { OneLakeFSCache } from './vscode/filesystemProvider/OneLakeFSCache';


export async function activate(context: vscode.ExtensionContext) {

	await ThisExtension.initializeLogger(context);

	const prevInstalledVersion = context.globalState.get<vscode.Extension<any>>("onelake-vscode.extension.installed", undefined);
	if (!prevInstalledVersion || prevInstalledVersion.packageJSON.version !== context.extension.packageJSON.version) {
		context.globalState.update("onelake-vscode.extension.installed", context.extension);
		const action = vscode.window.showInformationMessage(`PowerBI VSCode Extension updated to version ${context.extension.packageJSON.version}`, "Change Log");

		action.then((value) => {
			if (value == "Change Log") {
				vscode.env.openExternal(vscode.Uri.parse(context.extension.packageJSON.repository.url + "/blob/main/CHANGELOG.md"));
			}
		});
	}

	// some of the following code needs the context before the initialization already
	ThisExtension.extensionContext = context;

	// Fabric FileSystemProvider
	OneLakeFileSystemProvider.register(context);

	vscode.commands.registerCommand('OneLake.reloadFromOneLake',
		(uri) => OneLakeFSCache.reloadFromOneLake(uri)
	);

	vscode.commands.registerCommand('OneLake.initialize', async () => {
		let isValidated: boolean = await ThisExtension.initialize(context)
		if (!isValidated) {
			ThisExtension.log("Issue initializing extension - Please update OneLake settings and restart VSCode!");
			vscode.window.showErrorMessage("Issue initializing extension - Please update OneLake settings and restart VSCode!");
		}
		return isValidated;
	}
	);

	vscode.commands.executeCommand('OneLake.initialize');
}


export function deactivate() {
	ThisExtension.cleanUp();
}