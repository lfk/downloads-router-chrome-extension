/*jshint esversion: 6 */

var rulesets = {};
var installedVersion = null;

var dr_order = null;
var filename_map;
var ref_map;
var uriPath_map;
var mime_map;
var dr_global_ref_folders;
var dr_global_debugging = false;

function customLog(msg) {
	if (!dr_global_debugging) {
		return;
	}
	console.log(msg);
}

// Reads all data out of storage.local and exposes it via a promise.
//
// Note: Once the Storage API gains promise support, this function
// can be greatly simplified.
function getAllStorageLocalData() {
  // Immediately return a promise and start asynchronous work
  return new Promise((resolve, reject) => {
    // Asynchronously fetch all data from storage.local.
    chrome.storage.local.get(null, (items) => {
      // Pass any observed errors down the promise chain.
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      // Pass the data retrieved from storage down the promise chain.
      customLog('getAllStorageLocalData():: loading1');
      resolve(items);
      customLog('getAllStorageLocalData():: loading2');
    });
  });
}

rulesets.filename = function(downloadItem, suggest) {
	customLog('rulesets.filename():: begin');

	var keys = Object.keys(filename_map);
	if(keys.length) {
		var idx, regex, matches;
		for(idx = 0; idx < keys.length; idx++) {
			regex   = new RegExp(keys[idx], 'i');
			matches = regex.exec(downloadItem.filename);
			if(matches) {
				suggest({ filename: filename_map[keys[idx]] + downloadItem.filename });
				customLog('rulesets.filename():: suggest: ' + filename_map[keys[idx]] + downloadItem.filename);
				return true;
			}
		}
	}

	customLog('rulesets.filename():: no suggest');
	return false;
};

