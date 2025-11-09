# Privacy Policy for Downloads Router

**Last updated:** November 9, 2025

This privacy policy outlines the data handling practices for the Downloads Router Chrome extension.

## Data Collection and Usage

This extension **does not collect, store, or transmit any personal data, browsing history, or any other user information** to any external server or third party.

All data created and used by the extension is stored locally on your computer using the `chrome.storage.local` API and is solely for the functioning of the extension. This data consists exclusively of the download routing rules and preferences that you configure.

## Single Purpose

The single purpose of this extension is to automatically route and organize downloaded files into user-defined subdirectories based on rules matching the file's name, type (MIME), or download source (referrer domain).

## Required Permissions

To perform its single purpose, the extension requires the following permissions:

#### `storage` permission
The `storage` permission is used to save your custom routing rules and preferences (e.g., filename mappings, referrer mappings, rule order). This allows your configuration to be saved locally on your machine and persist between browser sessions.

#### `downloads` permission
The `downloads` permission is the core requirement for this extension. It is used to access the `chrome.downloads.onDeterminingFilename` event, which allows the extension to suggest a new file path (including a subdirectory) for a download before it is saved. This is the essential mechanism used to route files according to your rules.

## Remote Code

This extension does not use or execute any remotely hosted code. All scripts and resources required for the extension's operation are fully contained within the extension package to ensure security and privacy.

## Contact

If you have any questions about this privacy policy, please open an issue on the [official GitHub repository](https://github.com/lfk/downloads-router-chrome-extension/issues).
