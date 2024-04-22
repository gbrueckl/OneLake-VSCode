import * as vscode from 'vscode';

import { OneLakeFSCacheItem } from './OneLakeFSCacheItem';
import { OneLakeFSUri } from './OneLakeFSUri';
import { OneLakeApiService } from '../../onelake/OneLakeApiService';


export class OneLakeFSItem extends OneLakeFSCacheItem {
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
			const response = await OneLakeApiService.get(this._uri.apiPath);
			this._apiResponse = response.success;
			this._children = [];
			for (let apiItem of this._apiResponse) {
				this._children.push([apiItem.displayName, vscode.FileType.Directory]);
			}
		}
	}
}