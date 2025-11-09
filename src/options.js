function save_options() {
	var maps = [{}, {}, {}];
	var tables = [
		document.getElementById('mime_mapping_table').getElementsByTagName('tbody')[0],
		document.getElementById('referrer_mapping_table').getElementsByTagName('tbody')[0],
		document.getElementById('filename_mapping_table').getElementsByTagName('tbody')[0]
	];

	for(var idx in tables) {
		for(var i = 0; i < tables[idx].rows.length - 1; i++) {
			fields = tables[idx].rows[i].getElementsByTagName('input');
			if(fields[0].value != '' && fields[1].value != '') {
				target_directory = check_trailing(fields[1].value);
				maps[idx][fields[0].value] = target_directory;
			}
		}
	}

	chrome.storage.local.set({
		dr_mime_map: maps[0],
		dr_referrer_map: maps[1],
		dr_filename_map: maps[2]
	});


	var order = document.getElementById('rule_order').value;
	order = order.replace(/\s+/g, '');
	order = order.split(',', 3);

	['filename', 'referrer', 'mime'].every(function(item) {
		if(order.indexOf(item) == -1) {
			alert('Invalid ruleset hierarchy, resetting to default.');
			order = ['filename', 'referrer', 'mime'];
			return false;
		}

		return true; // Again, abusing every()
	}); 

	chrome.storage.local.set({dr_order: order});
	chrome.storage.local.set({dr_global_ref_folders: document.querySelector('#global_ref_folders').checked});

	// Flash a status message
	var status = document.getElementById('status');
	status.innerHTML = '<span class="green">&#10004;</span> Settings saved!';
	//status.innerHTML = '<span class="green">&#10004;</span>' + chrome.i18n.getMessage('msg_saved');
	status.style.display = 'block';
	setTimeout(function() {
		status.innerHTML = '';
		status.style.display = 'none';
	}, 1500);
}

function restore_options() {
	var tables = [
		document.getElementById('mime_mapping_table').getElementsByTagName('tbody')[0],
		document.getElementById('referrer_mapping_table').getElementsByTagName('tbody')[0],
		document.getElementById('filename_mapping_table').getElementsByTagName('tbody')[0]
	];

	var maps = [
		'dr_mime_map',
		'dr_referrer_map',
		'dr_filename_map'
	];

	var map_defaults = [
		{ 'image/jpeg': 'images/', 'application/x-bittorrent': 'torrents/' },
		{},
		{}
	];

	chrome.storage.local.get(maps, function(result) {
		for(var idx = 0; idx < maps.length; ++idx) {
			// Restore or create mapping table
			var map = result[maps[idx]];
			if(!map) {
				map = map_defaults[idx];
				let new_map = {};
				new_map[maps[idx]] = map;
				chrome.storage.local.set(new_map);
			}

			// Create HTML table elements for corresponding map
			for(var key in map) {
				var input         = document.createElement('input');
				input.type        = 'text';
				input.value       = key;
				input.placeholder = key;

				var path          = document.createElement('input'); // type = 'file' error explanation here
				path.type         = 'text';
				path.value        = map[key];
				path.placeholder  = map[key];

				add_table_row(tables[idx], input, path);
			}
		}
	});

	chrome.storage.local.get('dr_order', function(result) {
		var order = result.dr_order;
		if(!order) {
			order = ['filename', 'referrer', 'mime'];
			chrome.storage.local.set({dr_order: order});
		}
		document.getElementById('rule_order').value = order;
	});

	chrome.storage.local.get('dr_global_ref_folders', function(result) {
		var global_ref_folders = result.dr_global_ref_folders;
		if(global_ref_folders === undefined) {
			global_ref_folders = false;
			chrome.storage.local.set({dr_global_ref_folders: false});
		}
		document.getElementById('global_ref_folders').checked = global_ref_folders;
	});
}

function check_trailing(path) {
	if(path.slice(-1) == '/' || path.slice(-1) == '\\') {
		return path;
	}

	if(navigator.platform.indexOf('Win') != -1) {
		if(path.indexOf('\\') != -1) { // Could be an escape, but it's a half-decent guess
			return path + '\\';
		}
	}

	// Windows with no \ delimiter, OSX, Linux, other thing; let's just attempt with a forward slash for now
	return path + '/'
}

