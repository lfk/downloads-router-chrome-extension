let configCache = null;
let loadingPromise = null;
let debugEnabled = false;

function log(...a) { if (debugEnabled) console.log('[DR]', ...a); }
function warn(...a) { if (debugEnabled) console.warn('[DR]', ...a); }

function loadConfig(force = false) {
	if (configCache && !force) return Promise.resolve(configCache);
	if (loadingPromise && !force) return loadingPromise;
	loadingPromise = new Promise(res => {
		chrome.storage.local.get([
			'dr_order', 'dr_filename_map', 'dr_referrer_map',
			'dr_global_ref_folders', 'dr_mime_map', 'dr_debug'
		], d => {
			debugEnabled = !!d.dr_debug;
			configCache = {
				order: d.dr_order || [ 'filename', 'referrer', 'mime' ],
				filename_map: d.dr_filename_map || {},
				referrer_map: d.dr_referrer_map || {},
				global_ref: !!d.dr_global_ref_folders,
				mime_map: d.dr_mime_map || {}
			};
			log('Config loaded', {
				order: configCache.order,
				filename_keys: Object.keys(configCache.filename_map),
				referrer_keys: Object.keys(configCache.referrer_map),
				global_ref: configCache.global_ref,
				mime_keys: Object.keys(configCache.mime_map),
				debug: debugEnabled
			});
			res(configCache);
		});
	});
	return loadingPromise;
}

// Update storage change listener
chrome.storage.onChanged.addListener(ch => {
	if (ch.dr_debug) {
		debugEnabled = !!ch.dr_debug.newValue;
		log('Debug toggled ->', debugEnabled);
	}
	if (ch.dr_order || ch.dr_filename_map || ch.dr_referrer_map || ch.dr_global_ref_folders || ch.dr_mime_map) {
		configCache = null;
		loadingPromise = null;
		loadConfig(true);
		log('Config invalidated');
	}
});

// Helpers
function sanitizeRelativePath(p) {
	if (!p) return '';
	p = p.replace(/^Downloads\//i, '')
		.replace(/^\/+/, '')
		.replace(/\/{2,}/g, '/');
	const parts = p.split('/').filter(seg => seg && seg !== '..');
	return parts.join('/');
}
function ensureSlash(s) { return s && !/\/$/.test(s) ? s + '/' : (s || ''); }
function extractDomain(item) {
	const src = item.referrer || item.url || '';
	const m = src.match(/^https?:\/\/([^\/:?#]+)(?:[\/:?#]|$)/i);
	return m && m[ 1 ] ? m[ 1 ].replace(/^www\./i, '') : null;
}

// Rules
function ruleFilename(item, cfg) {
	for (const pattern of Object.keys(cfg.filename_map)) {
		let re; try { re = new RegExp(pattern, 'i'); } catch { continue; }
		if (re.test(item.filename)) {
			let base = ensureSlash(sanitizeRelativePath(cfg.filename_map[ pattern ]));
			log('filename rule:', pattern, '->', base);
			return base + item.filename;
		}
	}
	return null;
}
function ruleReferrer(item, cfg) {
	const domain = extractDomain(item);
	if (!domain) return null;
	if (cfg.referrer_map[ domain ]) {
		let base = ensureSlash(sanitizeRelativePath(cfg.referrer_map[ domain ]));
		log('referrer rule:', domain, '->', base);
		return base + item.filename;
	}
	if (cfg.global_ref) {
		const folder = sanitizeRelativePath(domain);
		log('referrer global:', folder + '/');
		return folder + '/' + item.filename;
	}
	return null;
}
function ruleMime(item, cfg) {
	let mimeType = item.mime;
	if (mimeType === 'application/octet-stream') {
		const m = item.filename.match(/\.([0-9a-z]+)(?:[\?#]|$)/i);
		const ext = m && m[ 1 ];
		const map = {
			mp3: 'audio/mpeg', pdf: 'application/pdf', zip: 'application/zip',
			png: 'image/png', jpg: 'image/jpeg', exe: 'application/exe',
			avi: 'video/x-msvideo', torrent: 'application/x-bittorrent'
		};
		if (map[ ext ]) mimeType = map[ ext ];
	}
	const folder = cfg.mime_map[ mimeType ];
	if (folder) {
		let base = ensureSlash(sanitizeRelativePath(folder));
		log('mime rule:', mimeType, '->', base);
		return base + item.filename;
	}
	return null;
}

const ruleFns = { filename: ruleFilename, referrer: ruleReferrer, mime: ruleMime };

chrome.downloads.onDeterminingFilename.addListener(async (item, suggest) => {
	const cfg = configCache || await loadConfig();
	let out = null;

	for (const name of cfg.order) {
		const fn = ruleFns[ name ];
		if (!fn) continue;
		out = fn(item, cfg);
		if (out) break;
	}

	if (!out) {
		log('no rule match; using default download location');
		suggest(); // let Chrome use its default (original filename & folder)
		return;
	}

	out = sanitizeRelativePath(out);
	log('final suggest:', out);
	suggest({ filename: out });
});

// Optional install handler
chrome.runtime.onInstalled.addListener(d => {
	chrome.storage.local.set({ dr_version: chrome.runtime.getManifest().version });
	if (d.reason === 'install') {
		chrome.tabs.create({ url: 'options.html' });
	}
});
