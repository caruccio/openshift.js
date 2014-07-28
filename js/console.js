querystring = function()
{
	return document.location.search
		? document.location.search.substr(1).split('&')
			.map(function(v){ return v.split('=') })
			.reduce(function(prev, curr) { prev[curr[0]] = curr[1]; return prev; }, {})
		: undefined;
};

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

	var $form = $(render_template('#loginTpl', {username: $('#username-input').val() || ''}));
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

var home = function(openshift) {
	console.log('home:', openshift);

	var render_home = function(openshfit) {
		if (openshift.domains && openshift.applications) {
			var apps = openshift.applications.data.data;
			render_template('#homeTpl', '#content', {apps: apps});
		}
	}

	openshift.list_applications({
		success: render_home
	});
	openshift.list_domains({
		success: render_home
	});
};

var logout = function(openshift) {
	console.log('home:', openshift);
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
		ready: home
	});

	$('#logoutLink').click(function() {
		logout();
		window.location.reload();
	});
});
