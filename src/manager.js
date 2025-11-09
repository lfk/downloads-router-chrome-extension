const STORAGE_KEYS = {
	ORDER: 'dr_order',
	FILENAME_MAP: 'dr_filename_map',
	REFERRER_MAP: 'dr_referrer_map',
	MIME_MAP: 'dr_mime_map',
	GLOBAL_REF_FOLDERS: 'dr_global_ref_folders',
};

const DEFAULT_ORDER = ['filename', 'referrer', 'mime'];

const rules = {
	filename: applyFilenameRule,
	referrer: applyReferrerRule,
	mime: applyMimeRule,
};

function applyFilenameRule(downloadItem, filename_map) {
	if (!filename_map) {
		return null;
	}

	for (const key of Object.keys(filename_map)) {
		const regex = new RegExp(key, 'i');
		if (regex.test(downloadItem.filename)) {
			return filename_map[key] + downloadItem.filename;
		}
	}

	return null;
}

function applyReferrerRule(downloadItem, ref_map, global_ref_folders) {
	const url = downloadItem.referrer || downloadItem.url;
	const matches = url.match(/^https?\:\/\/([^\/:?#]+)(?:[\/:?#]|$)/i);
	const ref_domain = matches ? matches[1].replace(/^www\./i, '') : null;

	if (ref_map && ref_domain && ref_map[ref_domain]) {
		return ref_map[ref_domain] + downloadItem.filename;
	}

	if (global_ref_folders && ref_domain) {
		return ref_domain + '/' + downloadItem.filename;
	}

	return null;
}

function applyMimeRule(downloadItem, mime_map) {
	if (!mime_map) {
		return null;
	}

	let mime_type = downloadItem.mime;

	// Octet-stream workaround
	if (mime_type === 'application/octet-stream') {
		const matches = downloadItem.filename.match(/\.([0-9a-z]+)(?:[\?#]|$)/i);
		const extension = matches ? matches[1] : null;
		const mapping = {
			'mp3': 'audio/mpeg',
			'pdf': 'application/pdf',
			'zip': 'application/zip',
			'png': 'image/png',
			'jpg': 'image/jpeg',
			'exe': 'application/exe',
			'avi': 'video/x-msvideo',
			'torrent': 'application/x-bittorrent'
		};

		if (extension && mapping[extension]) {
			mime_type = mapping[extension];
		}
	}

	const folder = mime_map[mime_type];
	if (folder) {
		return folder + downloadItem.filename;
	}

	return null;
}

function suggestLocation(downloadItem, suggest) {
	(async () => {
		const settings = await chrome.storage.local.get(Object.values(STORAGE_KEYS));
		const order = settings[STORAGE_KEYS.ORDER] || DEFAULT_ORDER;

		for (const ruleName of order) {
			const ruleHandler = rules[ruleName];
			if (!ruleHandler) {
				continue;
			}

			let newFilename;
			if (ruleName === 'referrer') {
				newFilename = ruleHandler(
					downloadItem,
					settings[STORAGE_KEYS.REFERRER_MAP],
					settings[STORAGE_KEYS.GLOBAL_REF_FOLDERS]
				);
			} else {
				newFilename = ruleHandler(
					downloadItem,
					settings[STORAGE_KEYS[`${ruleName.toUpperCase()}_MAP`]]
				);
			}

			if (newFilename) {
				suggest({ filename: newFilename });
				return;
			}
		}

		// If no rules matched, suggest the original filename to prevent a delay.
		suggest({ filename: downloadItem.filename });
	})();

	return true;
}

if (!chrome.downloads.onDeterminingFilename.hasListener(suggestLocation)) {
	chrome.downloads.onDeterminingFilename.addListener(suggestLocation);
}
