import * as vscode from 'vscode';

import { ThisExtension } from '../../ThisExtension';

import { OneLakeFSCacheItem } from './OneLakeFSCacheItem';
import { OneLakeFSUri } from './OneLakeFSUri';

export type CacheItemKey = string;

export abstract class OneLakeFSCache {
	private static _cache: Map<string, OneLakeFSCacheItem> = new Map<CacheItemKey, OneLakeFSCacheItem>();

	public static async initialize(): Promise<void> {
		if (OneLakeFSCache._cache) {
			OneLakeFSCache._cache.clear();
		}
		else {
			OneLakeFSCache._cache = new Map<string, OneLakeFSCacheItem>();
		}
	}

	public static async stats(oneLakeUri: OneLakeFSUri): Promise<vscode.FileStat | undefined> {
		let item = OneLakeFSCache.getCacheItem(oneLakeUri);
		if (!item) {
			item = await OneLakeFSCache.addCacheItem(oneLakeUri);
		}

		const stats = await item.stats();

		if (!stats) {
			throw vscode.FileSystemError.FileNotFound(oneLakeUri.uri);
		}

		return stats;
	}

	public static async readDirectory(oneLakeUri: OneLakeFSUri): Promise<[string, vscode.FileType][] | undefined> {
		let item = OneLakeFSCache.getCacheItem(oneLakeUri);
		if (!item) {
			item = await OneLakeFSCache.addCacheItem(oneLakeUri);
		}

		return item.readDirectory();
	}

	public static async readFile(oneLakeUri: OneLakeFSUri): Promise<Uint8Array> {
		let item = OneLakeFSCache.getCacheItem(oneLakeUri);
		if (!item) {
			item = await OneLakeFSCache.addCacheItem(oneLakeUri);
		}

		return item.readFile();
	}

	public static async writeFile(oneLakeUri: OneLakeFSUri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): Promise<void> {
		let item = OneLakeFSCache.getCacheItem(oneLakeUri);
		if (!item) {
			item = await OneLakeFSCache.addCacheItem(oneLakeUri);
		}

		item.writeFile(content, options);
	}

	public static async reloadFromOneLake(resourceUri: vscode.Uri): Promise<void> {
		const oneLakeUri: OneLakeFSUri = await OneLakeFSUri.getInstance(resourceUri);

		for (let key of OneLakeFSCache._cache.keys()) {
			if (key.startsWith(oneLakeUri.cacheItemKey)) {
				OneLakeFSCache._cache.delete(key);
			}
		}

		vscode.commands.executeCommand("workbench.files.action.refreshFilesExplorer", resourceUri);
	}

	public static async addCacheItem(oneLakeUri: OneLakeFSUri, cacheItem: OneLakeFSCacheItem = undefined): Promise<OneLakeFSCacheItem> {
		if (!cacheItem) {
			cacheItem = await oneLakeUri.getCacheItem();
		}
		OneLakeFSCache._cache.set(oneLakeUri.cacheItemKey, cacheItem);

		return cacheItem;
	}

	public static removeCacheItem(item: OneLakeFSCacheItem): boolean {
		return OneLakeFSCache._cache.delete(item.OneLakeUri.cacheItemKey);
	}

	public static getCacheItem(oneLakeUri: OneLakeFSUri): OneLakeFSCacheItem {
		return OneLakeFSCache._cache.get(oneLakeUri.cacheItemKey);
	}


	public static hasCacheItem(item: OneLakeFSUri): boolean {
		return OneLakeFSCache._cache.has(item.cacheItemKey);
	}
}
