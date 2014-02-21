Downloads Router
===============

Downloads Router is an extension for Chromium and Google Chrome that allows the user
to establish routing rules, directing downloads to folders based on filetypes and optionally source website.

* [Chrome web store listing][webstore]

[webstore]: https://chrome.google.com/webstore/detail/downloads-router/fgkboeogiiklpklnjgdiaghaiehcknjo]


Changelog
---------

### 0.4 (February 20, 2014)

* Implemented a basic workaround for downloads sent as `application/octet-stream`
* Updated usage instructions with more accurate information regarding usage on OSX
* Added a troubleshooting section on the options page

### 0.3 (February 18, 2014)

* Automatically opens the options page directly after installing
* Added locale support and very rudimentary translations for Swedish and Spanish; options page i18n pending

### 0.2 (February 17, 2014)

* Tested on Windows, updated information in Options to reflect findings

### 0.1 (February 17, 2014)

* Initial commit, tested on Linux (Chromium) and OS X (Google Chrome)
* Options page allows the creation of routing rules based on filetypes and referrer
* The manager listens to `onDeterminingFilename` events and creates suggestions based on the maps created on the options page
