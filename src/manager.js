chrome.downloads.onDeterminingFilename.addListener(function(downloadItem, suggest) {

	/* Referrer-based mapping */
	ref_map = JSON.parse(localStorage.getItem('dr_referrer_map'));

	if(Object.keys(ref_map).length) {
		var matches = downloadItem.referrer.match(/^https?\:\/\/([^\/:?#]+)(?:[\/:?#]|$)/i);
		var ref_domain = matches && matches[1];

		if(ref_map[ref_domain]) {
			suggest({ filename: ref_map[ref_domain] + downloadItem.filename });
			return;
		}
	}

	/* MIME-based mapping */
	mime_map = JSON.parse(localStorage.getItem('dr_mime_map'));

	folder = mime_map[downloadItem.mime];
	if(!folder) {
		return;
	}
	
	suggest({ filename: folder + downloadItem.filename });
});
