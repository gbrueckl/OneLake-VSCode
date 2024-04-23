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
				"directory": this.uri.path
			}
			const response = await OneLakeApiService.getList(this._uri.apiPath, params, "paths");
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