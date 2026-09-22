import * as vscode from 'vscode';

import { Helper } from '../../helpers/Helper';

import { ONELAKE_SCHEME } from './OneLakeFileSystemProvider';
import { CacheItemKey, OneLakeFSCache } from './OneLakeFSCache';
import { OneLakeFSCacheItem } from './OneLakeFSCacheItem';
import { OneLakeFSItem } from './OneLakeFSItem';
import { OneLakeFSRoot } from './OneLakeFSRoot';
import { OneLakeFSWorkspace } from './OneLakeFSWorkspace';
import { ThisExtension } from '../../ThisExtension';
import { OneLakeFSItemMap } from './OneLakeFSItemMap';
import { OneLakeFSWorkspaceMap } from './OneLakeFSWorkspaceMap';

export enum OneLakeUriType {
	root = 0,
	workspace = 1,
	item = 2,
	path = 3
}

export class OneLakeFSUri {
	uri: vscode.Uri;

	workspace?: string;
	item?: string;
	itemType?: string;
	path?: string;
	private _apiItem?: string;
	private _apiWorkspace?: string;

	uriType: OneLakeUriType;

	/*
	onelake://workspaces/<item.itemType>/<path>
	*/
	constructor(uri: vscode.Uri) {
		let uriString = uri.toString();

		this.uri = vscode.Uri.parse(uriString.replace("//", "/"));

		if (!this.isValid) {
			throw vscode.FileSystemError.Unavailable("Invalid OneLake URI!");
		}
		
		const paths = this.uri.path.split("/").filter((path) => path.length > 0);

		if (paths.length >= 1) {
			this.workspace = paths[0];
		}
		if (paths.length >= 2) {
			this.item = paths[1];
			const itemTypeSeparator = this.item.lastIndexOf('.');
			this.itemType = itemTypeSeparator >= 0 ? this.item.substring(itemTypeSeparator + 1) : undefined;
		}
		if (paths.length >= 3) {
			this.path = paths.slice(2).join("/");
		}

		this.uriType = Math.min(paths.length, OneLakeUriType.path) as OneLakeUriType;
	}

	static async getInstance(uri: vscode.Uri, skipValidation: boolean = false): Promise<OneLakeFSUri> {
		const oneLakeUri = new OneLakeFSUri(uri);

		if (!oneLakeUri.isValid && !skipValidation) {
			throw vscode.FileSystemError.FileNotFound(uri);
		}
		if (oneLakeUri.workspace) {
			oneLakeUri._apiWorkspace = await OneLakeFSWorkspaceMap.resolve(oneLakeUri.workspace);
		}
		if (oneLakeUri._apiWorkspace && oneLakeUri.item) {
			oneLakeUri._apiItem = await OneLakeFSItemMap.resolve(oneLakeUri._apiWorkspace, oneLakeUri.item);
		}

		return oneLakeUri;
	}

	get isValid(): boolean {
		if (!(this.uri.scheme == ONELAKE_SCHEME)) {
			return false;
		}
		if (this.uri.path.startsWith("/.")) {
			return false;
		}

		if (OneLakeFSCache.hasCacheItem(this)) {
			return true;
		}

		return true;
	}

	async getParent(): Promise<OneLakeFSUri> {
		return await OneLakeFSUri.getInstance(Helper.parentUri(this.uri));
	}

	async getCacheItem<T = OneLakeFSCacheItem>(): Promise<T> {
		switch (this.uriType) {
			case OneLakeUriType.root:
				return new OneLakeFSRoot(this) as T;
			case OneLakeUriType.workspace:
				return new OneLakeFSWorkspace(this) as T;
			case OneLakeUriType.item:
			case OneLakeUriType.path:
				return new OneLakeFSItem(this) as T;
			default:
				ThisExtension.log("getCacheItem() - Invalid URI type: " + this.uriType);
				throw vscode.FileSystemError.FileNotFound(this.uri);
		}
	}

	get cacheItemKey(): CacheItemKey {
		return this.uri.toString().replace("//", "/");
	}

	get apiPath(): string {
		const path = this.path ? this.path.split('/') : [];
		return '/' + [this._apiWorkspace ?? this.workspace, this._apiItem ?? this.item, ...path].filter(Boolean).join('/');
	}

	get apiWorkspace(): string {
		return this._apiWorkspace ?? this.workspace;
	}

	get fileSystem():string {
		return this.apiWorkspace.replace(" ", "-");
	}

	get directory(): string {
		const path = this.path ? this.path.split('/') : [];
		return encodeURI("/" + [this._apiItem ?? this.item, ...path].filter(Boolean).join('/'));
	}
}
