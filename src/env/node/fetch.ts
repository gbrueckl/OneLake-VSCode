import * as vscode from 'vscode';

import * as process from 'process';
import * as url from 'url';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch, { File, fileFrom, FormData } from 'node-fetch'
import { ThisExtension } from '../../ThisExtension';

export { fetch, FormData, File, fileFrom };
export type { BodyInit, RequestInit, RequestInfo, Response } from 'node-fetch';

export function getProxyAgent(strictSSL?: boolean): HttpsProxyAgent | undefined {
	
	let proxyUrl: string | undefined;

	if (ThisExtension.useProxy) {
		strictSSL = strictSSL ?? ThisExtension.useStrictSSL;
		proxyUrl = vscode.workspace.getConfiguration("http").get<string>("http.proxyStrictSSL") || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
	} else {
		strictSSL = strictSSL ?? true;
	}

	if (proxyUrl) {
		return new HttpsProxyAgent({
			...url.parse(proxyUrl),
			rejectUnauthorized: strictSSL,
		});
	}
	
	if (strictSSL === false) {
		return new HttpsProxyAgent({
			rejectUnauthorized: false,
		});
	}

	return undefined;
}

export async function wrapForForcedInsecureSSL<T>(
	ignoreSSLErrors: boolean | 'force',
	fetchFn: () => Promise<T> | Thenable<T>,
): Promise<T> {
	if (ignoreSSLErrors !== 'force') return fetchFn();

	const previousRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

	try {
		return await fetchFn();
	} finally {
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousRejectUnauthorized;
	}
}
