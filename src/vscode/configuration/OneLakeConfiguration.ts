import * as vscode from 'vscode';

export abstract class OneLakeConfiguration {
	static get tenantId(): string { return this.getValue("tenantId"); }
	static set tenantId(value: string) { this.setValue("tenantId", value); }

	static get clientId(): string { return this.getValue("clientId"); }
	static set clientId(value: string) { this.setValue("clientId", value); }

	static get config(): vscode.WorkspaceConfiguration {
		return vscode.workspace.getConfiguration("oneLake");
	}

	static getValue<T>(key: string): T {
		const value: T = this.config.get<T>(key);
		return value;
	}

	static setValue<T>(key: string, value: T, target: boolean | vscode.ConfigurationTarget = null): void {
		this.config.update(key, value, target);
	}

	static unsetValue(key: string, target: boolean | vscode.ConfigurationTarget = null): void {
		this.setValue(key, undefined, target);
	}
}