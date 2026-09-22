import * as vscode from 'vscode';

import { OneLakeFSCacheItem } from './OneLakeFSCacheItem';
import { OneLakeFSUri } from './OneLakeFSUri';
import { OneLakeApiService } from '../../onelake/OneLakeApiService';
import { OneLakeFSWorkspaceMap } from './OneLakeFSWorkspaceMap';


export class OneLakeFSRoot extends OneLakeFSCacheItem {
	constructor(uri: OneLakeFSUri) {
		super(uri);
	}

	get parent(): OneLakeFSCacheItem {
		return undefined;
	}

	public async loadStatsFromApi<T>(): Promise<void> {
		this._stats = {
			type: vscode.FileType.Directory,
			ctime: undefined,
			mtime: undefined,
			size: undefined
		};
	}

	public async loadChildrenFromApi<T>(): Promise<void> {
		if (!this._children) {
			const [response, fabricWorkspaces] = await Promise.all([
				OneLakeApiService.getList("/", {"resource":"account"}, "fileSystems"),
				OneLakeFSWorkspaceMap.load()
			]);
			this._apiResponse = response;
			const fabricWorkspacesById = new Map(fabricWorkspaces.map(workspace => [workspace.id, workspace]));
			this._children = [];
			for (let apiItem of this._apiResponse) {
				const workspace = fabricWorkspacesById.get(apiItem.name) ?? fabricWorkspaces.find(fabricWorkspace => fabricWorkspace.displayName === apiItem.name);
				if (workspace) {
					this._children.push([workspace.displayName, vscode.FileType.Directory]);
				}
			}
		}
	}
}
