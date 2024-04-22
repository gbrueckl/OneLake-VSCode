import * as vscode from 'vscode';

import { fetch,  RequestInit, Response, getProxyAgent } from '@env/fetch';

import { Helper, UniqueId } from '../helpers/Helper';
import { ThisExtension } from '../ThisExtension';

export abstract class OneLakeApiService {
	private static _isInitialized: boolean = false;
	private static _connectionTestRunning: boolean = false;
	private static _apiBaseUrl: string;
	private static _tenantId: string;
	private static _clientId: string;
	private static _authenticationProvider: string;
	private static _headers;
	private static _vscodeSession: vscode.AuthenticationSession;


	//#region Initialization
	static async initialize(
		apiBaseUrl: string = "https://onelake.dfs.fabric.microsoft.com/",
		tenantId: string = undefined,
		clientId: string = undefined,
		authenticationProvider: string = "microsoft"
	): Promise<boolean> {
		try {
			ThisExtension.log("Initializing OneLake API Service ...");

			vscode.authentication.onDidChangeSessions((event) => this._onDidChangeSessions(event));

			this._apiBaseUrl = Helper.trimChar(apiBaseUrl, '/');
			this._tenantId = tenantId;
			this._clientId = clientId;
			this._authenticationProvider = authenticationProvider;

			await this.refreshConnection();
		} catch (error) {
			this._connectionTestRunning = false;
			ThisExtension.log("ERROR: " + error);
			vscode.window.showErrorMessage(error);
			return false;
		}
	}

	private static async refreshConnection(): Promise<void> {
		this._vscodeSession = await this.getStorageSession();

		if (!this._vscodeSession || !this._vscodeSession.accessToken) {
			vscode.window.showInformationMessage("PowerBI / API: Please log in with your Microsoft account first!");
			return;
		}

		ThisExtension.log("Refreshing authentication headers ...");
		this._headers = {
			"Authorization": 'Bearer ' + this._vscodeSession.accessToken,
			"Content-Type": 'application/json',
			"Accept": 'application/json'
		}

		ThisExtension.log(`Testing new PowerBI API (${this._apiBaseUrl}) settings for user '${this.SessionUser}' (${this.SessionUserId}) ...`);
		this._connectionTestRunning = true;
		let workspaceList = await this.get("/", {"resource":"account", "recursive": false});
		this._connectionTestRunning = false;

		if (workspaceList.fileSystems.length > 0) {
			ThisExtension.log("OneLake API Service initialized!");
			this._isInitialized = true;
		}
		else {
			ThisExtension.log(JSON.stringify(workspaceList));
			throw new Error(`Invalid Configuration for OneLake API: Cannot access '${this._apiBaseUrl}' with given credentials'!`);
		}
	}

	public static async getStorageSession(): Promise<vscode.AuthenticationSession> {
		// we dont need to specify a clientId here as VSCode is a first party app and can use impersonation by default
		let session = await this.getAADAccessToken(["https://storage.azure.com/user_impersonation"], this._tenantId, this._clientId);
		return session;
	}

	private static async _onDidChangeSessions(event: vscode.AuthenticationSessionsChangeEvent) {
		if (event.provider.id === this._authenticationProvider) {
			ThisExtension.log("Session for provider '" + event.provider.label + "' changed - refreshing connections! ");

			await this.refreshConnection();
		}
	}

	public static async getAADAccessToken(scopes: string[], tenantId?: string, clientId?: string): Promise<vscode.AuthenticationSession> {
		//https://www.eliostruyf.com/microsoft-authentication-provider-visual-studio-code/

		if (!scopes.includes("offline_access")) {
			scopes.push("offline_access") // Required for the refresh token.
		}
		if (tenantId) {
			scopes.push("VSCODE_TENANT:" + tenantId);
		}

		if (clientId) {
			scopes.push("VSCODE_CLIENT_ID:" + clientId);
		}

		let session: vscode.AuthenticationSession = await vscode.authentication.getSession(this._authenticationProvider, scopes, { createIfNone: true });

		return session;
	}

	public static get SessionUserEmail(): string {
		if (this._vscodeSession) {
			const email = Helper.getFirstRegexGroup(/([\w\.]+@[\w-]+\.+[\w-]{2,5})/gm, this._vscodeSession.account.label);
			if (email) {
				return email;
			}
		}
		return "UNAUTHENTICATED";
	}

