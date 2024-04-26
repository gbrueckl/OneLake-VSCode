# OneLake-VSCode
[![Version](https://img.shields.io/visual-studio-marketplace/v/GerhardBrueckl.onelake-vscode)](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.onelake-vscode)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/GerhardBrueckl.onelake-vscode)](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.onelake-vscode)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/GerhardBrueckl.onelake-vscode)](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.onelake-vscode)
[![Ratings](https://img.shields.io/visual-studio-marketplace/r/GerhardBrueckl.onelake-vscode)](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.onelake-vscode)

![OneLake-VSCode](/images/onelake_VSCode.png?raw=true "OneLake-VSCode")

A [VSCode](https://code.visualstudio.com/) extension for to browse Fabric OneLake.

# Installation
The extensions can be installed directly from within VSCode by searching for this extension (`GerhardBrueckl.onelake-vscode`) or downloaded from the official Visual Studio Code extension gallery at [OneLake VSCode](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.onelake-vscode) and installed manually as `VSIX`.

# Features
- Custom File System Provider `onelake:/` to browse through the OneLake directly from VSCode Explorer

# Configuration
The extension supports the following VSCode settings:

|Setting|Description|Example value|
|-------|-----------|-------------|
|`oneLake.tenantId`|(Optional) The tenant ID of the remote tenant that you want to connect to OneLake.|A GUID, `abcd1234-1234-5678-9abcd-9d1963e4b9f5`|
|`oneLake.clientId`|(Optional) A custom ClientID/Application of an AAD application to use when connecting to OneLake.|A GUID, `99887766-1234-5678-9abcd-e4b9f59d1963`|

# Custom File System Provider
Using the Custom File System Provider for the scheme `onelake:/` you can now mount OneLake folders directly into the VSCode Explorer. The browser is Read-Only as of now. You can easily drag&drop files and folders from OneLake into your local file system to download them.