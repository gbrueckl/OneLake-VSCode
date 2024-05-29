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
		if (!this._stats) {
			const response = await OneLakeApiService.head<Headers>(this._uri.apiPath);

			// for remote tenants the HEAD call does not always work 
			// if we are on item-Level (2 parts in the path) and the HEAD call fails we assume it is a directory
			if((!response || response["error"]) && this._uri.apiPath.split("/").length == 3) {
				this._stats = {
					type: vscode.FileType.Directory,
					ctime: undefined,
					mtime: undefined,
					size: undefined
				};
				return;
			}
			this._stats = {
				type: response.get("x-ms-resource-type") == 'directory' ? vscode.FileType.Directory : vscode.FileType.File,
				ctime: Date.parse(response.get("x-ms-creation-time")),//'Thu, 18 Jan 2024 12:57:08 GMT'
				mtime: Date.parse(response.get("last-modified")),
				size: parseInt(response.get("content-length"))
			};
		}
	}

	public async loadChildrenFromApi<T>(): Promise<void> {
		if (!this._children) {
			const params = {
				"resource": "filesystem",
				"recursive": false,
				"directory": encodeURI(this.OneLakeUri.directory)
			}
			const response = await OneLakeApiService.getList(this.OneLakeUri.fileSystem, params, "paths");
			this._apiResponse = response;
			this._children = [];
			for (let apiItem of this._apiResponse) {
				this._children.push([apiItem.name.split("/").pop(), apiItem.isDirectory == 'true' ? vscode.FileType.Directory : vscode.FileType.File]);
			}
		}
	}

	public async readFile(): Promise<Uint8Array | undefined> {
		if(!this._content) {
			const response = await OneLakeApiService.get(this._uri.apiPath, undefined, false, true);

			this._content = Buffer.from(await response.arrayBuffer());
		}
		return this._content;
	}

	async writeFile(content: Uint8Array, options: { create: boolean, overwrite: boolean }): Promise<void> {
		throw new Error("Method not implemented.");
	}
}