import * as vscode from 'vscode';

import { ENVIRONMENT } from '@env/env';

import { OneLakeConfiguration } from './vscode/configuration/OneLakeConfiguration';
import { OneLakeFileSystemProvider } from './vscode/filesystemProvider/OneLakeFileSystemProvider';
import { OneLakeApiService } from './onelake/OneLakeApiService';
import { OneLakeFSCache } from './vscode/filesystemProvider/OneLakeFSCache';


// https://vshaxe.github.io/vscode-extern/vscode/TreeDataProvider.html
export abstract class ThisExtension {

	private static _context: vscode.ExtensionContext;
	private static _isValidated: boolean = false;
	private static _logger: vscode.OutputChannel;


	private static _oneLakeFileSystemProvider: OneLakeFileSystemProvider;

	static get rootUri(): vscode.Uri {
		return this.extensionContext.extensionUri;
	}

	static get extensionContext(): vscode.ExtensionContext {
		return this._context;
	}

	static set extensionContext(value: vscode.ExtensionContext) {
		this._context = value;
	}

	static get secrets(): vscode.SecretStorage {
		return this.extensionContext.secrets;
	}

	static get RefreshAfterUpDownload(): boolean {
		return true;
	}

	static get IsValidated(): boolean {
		return this._isValidated;
	}

	static async initializeLogger(context: vscode.ExtensionContext): Promise<void> {
		if (!this._logger) {
			this._logger = vscode.window.createOutputChannel("OneLake.VSCode");
			this.log("OneLake Logger initialized!");

			context.subscriptions.push(this._logger);
		}
	}

	static async initialize(context: vscode.ExtensionContext): Promise<boolean> {
		try {
			this.log(`Loading VS Code extension '${context.extension.packageJSON.displayName}' (${context.extension.id}) version ${context.extension.packageJSON.version} ...`);
			this.log(`If you experience issues please open a ticket at ${context.extension.packageJSON.qna}`);
			this._context = context;

			let config = OneLakeConfiguration;
			await OneLakeApiService.initialize(
				config.tenantId,
				config.clientId
			);

			OneLakeFSCache.initialize()

			await this.setContext();
		} catch (error) {
			return false;
		}

		return true;
	}

	private static async setContext(): Promise<void> {
		// we hide the Connections Tab as we load all information from the Databricks Extension
		vscode.commands.executeCommand(
			"setContext",
			"oneLake.isInBrowser",
			this.isInBrowser
		);
	}

	static cleanUp(): void {

	}

	static log(text: string, newLine: boolean = true): void {
		if (!this._logger) {
			vscode.window.showErrorMessage(text);
		}
		if (newLine) {
			this._logger.appendLine(text);
		}
		else {
			this._logger.append(text);
		}
	}

	static logDebug(text: string, newLine: boolean = true): void {
		if (!this._logger) {
			vscode.window.showErrorMessage(text);
		}
		if (newLine) {
			this._logger.appendLine("DEBUG: " + text);
		}
		else {
			this._logger.append("DEBUG: " + text);
		}
	}

	static set OneLakeFileSystemProvider(provider: OneLakeFileSystemProvider) {
		this._oneLakeFileSystemProvider = provider;
	}
	static get OneLakeFileSystemProvider(): OneLakeFileSystemProvider {
		return this._oneLakeFileSystemProvider;
	}

	static get isInBrowser(): boolean {
		return ENVIRONMENT == "web";
	}

	static get useProxy(): boolean {
		let httpProxySupport: string = vscode.workspace.getConfiguration("http").get<string>("http.proxyStrictSSL");

		// only check if proxySupport is explicitly set to "off"
		if (httpProxySupport == "off") {
			return false;
		}

		if (httpProxySupport == "on") {
			return true;
		}

		return undefined;
	}

	static get useStrictSSL(): boolean {
		let httpProxyStrictSSL: boolean = vscode.workspace.getConfiguration("http").get<boolean>("http.proxyStrictSSL");

		// check if Strict Proxy SSL is NOT enabled
		if (httpProxyStrictSSL) {
			this.log('Strict Proxy SSL verification enabled due to setting "http.proxyStrictSSL": true !');
		}
		else {
			this.log('Strict Proxy SSL verification disabled due to setting "http.proxyStrictSSL": false !');
		}

		return httpProxyStrictSSL;
	}

	static PushDisposable(item: any) {
		this.extensionContext.subscriptions.push(item);
	}
}