function add_table_row(table, element1, element2) {
	var newRow    = table.insertRow(table.rows.length - 1);
	var srcCell   = newRow.insertCell(0);
	var spaceCell = newRow.insertCell(1);
	var destCell  = newRow.insertCell(2);
	var delCell   = newRow.insertCell(3);

	srcCell.appendChild(element1);
	destCell.appendChild(element2);

	var delInput       = document.createElement('button');
	delInput.className = 'btn delete';
	delInput.innerHTML = '&#215;';
	delInput.onclick   = function() {
		var current = window.event.srcElement;
		while((current = current.parentElement) && current.tagName != 'TR');
		current.parentElement.removeChild(current);
	}

	delCell.appendChild(delInput);
	spaceCell.appendChild(document.createTextNode('➜'));

	newRow.appendChild(srcCell);
	newRow.appendChild(spaceCell);
	newRow.appendChild(destCell);
	newRow.appendChild(delCell);
}

/* The following two functions are invoked from the options page,
 * for adding empty rows to the corresponding tables. */

function add_mime_route() {
	var table             = document.getElementById('mime_mapping_table').getElementsByTagName('tbody')[0];
	var mimeInput         = document.createElement('input');
	mimeInput.type        = 'text';
	mimeInput.placeholder = 'E.g. image/jpeg';
	var pathInput         = document.createElement('input');
	pathInput.type        = 'text';
	pathInput.placeholder = 'some/folder/';

	add_table_row(table, mimeInput, pathInput);
}

function add_referrer_route() {
	var table             = document.getElementById('referrer_mapping_table').getElementsByTagName('tbody')[0];
	var refInput          = document.createElement('input');
	refInput.type         = 'text';
	refInput.placeholder  = 'E.g. 9gag.com (no http://)';
	var pathInput         = document.createElement('input');
	pathInput.type        = 'text';
	pathInput.placeholder = 'some/folder/';

	add_table_row(table, refInput, pathInput);
}

function add_filename_route() {
	var table             = document.getElementById('filename_mapping_table').getElementsByTagName('tbody')[0];
	var refInput          = document.createElement('input');
	refInput.type         = 'text';
	refInput.placeholder  = 'E.g. epub|ebook';
	var pathInput         = document.createElement('input');
	pathInput.type        = 'text';
	pathInput.placeholder = 'some/folder/';

	add_table_row(table, refInput, pathInput);
}

function options_setup() {
	var cont   = document.getElementById('wrap');
	var navs   = cont.querySelectorAll('ul#nav li');
	var tabs   = cont.querySelectorAll('.tab');
	var active = 'routing';

	// Handle new installations by showing the usage instructions and a quick message
	chrome.storage.local.get('dr_mime_map', function(result) {
		if(!result.dr_mime_map) {
			active = 'usage';

			var status = document.getElementById('status');
			status.innerHTML = 'Thank you for installing Downloads Router!<br>Please read the instructions below, then head over to the routing rules to configure the extension.';
			status.style.display = 'block';
			setTimeout(function() {
				status.innerHTML = '';
				status.style.display = 'none';
			}, 7500);
		}

		navs[0].parentNode.dataset.current = active;

		for(var i = 0; i < tabs.length; i++) {
			if(tabs[i].id != active) {
				tabs[i].style.display = 'none';
			}

			navs[i].onclick = handle_click;
			if(navs[i].dataset.tab == active) {
				navs[i].setAttribute('class', 'active');
			}
		}

		restore_options();
	});
}

function handle_click() {
	var current  = this.parentNode.dataset.current;
	var selected = this.dataset.tab;

	if(current == selected) {
		return;
	}

	document.getElementById(current).style.display  = 'none';
	document.getElementById(selected).style.display = 'block';
	document.getElementById('nav_' + current).removeAttribute('class', 'active');

	this.setAttribute('class', 'active');
	this.parentNode.dataset.current = selected;
}

document.addEventListener('DOMContentLoaded', function() {
	chrome.storage.local.get('dr_version', function(result) {
		var version = result.dr_version;
		var manifest_version = chrome.runtime.getManifest().version;

		if(!version || version != manifest_version) {
			var status = document.getElementById('status');
			status.innerHTML = 'Thank you for installing Downloads Router!<br>Please read the instructions below, then head over to the routing rules to configure the extension.';
			status.style.display = 'block';
			setTimeout(function() {
				status.innerHTML = '';
				status.style.display = 'none';
			}, 7500);
			chrome.storage.local.set({dr_version: manifest_version});
		}
	});

	options_setup();

	document.querySelector('#save').addEventListener('click', save_options);
	document.querySelector('#add_mime_route').addEventListener('click', add_mime_route);
	document.querySelector('#add_referrer_route').addEventListener('click', add_referrer_route);
	document.querySelector('#add_filename_route').addEventListener('click', add_filename_route);
});
