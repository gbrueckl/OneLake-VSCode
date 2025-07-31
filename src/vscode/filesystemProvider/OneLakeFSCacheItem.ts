import * as vscode from 'vscode';

import { ThisExtension } from '../../ThisExtension';
import { OneLakeFSUri } from './OneLakeFSUri';
import { LoadingState } from './_types';
import { Helper } from '../../helpers/Helper';
import { OneLakeFSCache } from './OneLakeFSCache';
import { OneLakeApiService } from '../../onelake/OneLakeApiService';

export class OneLakeFSCacheItem {

	protected _uri: OneLakeFSUri;
	protected _loadingStateStats: LoadingState = "not_loaded";
	protected _loadingStateChildren: LoadingState = "not_loaded";
	protected _stats: vscode.FileStat | undefined;
	protected _children: [string, vscode.FileType][] | undefined;
	protected _content: Uint8Array | undefined;
	protected _apiResponse: any;
	protected _isLocalOnly: boolean = false;
	protected _parent: OneLakeFSCacheItem;

	constructor(uri: OneLakeFSUri) {
		this._uri = uri;
		this._loadingStateStats = "not_loaded";
		this._loadingStateChildren = "not_loaded";
	}

	public initializeEmpty(apiResponse: any = undefined): void {
		this._loadingStateStats = "loaded";
		this._stats = {
			type: vscode.FileType.Directory,
			ctime: undefined,
			mtime: undefined,
			size: undefined
		};

		this._loadingStateChildren = "loaded";
		this._children = [];

		this._apiResponse = apiResponse;
	}

	get OneLakeUri(): OneLakeFSUri {
		return this._uri
	}

	get uri(): vscode.Uri {
		return this.OneLakeUri.uri;
	}

	getApiResponse<T>(): T {
		return this._apiResponse as T;
	}

	get loadingStateStats(): LoadingState {
		return this._loadingStateStats;
	}

	set loadingStateStats(value: LoadingState) {
		this._loadingStateStats = value;
	}

	get loadingStateChildren(): LoadingState {
		return this._loadingStateChildren;
	}

	set loadingStateChildren(value: LoadingState) {
		this._loadingStateChildren = value;
	}


	get parent(): OneLakeFSCacheItem {
		return OneLakeFSCache.getCacheItem(new OneLakeFSUri(Helper.parentUri(this.uri)));
	}

	public async stats(): Promise<vscode.FileStat | undefined> {
		if (this.loadingStateStats == "not_loaded") {
			this.loadingStateStats = "loading";

			ThisExtension.log(`Loading OneLake URI Stats ${this.OneLakeUri.uri.toString()} ...`);
			const initialized = await OneLakeApiService.Initialization();
			if (initialized) {
				await this.loadStatsFromApi();
				this.loadingStateStats = "loaded";
			}
			else {
				this.loadingStateStats = "not_loaded";
			}
		}
		else if (this.loadingStateStats == "loading") {
			ThisExtension.logDebug(`OneLake URI Stats for ${this.OneLakeUri.uri.toString()} are loading in other process - waiting ... `);
			await Helper.awaitCondition(async () => this.loadingStateStats != "loading", 10000, 500);
			ThisExtension.logDebug(`OneLake URI Stats for ${this.OneLakeUri.uri.toString()} successfully loaded in other process!`);
		}
		return this._stats;
	}

	public async readDirectory(): Promise<[string, vscode.FileType][] | undefined> {
		if (this.loadingStateChildren == "not_loaded") {
			this.loadingStateChildren = "loading";

			ThisExtension.log(`Loading OneLake URI Children ${this.OneLakeUri.uri.toString()} ...`);
			const initialized = await OneLakeApiService.Initialization();
			if (initialized) {
				await this.loadChildrenFromApi();
				this.loadingStateChildren = "loaded";
			}
			else {
				this.loadingStateChildren = "not_loaded";
			}
		}
		else if (this.loadingStateChildren == "loading") {
			ThisExtension.logDebug(`OneLake URI Children for ${this.OneLakeUri.uri.toString()} are loading in other process - waiting ... `);
			await Helper.awaitCondition(async () => this.loadingStateChildren != "loading", 10000, 500);

			// @ts-ignore TS does not know that 'this.loadingStateChildren' is changed by the async call above
			if (this.loadingStateChildren == "loaded") {
				ThisExtension.logDebug(`OneLake URI Children for ${this.OneLakeUri.uri.toString()} successfully loaded in other process!`);
			}
			else {
				ThisExtension.logDebug(`OneLake URI Children for ${this.OneLakeUri.uri.toString()} failed to load in other process within 10 seconds!`);
				ThisExtension.logDebug(`Resetting loading state to 'not_loaded' ... `);
				this.loadingStateChildren = "not_loaded";
			}
		}
		return this._children;
	}

	public async readFile(): Promise<Uint8Array | undefined> {
		throw vscode.FileSystemError.NoPermissions("OneLake is currently read-only!");
	}

	async writeFile(content: Uint8Array, options: { create: boolean, overwrite: boolean }): Promise<void> {
		throw vscode.FileSystemError.NoPermissions("OneLake is currently read-only!");
	}

	public async loadChildrenFromApi<T>(): Promise<void> {
		throw vscode.FileSystemError.NoPermissions("Method not implemented.");
	}

	public async loadStatsFromApi<T>(): Promise<void> {
		throw vscode.FileSystemError.NoPermissions("Method not implemented.");
	}

	public addChild(name: string, type: vscode.FileType): void {
		if (!this._children) {
			this._children = [];
		}
		this._children.push([name, type]);
	}

	public removeChild(name: string): void {
		if (this._children) {
			this._children = this._children.filter((value) => value[0] != name);
		}
	}
}