	public static get SessionUser(): string {
		if (this._vscodeSession) {
			return this._vscodeSession.account.label;
		}
		return "UNAUTHENTICATED";
	}

	public static get SessionUserId(): string {
		if (this._vscodeSession) {
			return this._vscodeSession.account.id;
		}
		return "UNAUTHENTICATED";
	}

	public static get TenantId(): string {
		return this._tenantId;
	}

	public static get ClientId(): string {
		return this._clientId;
	}

	public static get isInitialized(): boolean {
		return this._isInitialized;
	}

	public static async Initialization(): Promise<boolean> {
		// wait 5 minutes for the service to initialize
		return Helper.awaitCondition(async () => OneLakeApiService.isInitialized, 300000, 500);
	}

	//#endregion

	//#region Helpers
	private static async logResponse(response: any): Promise<void> {
		if (typeof response == "string") {
			ThisExtension.log("Response: " + response);
		}
		else {
			ThisExtension.log("Response: " + JSON.stringify(response));
		}
	}

	private static handleApiException(error: Error, showErrorMessage: boolean = false, raise: boolean = false): void {
		ThisExtension.log("ERROR: " + error.name);
		ThisExtension.log("ERROR: " + error.message);
		if (error.stack) {
			ThisExtension.log("ERROR: " + error.stack);
		}

		if (showErrorMessage) {
			vscode.window.showErrorMessage(error.message);
		}

		if (raise) {
			throw error;
		}
	}

	public static getHeaders(): HeadersInit {
		return this._headers;
	}

	public static getFullUrl(endpoint: string, params?: object): string {
		let baseItems = this._apiBaseUrl.split("/");
		let pathItems = endpoint.split("/").filter(x => x);

		let index = baseItems.indexOf(pathItems[0]);
		index = index == -1 ? undefined : index; // in case the item was not found, we append it to the baseUrl

		endpoint = (baseItems.slice(undefined, index).concat(pathItems)).join("/");

		let uri = vscode.Uri.parse(endpoint);

		if (params) {
			let urlParams = []
			for (let kvp of Object.entries(params)) {
				urlParams.push(`${kvp[0]}=${kvp[1] as number | string | boolean}`)
			}
			uri = uri.with({ query: urlParams.join('&') })
		}

		return uri.toString(true);
	}

	static async get<T = any>(endpoint: string, params: object = null, raiseError: boolean = false, raw: boolean = false): Promise<T> {
		if (!this._isInitialized && !this._connectionTestRunning) {
			ThisExtension.log("API has not yet been initialized! Please connect first!");
		}
		else {
			endpoint = this.getFullUrl(endpoint, params);
			if (params) {
				ThisExtension.log("GET " + endpoint + " --> " + JSON.stringify(params));
			}
			else {
				ThisExtension.log("GET " + endpoint);
			}

			try {
				const config: RequestInit = {
					method: "GET",
					headers: this._headers,
					agent: getProxyAgent()
				};
				let response: Response = await fetch(endpoint, config);

				if (raw) {
					return response as any as T;
				}
				let resultText = await response.text();
				let ret: T;

				if (response.ok) {
					if (!resultText || resultText == "") {
						ret = { "value": { "status": response.status, "statusText": response.statusText } } as T;
					}
					else {
						ret = JSON.parse(resultText) as T;
					}
				}
				else {
					if (!resultText || resultText == "") {
						ret = { "error": { "status": response.status, "statusText": response.statusText } } as T;
					}
					if (raiseError) {
						throw new Error(resultText);
					}
					else {
						ret = { "error": { "message": resultText, "status": response.status, "statusText": response.statusText } } as T;
					}
				}

				await this.logResponse(ret);
				return ret;
			} catch (error) {
				this.handleApiException(error, false, raiseError);

				return undefined;
			}
		}
	}

	static async getList<T = any[]>(endpoint: string, params: object = null, listProperty: string = "value"): Promise<T[]> {
		let response = await this.get<T>(endpoint, params, false);

		if (response["error"]) {
			return response["error"];
		}
		let ret: T[] = response[listProperty];

		/*
		while (response.success.continuationUri) {
			ret = ret.concat(response[listProperty]);
			response = await this.get<iFabricListResponse<T>>(response.success.continuationUri, undefined, false);

			if (response.error) {
				return { error: response.error };
			}
		}
		*/

		return ret;
	}

