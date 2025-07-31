import * as vscode from 'vscode';

import { ThisExtension } from '../../ThisExtension';
import { OneLakeFSUri } from './OneLakeFSUri';
import { OneLakeFSCache } from './OneLakeFSCache';
import { OneLakeFSCacheItem } from './OneLakeFSCacheItem';

export const ONELAKE_SCHEME: string = "onelake";


export class OneLakeFileSystemProvider implements vscode.FileSystemProvider, vscode.Disposable {
	private static _cache: Map<string, OneLakeFSCacheItem> = new Map<string, OneLakeFSCacheItem>();


	constructor() {	
		if (OneLakeFileSystemProvider._cache) {
			OneLakeFileSystemProvider._cache.clear();
		}
		else {
			OneLakeFileSystemProvider._cache = new Map<string, OneLakeFSCacheItem>();
		}
	}
	

	public static async register(context: vscode.ExtensionContext) {
		const fsp = new OneLakeFileSystemProvider()
		context.subscriptions.push(vscode.workspace.registerFileSystemProvider(ONELAKE_SCHEME, fsp, { isCaseSensitive: true }));

		ThisExtension.OneLakeFileSystemProvider = fsp;
	}

	// -- manage file metadata
	async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
		const oneLakeUri: OneLakeFSUri = await OneLakeFSUri.getInstance(uri);

		if(!oneLakeUri.isValid) {
			throw vscode.FileSystemError.FileNotFound(uri);
		}
		
		const stats = await OneLakeFSCache.stats(oneLakeUri);
		return stats;
	}

	async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
		const oneLakeUri: OneLakeFSUri = await OneLakeFSUri.getInstance(uri);

		if(!oneLakeUri.isValid) {
			throw vscode.FileSystemError.FileNotFound(uri);
		}

		const results = await OneLakeFSCache.readDirectory(oneLakeUri);
		return results;
	}

	// --- manage file contents
	async readFile(uri: vscode.Uri): Promise<Uint8Array> {
		const oneLakeUri: OneLakeFSUri = await OneLakeFSUri.getInstance(uri);

		const content = OneLakeFSCache.readFile(oneLakeUri);

		return content;
	}

	async writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): Promise<void> {
		const oneLakeUri: OneLakeFSUri = await OneLakeFSUri.getInstance(uri);

		await OneLakeFSCache.writeFile(oneLakeUri, content, options);

		this._fireSoon({ type: vscode.FileChangeType.Changed, uri });
	}

	async createDirectory(uri: vscode.Uri): Promise<void> {
		throw vscode.FileSystemError.NoPermissions("OneLake is currently read-only!");
	}
	async delete(uri: vscode.Uri, options: { readonly recursive: boolean; }): Promise<void> {
		throw vscode.FileSystemError.NoPermissions("OneLake is currently read-only!");
	}
	async rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { readonly overwrite: boolean; }): Promise<void> {
		throw vscode.FileSystemError.NoPermissions("OneLake is currently read-only!");
	}
	async copy?(source: vscode.Uri, destination: vscode.Uri, options: { readonly overwrite: boolean; }): Promise<void> {
		throw vscode.FileSystemError.NoPermissions("OneLake is currently read-only!");
	}

	/*
	// there is no improvements that we could do when copying files
	async copy(source: vscode.Uri, destination: vscode.Uri, options: { readonly overwrite: boolean; }): Promise<void> {
		
	}
	*/

	// --- manage file events
	private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
	private _bufferedEvents: vscode.FileChangeEvent[] = [];
	private _fireSoonHandle?: NodeJS.Timer;

	readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

	watch(_resource: vscode.Uri): vscode.Disposable {
		// ignore, fires for all changes...
		return new vscode.Disposable(() => { });
	}

	public _fireSoon(...events: vscode.FileChangeEvent[]): void {
		this._bufferedEvents.push(...events);

		if (this._fireSoonHandle) {
			clearTimeout(this._fireSoonHandle);
		}

		this._fireSoonHandle = setTimeout(() => {
			this._emitter.fire(this._bufferedEvents);
			this._bufferedEvents.length = 0;
		}, 5);
	}

	public async dispose(): Promise<void> {
		this._emitter.dispose();
	}
}
