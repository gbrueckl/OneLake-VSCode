# OneLake-VSCode

[![MIT License](https://img.shields.io/badge/License-MIT-green.png?color=green)](http://opensource.org/licenses/MIT)
[![Version](https://vsmarketplacebadges.dev/version/GerhardBrueckl.onelake-vscode.png?&colorB=orange)](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.onelake-vscode) [![Installs](https://vsmarketplacebadges.dev/installs/GerhardBrueckl.onelake-vscode.png)](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.onelake-vscode) [![Downloads](https://vsmarketplacebadges.dev/downloads/GerhardBrueckl.onelake-vscode.png)](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.onelake-vscode) [![Rating Short](https://vsmarketplacebadges.dev/rating-short/GerhardBrueckl.onelake-vscode.png)](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.onelake-vscode) 

[![TrendingDaily](https://vsmarketplacebadges.dev/trending-daily/GerhardBrueckl.onelake-vscode.png?&colorB=blue)](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.onelake-vscode) [![TrendingWeekly](https://vsmarketplacebadges.dev/trending-weekly/GerhardBrueckl.onelake-vscode.png?&colorB=blue)](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.onelake-vscode) [![TrendingMonthly](https://vsmarketplacebadges.dev/trending-monthly/GerhardBrueckl.onelake-vscode.png?&colorB=blue)](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.onelake-vscode)

![OneLake-VSCode](/images/onelake_VSCode.png?raw=true "OneLake-VSCode")

A [VS Code](https://code.visualstudio.com/) extension for browsing Fabric OneLake. It is best used with `Fabric Studio` ([Repository](https://github.com/gbrueckl/FabricStudio), [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.fabricstudio), [Open VSX](https://open-vsx.org/extension/GerhardBrueckl/fabricstudio)), which provides a `Browse in OneLake` action that adds an item, such as a lakehouse, to the VS Code Explorer.

# Installation

The extensions can be installed directly from within VSCode by searching for this extension (`GerhardBrueckl.onelake-vscode`) or downloaded from the official Visual Studio Code extension gallery at [OneLake VSCode](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.onelake-vscode) and installed manually as `VSIX`.

# Features

- Custom File System Provider (`onelake:/`) for browsing Fabric OneLake in VS Code Explorer.
- Friendly workspace and item names in the explorer; API requests use the corresponding immutable GUIDs.
- Open and save files directly from VS Code. Saves use the ADLS Gen2 create, append, and flush workflow.
- Safe file reads with response validation, transient-error retries, configurable timeouts, and a configurable in-memory size limit.
- Writes are restricted to an item's `/Files` path by default.

# Configuration

The extension supports the following VSCode settings:

|Setting|Description|Example value|
|-------|-----------|-------------|
|`oneLake.tenantId`|(Optional) The tenant ID of the remote tenant that you want to connect to OneLake.|A GUID, `abcd1234-1234-5678-9abcd-9d1963e4b9f5`|
|`oneLake.clientId`|(Optional) A custom ClientID/Application of an AAD application to use when connecting to OneLake.|A GUID, `99887766-1234-5678-9abcd-e4b9f59d1963`|
|`oneLake.maxReadFileSizeMB`|Maximum file size read into the VS Code extension host. Larger files are rejected to protect memory.|`50` (default)|
|`oneLake.readTimeoutSeconds`|Timeout for an individual OneLake file read request.|`30` (default)|
|`oneLake.writeTimeoutSeconds`|Timeout for each create, append, or flush request issued while saving a file.|`30` (default)|
|`oneLake.restrictWritesToFiles`|When `true`, allow saves only below an item's `/Files` path. Disable only if writes to other OneLake paths are explicitly intended.|`true` (default)|

# Custom File System Provider

Using the Custom File System Provider for the scheme `onelake:/` you can mount OneLake folders directly into the VS Code Explorer. Workspace and item labels use their Fabric display names, so a path looks like:

```text
onelake:/Finance Workspace/Sales.lakehouse/Files/config/settings.json
```

The extension maps those labels to workspace and item GUIDs before making OneLake DFS requests. This keeps URIs readable while ensuring reads, listings, and saves use stable identifiers. The extension queries the Fabric Workspaces and Items APIs to build the maps; VS Code may request authorization for the Fabric API on first use.

Files can be opened and saved back to OneLake. Existing-file saves use ETags to avoid silently overwriting a concurrent remote update. New writes are allowed only under `/Files` by default; set `oneLake.restrictWritesToFiles` to `false` to opt out.

Creating directories, deleting, renaming, and copying remain unavailable. You can drag and drop files and folders from OneLake into your local file system to download them.