	public static async getFile(endpoint: string, raiseError: boolean = true): Promise<Buffer> {
		endpoint = this.getFullUrl(endpoint);
		
		try {
			const config: RequestInit = {
				method: "GET",
				headers: this._headers,
				agent: getProxyAgent()
			};
			let response: Response = await OneLakeApiService.get<Response>(endpoint, undefined, false, true);

			if (response.ok) {
				const blob = await response.blob();
				const buffer = await blob.arrayBuffer();
				const content = Buffer.from(buffer);

				return content;
			}
			else {
				let resultText = await response.text();
				if (raiseError) {
					throw new Error(resultText);
				}
			}
		} catch (error) {
			this.handleApiException(error, false, raiseError);

			return undefined;
		}
	}

	public static async downloadFile(endpoint: string, targetPath: vscode.Uri, raiseError: boolean = false): Promise<void> {
		const content = await OneLakeApiService.getFile(endpoint, raiseError);

		try {
			if (content) {
				vscode.workspace.fs.writeFile(targetPath, content);
			}
		}
		catch (error) {
			this.handleApiException(error, false, raiseError);

			return undefined;
		}
	}

	static async post<T = any>(endpoint: string, body: object, raiseError: boolean = false): Promise<T> {
		endpoint = this.getFullUrl(endpoint);
		ThisExtension.log("POST " + endpoint + " --> " + (JSON.stringify(body) ?? "{}"));

		try {
			const config: RequestInit = {
				method: "POST",
				headers: this._headers,
				body: JSON.stringify(body),
				agent: getProxyAgent()
			};
			let response: Response = await fetch(endpoint, config);

			let resultText = await response.text();
			let ret: T;

			if (response.ok) {
				if (!resultText || resultText == "") {
					ret = { "value": { "status": response.status, "statusText": response.statusText } } as T;
				}
				else {
					ret = JSON.parse(resultText) as T;
				}
			}
			else {
				if (!resultText || resultText == "") {
					ret = { "error": { "status": response.status, "statusText": response.statusText } } as T;
				}
				if (raiseError) {
					throw new Error(resultText);
				}
				else {
					ret = { "error": { "message": resultText, "status": response.status, "statusText": response.statusText } } as T;
				}
			}

			await this.logResponse(ret);
			return ret;
		} catch (error) {
			this.handleApiException(error, false, raiseError);

			return undefined;
		}
	}

	static async postImport<T = any>(endpoint: string, content: Buffer, datasetDisplayName: string, urlParams: object = {}, raiseError: boolean = false): Promise<T> {
		urlParams["datasetDisplayName"] = datasetDisplayName;

		endpoint = this.getFullUrl(endpoint, urlParams);
		ThisExtension.log("POST " + endpoint + " --> File: " + JSON.stringify(urlParams));

		try {
			// we manally build the formData as the node-fetch API for formData does not work with the PowerBI API
			var boundary = "----WebKitFormBoundarykRourla9fGPRMwf6";
			var data = "";
			data += "--" + boundary + "\r\n";
			data += "Content-Disposition: form-data; name=\"file\"; filename=\"" + datasetDisplayName + "\"\r\n";
			data += "Content-Type:application/octet-stream\r\n\r\n";
			var payload = Buffer.concat([
				Buffer.from(data, "utf8"),
				content,
				Buffer.from("\r\n--" + boundary + "--\r\n", "utf8"),
			]);

			let headers = { ...this._headers };
			headers["Content-Type"] = "multipart/form-data; boundary=" + boundary;
			delete headers["Content-Length"];

			const config: RequestInit = {
				method: "POST",
				headers: headers,
				body: payload,
				agent: getProxyAgent()
			};
			let response: Response = await fetch(endpoint, config);

			let resultText = await response.text();
			let ret: T;

			await this.logResponse(resultText);
			if (response.ok) {
				if (!resultText || resultText == "") {
					ret = { "value": { "status": response.status, "statusText": response.statusText } } as T;
				}
				else {
					ret = JSON.parse(resultText);
				}
			}
			else {
				if (!resultText || resultText == "") {
					ret = { "error": { "status": response.status, "statusText": response.statusText } } as T;
				}
				throw new Error(resultText);
			}

			this.logResponse(ret);
			return ret;
		} catch (error) {
			this.handleApiException(error, false, raiseError);

			return undefined;
		}
	}

