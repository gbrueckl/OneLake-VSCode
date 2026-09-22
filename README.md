# OneLake-VSCode

[![MIT License](https://img.shields.io/badge/License-MIT-green.png?color=green)](http://opensource.org/licenses/MIT)
[![Version](https://vsmarketplacebadges.dev/version/GerhardBrueckl.onelake-vscode.png?&colorB=orange)](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.onelake-vscode) [![Installs](https://vsmarketplacebadges.dev/installs/GerhardBrueckl.onelake-vscode.png)](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.onelake-vscode) [![Downloads](https://vsmarketplacebadges.dev/downloads/GerhardBrueckl.onelake-vscode.png)](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.onelake-vscode) [![Rating Short](https://vsmarketplacebadges.dev/rating-short/GerhardBrueckl.onelake-vscode.png)](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.onelake-vscode) 

[![TrendingDaily](https://vsmarketplacebadges.dev/trending-daily/GerhardBrueckl.onelake-vscode.png?&colorB=blue)](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.onelake-vscode) [![TrendingWeekly](https://vsmarketplacebadges.dev/trending-weekly/GerhardBrueckl.onelake-vscode.png?&colorB=blue)](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.onelake-vscode) [![TrendingMonthly](https://vsmarketplacebadges.dev/trending-monthly/GerhardBrueckl.onelake-vscode.png?&colorB=blue)](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.onelake-vscode)

![OneLake-VSCode](/images/onelake_VSCode.png?raw=true "OneLake-VSCode")

A [VSCode](https://code.visualstudio.com/) extension for to browse Fabric OneLake. It is best used in combination with `Fabric Studio`([Repo](https://github.com/gbrueckl/FabricStudio), [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.fabricstudio), [Open-VSX](https://open-vsx.org/extension/GerhardBrueckl/fabricstudio)) which offers a `Browse in OneLake` action that automatically adds an item (e.g. Lakehouse) to your VSCode Explorer.

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
The URI has the following structure: `"onelake://<workspaceId>/<itemId>"` where the `<itemId>` can be the ID of any item that is backed by OneLak (e.g. Lakehouse, Warehouse, ...)