rulesets.referrer = function(downloadItem, suggest) {
	customLog('rulesets.referrer():: begin');
	var matches;
	if(downloadItem.referrer) {
		matches = downloadItem.referrer.match(/^https?\:\/\/([^\/:?#]+)(?:[\/:?#]|$)/i);
	} else {
		matches = downloadItem.url.match(/^https?\:\/\/([^\/:?#]+)(?:[\/:?#]|$)/i);
	}

	var ref_domain = matches && matches[1].replace(/^www\./i, '');

	if (Object.keys(ref_map).length) {
		if(ref_map[ref_domain]) {
			suggest({ filename: ref_map[ref_domain] + downloadItem.filename });
			customLog('rulesets.referrer():: mapping suggest: ' + ref_map[ref_domain] + downloadItem.filename);
			return true;
		}
	}

	if (dr_global_ref_folders) {
		suggest({ filename: ref_domain + '/' + downloadItem.filename });
		customLog('rulesets.referrer():: global referrer suggest: ' + ref_domain + '/' + downloadItem.filename);
		return true;
	}

	customLog('rulesets.referrer():: no suggest');
	return false;
};

rulesets.uriPath = function(downloadItem, suggest) {
	customLog('rulesets.uriPath():: begin');

	var keys = Object.keys(uriPath_map);
	if(keys.length) {
		var idx, regex, matches;
		for(idx = 0; idx < keys.length; idx++) {
			regex   = new RegExp(keys[idx], 'i');
			matches = regex.exec(downloadItem.url);
			if(matches) {
				suggest({ filename: uriPath_map[keys[idx]] + downloadItem.filename });
				customLog('rulesets.uriPath():: suggest: ' + uriPath_map[keys[idx]] + downloadItem.filename);
				return true;
			}
		}
	}

	customLog('rulesets.uriPath():: no suggest');
	return false;
};

rulesets.mime = function(downloadItem, suggest) {
	customLog('rulesets.mime():: begin');
	var mime_type = downloadItem.mime;    

	// Octet-stream workaround
	if(mime_type == 'application/octet-stream') {
		var matches   = downloadItem.filename.match(/\.([0-9a-z]+)(?:[\?#]|$)/i);
		var extension = matches && matches[1];
		var mapping   = {
			'mp3': 'audio/mpeg',
			'pdf': 'application/pdf',
			'zip': 'application/zip',
			'png': 'image/png',
			'jpg': 'image/jpeg',
			'exe': 'application/exe',
			'avi': 'video/x-msvideo',
			'torrent': 'application/x-bittorrent'
		};

		if(mapping[extension]) {
			mime_type = mapping[extension];
		}
	}

	var folder = mime_map[mime_type];
	if(folder) {
		suggest({ filename: folder + downloadItem.filename });
		customLog('rulesets.mime():: suggest: ' + folder + downloadItem.filename);
		return true;
	}

	customLog('rulesets.mime():: no suggest');
	return false;
};

async function asyncProcess(downloadItem, suggest) {
	customLog('asyncProcess():: begin');
	// Where we will expose all the data we retrieve from storage.local.
	var storageCache = {};

	// Asynchronously retrieve data from storage.local, then cache it.
	let initStorageCache = getAllStorageLocalData().then(items => {
		// Copy the data retrieved from storage into storageCache.
		customLog('asyncProcess():: loading configuration');
		Object.assign(storageCache, items);
		customLog('asyncProcess():: configuration loaded');
	});

	try {
		await initStorageCache;
	} catch (e) {
		// Handle error that occurred during storage initialization.
	}

	// Normal action handler logic.
	customLog('asyncProcess():: main processing');
	customLog('loaded configuration: ' + storageCache);
	dr_order = storageCache.dr_order;

	if (storageCache.dr_filename_map) {
		filename_map = JSON.parse(storageCache.dr_filename_map);
	} else {
		filename_map = [];
	}
	if (storageCache.dr_referrer_map) {
		ref_map = JSON.parse(storageCache.dr_referrer_map);
	} else {
		ref_map = [];
	}
	if (storageCache.dr_mime_map) {
		mime_map  = JSON.parse(storageCache.dr_mime_map);
	} else {
		mime_map = [];
	}
	if (storageCache.dr_uriPath_map) {
		uriPath_map  = JSON.parse(storageCache.dr_uriPath_map);
	} else {
		uriPath_map = [];
	}

	dr_global_ref_folders = storageCache.dr_global_ref_folders;
	if (!dr_global_ref_folders) {
		dr_global_ref_folders = false;
	}

	// global_debugging
	dr_global_debugging = storageCache.dr_global_debugging;
	if (!dr_global_debugging) {
		dr_global_debugging = false;
	}

	customLog('asyncProcess():: maps processing');
	var done = false;
	dr_order.every(function(idx) {
		done = rulesets[idx](downloadItem, suggest);
		customLog('index '+idx+' returned '+done);
		if(done) {
			return false;
		}
		return true;
	});
	if (!done) {
		// https://developer.chrome.com/docs/extensions/reference/downloads/#event-onDeterminingFilename
		// ...The DownloadItem will not complete until all listeners have called suggest.
		// ...Listeners may call suggest without any arguments in order to allow the download to use downloadItem.filename for its filename.
		suggest();
		customLog('asyncProcess():: no overall suggestion');
	}

	customLog('asyncProcess():: finished');
}

chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
	customLog('listener begin');
	asyncProcess(downloadItem, suggest);
	customLog('listener end');
	// https://developer.chrome.com/docs/extensions/reference/downloads/#event-onDeterminingFilename
	// If the listener calls suggest asynchronously, then it must return true.
	return true;
});

function initMain() {
    chrome.storage.local.get(['dr_order', 'dr_version'], function(items) {
			dr_order = items.dr_order;
			installedVersion = items.dr_version;

			initMainCallback();
	});
}

function initMainCallback() {
	if (!dr_order) {
		// initialize
		dr_order = ['filename', 'uriPath', 'referrer', 'mime'];
		chrome.storage.local.set({'dr_order': dr_order});
	}

	let manifestVersion = chrome.runtime.getManifest().version;

	if(!installedVersion || installedVersion != manifestVersion) {
		// Open the options page directly after installing or updating the extension
		chrome.tabs.create({ url: "options.html" });
		chrome.storage.local.set({'dr_version': manifestVersion});
	}
}

initMain();