	static async importFile<T = any>(endpoint: string, uri: vscode.Uri, fileName: string, urlParams: object = {}, raiseError: boolean = false): Promise<T> {
		try {
			const binary: Uint8Array = await vscode.workspace.fs.readFile(uri);
			const buffer = Buffer.from(binary);

			return await this.postImport<T>(endpoint, buffer, fileName, urlParams, raiseError);
		} catch (error) {
			this.handleApiException(error, false, raiseError);

			return undefined;
		}
	}

	static async put<T = any>(endpoint: string, body: object, raiseError: boolean = false): Promise<T> {
		endpoint = this.getFullUrl(endpoint);
		ThisExtension.log("PUT " + endpoint + " --> " + (JSON.stringify(body) ?? "{}"));

		try {
			const config: RequestInit = {
				method: "PUT",
				headers: this._headers,
				body: JSON.stringify(body),
				agent: getProxyAgent()
			};
			let response: Response = await fetch(endpoint, config);

			let resultText = await response.text();
			let ret: T;

			if (response.ok) {
				if (!resultText || resultText == "") {
					ret = { "value": { "status": response.status, "statusText": response.statusText } } as T;
				}
				else {
					ret = JSON.parse(resultText) as T;
				}
			}
			else {
				if (!resultText || resultText == "") {
					ret = { "error": { "status": response.status, "statusText": response.statusText } } as T;
				}
				if (raiseError) {
					throw new Error(resultText);
				}
				else {
					ret = { "error": { "message": resultText, "status": response.status, "statusText": response.statusText } } as T;
				}
			}

			await this.logResponse(ret);
			return ret;
		} catch (error) {
			this.handleApiException(error, false, raiseError);

			return undefined;
		}
	}

	static async patch<T = any>(endpoint: string, body: object, raiseError: boolean = false): Promise<T> {
		endpoint = this.getFullUrl(endpoint);
		ThisExtension.log("PATCH " + endpoint + " --> " + (JSON.stringify(body) ?? "{}"));

		try {
			const config: RequestInit = {
				method: "PATCH",
				headers: this._headers,
				body: JSON.stringify(body),
				agent: getProxyAgent()
			};
			let response: Response = await fetch(endpoint, config);

			let resultText = await response.text();
			let ret: T;

			if (response.ok) {
				if (!resultText || resultText == "") {
					ret = { "value": { "status": response.status, "statusText": response.statusText } } as T;
				}
				else {
					ret = JSON.parse(resultText) as T;
				}
			}
			else {
				if (!resultText || resultText == "") {
					ret = { "error": { "status": response.status, "statusText": response.statusText } } as T;
				}
				if (raiseError) {
					throw new Error(resultText);
				}
				else {
					ret = { "error": { "message": resultText, "status": response.status, "statusText": response.statusText } } as T;
				}
			}

			await this.logResponse(ret);
			return ret;
		} catch (error) {
			this.handleApiException(error, false, raiseError);

			return undefined;
		}
	}

	static async delete<T = any>(endpoint: string, body: object, raiseError: boolean = false): Promise<T> {
		endpoint = this.getFullUrl(endpoint);
		ThisExtension.log("DELETE " + endpoint + " --> " + (JSON.stringify(body) ?? "{}"));

		try {
			const config: RequestInit = {
				method: "DELETE",
				headers: this._headers,
				body: JSON.stringify(body),
				agent: getProxyAgent()
			};
			let response: Response = await fetch(endpoint, config);

			let resultText = await response.text();
			let ret: T;

			if (response.ok) {
				if (!resultText || resultText == "") {
					ret = { "value": { "status": response.status, "statusText": response.statusText } } as T;
				}
				else {
					ret = JSON.parse(resultText) as T;
				}
			}
			else {
				if (!resultText || resultText == "") {
					ret = { "error": { "status": response.status, "statusText": response.statusText } } as T;
				}
				if (raiseError) {
					throw new Error(resultText);
				}
				else {
					ret = { "error": { "message": resultText, "status": response.status, "statusText": response.statusText } } as T;
				}
			}

			await this.logResponse(ret);
			return ret;
		} catch (error) {
			this.handleApiException(error, false, raiseError);

			return undefined;
		}
	}
	

	static async getItemList<T>(endpoint: string, body: any = {}, sortBy: string = "name"): Promise<T[]> {
		let response = await this.get(endpoint, body);

		let items = response.value as T[];

		if (items == undefined) {
			return [];
		}
		if (sortBy) {
			Helper.sortArrayByProperty(items, sortBy);
		}
		return items;
	}

	
}
