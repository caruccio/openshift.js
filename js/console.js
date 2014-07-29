querystring = function()
{
	return document.location.search
		? document.location.search.substr(1).split('&')
			.map(function(v){ return v.split('=') })
			.reduce(function(prev, curr) { prev[curr[0]] = curr[1]; return prev; }, {})
		: {};
};

message = function(levels)
{
	for (var level in levels) {
		var el = $('#' + level + '-message');
		if (el.length) {
			el.html(levels[level]);
		}
	}
}

BootstrapDialog.prototype.refresh = function(message)
{
	console.log('BootstrapDialog.refresh');

	var li = $('#username-input').val().length;
	var pi = $('#password-input').val().length;
	var ub = this.getButton('username-button');
	var pb = this.getButton('password-button');
	ub.toggleEnable(li && pi);
	pb.toggleEnable(li > 0);
	ub.stopSpin();
	if (typeof message !== 'undefined') {
		$('#error-message').html(message);
	}
};

var authenticate = function(link, submit_login, reset_password)
{
	console.log('BootstrapDialog.authenticate');
	logout(link.openshift);

	var $form = $(render_template('#login-tpl', {username: $('#username-input').val() || ''}));
	var dialog = new BootstrapDialog({
		title:           'Login',
		message:         $form,
		closable:        false,
		closeByBackdrop: false,
		closeByKeyboard: false,

		onshow: function(dialog) {
			dialog.enableButtons(false);
		},
		onshown: function(dialog) {
			// enable buttons when user type something
			var toggleButtons = function(ev) {
				dialog.refresh();
			};

			$('#username-input').bind('input', toggleButtons).focus();
			$('#password-input').bind('input', toggleButtons);
			dialog.refresh(); //enable buttons for autocompleted forms
		},
		//onhide: function(dialog) {
		//},

		buttons: [{
			label:    'Sign-in',
			id:       'username-button',
			autospin: true,
			hotkey:   13, // Enter.
			action:  function (dialog) {
				console.log('submit_login button:', dialog);

				dialog.enableButtons(false);

				var username = $('#username-input').val();
				var password = $('#password-input').val();
				$('#password').val('');

				var basic_auth_headers = { Authorization: "Basic " + btoa(username + ":" + password) };
				link.openshift.list_authorizations({
					success: function (link, data, status, xhr) {
						link.openshift.get_or_add_authorization({
							success: function(link, data, status, xhr) {
								link.openshift.set_auth_token(data.data.token);
								$.Storage.saveItem('auth_token', link.openshift.auth_token);
								dialog.close();
								home(link.openshift);
							},
							headers: basic_auth_headers
							});
					},
					headers: basic_auth_headers
				});
			}
		},
		{  //maybe this soulhd be a link instead a button
			label:    'Forgot my password',
			id:       'password-button',
			autospin: false,
			action:   function (dialog) {
				console.log('reset_email button:', dialog);

				//XXX: TODO
				dialog.enableButtons(false);
			}
		}]
	});

	dialog.open();

	return dialog;
};

var catalog = null;

Catalog = function(openshift)
{
	this.openshift = openshift;
	this.groups = {
		web:  [],
		addon:[]
	};
	this.searches = {
		web:   { type: 'standalone', tags: [ 'web_framework' ] },
		addon: { type: 'embedded' }
	};
	this.languages = [ 'php', 'nodejs', 'python', 'ruby', 'perl' ];

	this.update();
};

Catalog.prototype.update = function(success) {
	this.openshift.list_cartridges({
		success: function(link) {
			catalog = this; //new Catalog(link.openshift);

			//build groups
			catalog.groups.web = catalog.group_by_tag(this.languages, catalog.search(this.searches.web));
			//catalog.groups.addon = catalog.group_by_tag(this.languages), catalog.search(this.searches.web));

			console.log('catalog updated:', catalog);
			if (typeof success === 'function') {
				success(catalog);
			}
		}.bind(this)
	});
};

Catalog.prototype.search = function(query)
{
	var query = query || {};

	if ($.isEmptyObject(query)) {
		return this.carts.data.data;
	}

	var carts = this.openshift.cartridges.data.data.filter(function(el, i) {
		var target = 0;
		var hit = 0;

		if (query.obsoletes === true || el.obsolete === true) {
			return;
		}

		if (query.type) {
			target++;
			if (query.type == el.type) {
				hit++;
			}
		}

		//must match all tags
		if (query.tags) {
			var qtags = typeof query.tags === 'string' ? $([query.tags]) : $(query.tags);
			target += qtags.length;
			qtags.each(function(i, tag) {
				if (el.tags.indexOf(tag) !== -1) {
					hit++;
				}
			});
		}

		if (hit === target) {
			console.log('+ cart:', el.name, el.type, el.tags);
			return el;
		}
	});

	return carts;
};

Catalog.prototype.group_by_tag = function(tags, carts)
{
	var groups = { };
	var other  = [];
	for (var i = 0, tag; tag = tags[i]; i++) {
		groups[tag] = [];
	}

	var _carts = carts || this.openshift.cartridges.data.data;
	var tags = typeof tags === 'string' ? $([tags]) : $(tags);
	for (var i = 0, cart; cart = _carts[i]; i++) {
		var hit = false;
		tags.each(function(i, tag) {
			if (cart.tags.indexOf(tag) !== -1) {
				groups[tag].push(cart);
				hit = true;
			}
		});
		if (!hit) {
			other.push(cart);
		}
	}

	groups.other = other;
	return groups;
}

var home = function(openshift, from_cache) {
	console.log('home:', openshift, from_cache ? 'cached' : '');

	var render_home = function(openshfit) {
		if (openshift.domains && openshift.applications) {
			var apps = openshift.applications.data.data;
			message({info: '', error: ''});
			render_template('#home-tpl', '#content', {apps: apps});
		}
	}

	if (from_cache && openshift.applications) {
		render_home(openshift);
		return;
	}

	openshift.list_applications({
		success: render_home
	});
	openshift.list_domains({
		success: render_home
	});
};

var create_app = function(openshift, from_cache) {
	console.log('create_app:', openshift, from_cache ? 'cached' : '');

	var render_create_app = function(openshfit) {
		if (openshift.cartridges) {
			message({info: '', error: ''});
			render_template('#create-app-tpl', '#content', {groups: catalog.groups.web});
		}
	}

	if (from_cache && openshift.cartridges) {
		render_create_app(openshift);
		return;
	}

	catalog.update(function(catalog) {
		render_create_app(catalog.openshift);
	});
};

var logout = function(openshift) {
	console.log('logout:', openshift);
	openshift.set_auth_token(null);
	$.Storage.deleteItem('auth_token');
}

$(document).ready(function()
{
	var login_dialog = null;
	var broker_url   = querystring().broker || "https://broker.getupcloud.com/broker/rest";

	var os = new OpenShift({
		broker_url: broker_url,
		auth_token: $.Storage.loadItem('auth_token'),
		auth_error: function(link, data, status, xhr) {
			if (!login_dialog || !login_dialog.isOpened()) {
				login_dialog = authenticate(link);
			} else {
				//TODO: proper error message
				login_dialog.refresh(data.responseText);
			}
		},
		ready: function(openshift) {
			home(openshift);
			this.catalog = new Catalog(openshift);
		}
	});

	$('#apps-button').click(function() {
		home(os, true);
	});

	$('#create-app-button').click(function() {
		create_app(os, true);
	});

	$('#logout-button').click(function() {
		logout(os);
		window.location.reload();
	});
});
