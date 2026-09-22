import * as vscode from 'vscode';

import { OneLakeApiService } from '../../onelake/OneLakeApiService';

export interface OneLakeWorkspaceItem {
	id: string;
	displayName: string;
	type: string;
}

/** Maps the friendly item segment used in an onelake: URI to its immutable DFS artifact ID. */
export abstract class OneLakeFSItemMap {
	private static readonly itemsByWorkspace = new Map<string, Map<string, string>>();

	public static async loadWorkspace(workspaceId: string): Promise<OneLakeWorkspaceItem[]> {
		const items = await OneLakeApiService.getWorkspaceItems(workspaceId);
		const map = new Map<string, string>();
		for (const item of items) {
			const displaySegment = `${item.displayName}.${item.type.toLowerCase()}`;
			map.set(displaySegment, item.id);
			map.set(item.id, item.id);
		}
		this.itemsByWorkspace.set(workspaceId, map);
		return items;
	}

	public static async resolve(workspaceId: string, displaySegment: string): Promise<string> {
		let map = this.itemsByWorkspace.get(workspaceId);
		if (!map) {
			await this.loadWorkspace(workspaceId);
			map = this.itemsByWorkspace.get(workspaceId);
		}
		const itemId = map?.get(displaySegment);
		if (!itemId) {
			throw vscode.FileSystemError.FileNotFound(vscode.Uri.parse(`onelake:/${workspaceId}/${displaySegment}`));
		}
		return itemId;
	}

	public static clearWorkspace(workspaceId: string): void {
		this.itemsByWorkspace.delete(workspaceId);
	}
}
