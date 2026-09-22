import * as vscode from 'vscode';

import { OneLakeFSCacheItem } from './OneLakeFSCacheItem';
import { OneLakeFSUri } from './OneLakeFSUri';
import { OneLakeApiError, OneLakeApiService } from '../../onelake/OneLakeApiService';
import { OneLakeConfiguration } from '../configuration/OneLakeConfiguration';


export class OneLakeFSItem extends OneLakeFSCacheItem {
	private _eTag: string | undefined;
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
			if (!response || response['error']) {
				const status = response?.['error']?.status;
				if (status === 404) {
					throw vscode.FileSystemError.FileNotFound(this.uri);
				}
				throw vscode.FileSystemError.Unavailable(response?.['error']?.message ?? 'Unable to retrieve OneLake file metadata.');
			}
			this._stats = {
				type: response.get("x-ms-resource-type") == 'directory' ? vscode.FileType.Directory : vscode.FileType.File,
				ctime: Date.parse(response.get("x-ms-creation-time")),//'Thu, 18 Jan 2024 12:57:08 GMT'
				mtime: Date.parse(response.get("last-modified")),
				size: parseInt(response.get("content-length"))
			};
			this._eTag = response.get('etag') ?? undefined;
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
			const stats = await this.stats();
			if (stats?.type === vscode.FileType.Directory) {
				throw vscode.FileSystemError.FileIsADirectory(this.uri);
			}
			const configuredMaxReadFileSizeMB = OneLakeConfiguration.getValue<number>('maxReadFileSizeMB');
			const configuredReadTimeoutSeconds = OneLakeConfiguration.getValue<number>('readTimeoutSeconds');
			const maxReadFileSizeMB = Number.isFinite(configuredMaxReadFileSizeMB) && configuredMaxReadFileSizeMB > 0 ? configuredMaxReadFileSizeMB : 50;
			const readTimeoutSeconds = Number.isFinite(configuredReadTimeoutSeconds) && configuredReadTimeoutSeconds > 0 ? configuredReadTimeoutSeconds : 30;
			try {
				this._content = await OneLakeApiService.getFile(this._uri.apiPath, true, {
					maxBytes: maxReadFileSizeMB * 1024 * 1024,
					timeoutMs: readTimeoutSeconds * 1000,
					ifMatch: this._eTag
				});
			} catch (error) {
				throw this.toFileSystemError(error);
			}
		}
		return this._content;
	}

	private toFileSystemError(error: unknown): vscode.FileSystemError {
		if (error instanceof OneLakeApiError) {
			const message = `${error.message}${error.requestId ? ` (request ID: ${error.requestId})` : ''}`;
			if (error.status === 404) return vscode.FileSystemError.FileNotFound(this.uri);
			if (error.status === 403) return vscode.FileSystemError.NoPermissions(message);
			return vscode.FileSystemError.Unavailable(message);
		}
		return vscode.FileSystemError.Unavailable(error instanceof Error ? error.message : 'Unable to read file from OneLake.');
	}

	async writeFile(content: Uint8Array, options: { create: boolean, overwrite: boolean }): Promise<void> {
		const restrictWritesToFiles = OneLakeConfiguration.getValue<boolean>('restrictWritesToFiles') ?? true;
		if (restrictWritesToFiles && this.OneLakeUri.path?.split('/')[0] !== 'Files') {
			throw vscode.FileSystemError.NoPermissions('OneLake write support is limited to paths under /Files. This path is read-only.');
		}

		let exists = false;
		try {
			const stats = await this.stats();
			exists = !!stats;
			if (stats?.type === vscode.FileType.Directory) {
				throw vscode.FileSystemError.FileIsADirectory(this.uri);
			}
		} catch (error) {
			if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
				exists = false;
			} else {
				throw error;
			}
		}

		if (!exists && !options.create) {
			throw vscode.FileSystemError.FileNotFound(this.uri);
		}
		if (exists && !options.overwrite) {
			throw vscode.FileSystemError.FileExists(this.uri);
		}

		const configuredWriteTimeoutSeconds = OneLakeConfiguration.getValue<number>('writeTimeoutSeconds');
		const writeTimeoutSeconds = Number.isFinite(configuredWriteTimeoutSeconds) && configuredWriteTimeoutSeconds > 0 ? configuredWriteTimeoutSeconds : 30;
		try {
			const headers = await OneLakeApiService.writeFile(this._uri.apiPath, content, {
				ifMatch: exists ? this._eTag : undefined,
				ifNoneMatch: exists ? undefined : '*',
				timeoutMs: writeTimeoutSeconds * 1000
			});
			this._content = Buffer.from(content);
			this._eTag = headers.get('etag') ?? undefined;
			this._stats = {
				type: vscode.FileType.File,
				ctime: this._stats?.ctime ?? Date.now(),
				mtime: Date.now(),
				size: content.byteLength
			};
			this.loadingStateStats = 'loaded';
		} catch (error) {
			throw this.toFileSystemError(error);
		}
	}
}
