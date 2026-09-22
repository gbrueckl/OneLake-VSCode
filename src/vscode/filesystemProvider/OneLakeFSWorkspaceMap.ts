import * as vscode from 'vscode';

import { FabricWorkspace, OneLakeApiService } from '../../onelake/OneLakeApiService';

/** Maps the friendly workspace segment used in an onelake: URI to its immutable DFS workspace ID. */
export abstract class OneLakeFSWorkspaceMap {
	private static readonly workspaces = new Map<string, string>();
	private static loaded = false;

	public static async load(): Promise<FabricWorkspace[]> {
		const workspaces = await OneLakeApiService.getWorkspaces();
		this.workspaces.clear();
		for (const workspace of workspaces) {
			this.workspaces.set(workspace.displayName, workspace.id);
			this.workspaces.set(workspace.id, workspace.id);
		}
		this.loaded = true;
		return workspaces;
	}

	public static async resolve(displayName: string): Promise<string> {
		if (!this.loaded) {
			await this.load();
		}
		const workspaceId = this.workspaces.get(displayName);
		if (!workspaceId) {
			throw vscode.FileSystemError.FileNotFound(vscode.Uri.parse(`onelake:/${displayName}`));
		}
		return workspaceId;
	}

	public static clear(): void {
		this.workspaces.clear();
		this.loaded = false;
	}
}
