(function($){

Link = function(openshift, name, data)
{
	this.openshift = openshift;
	this.name = name;
	this.data = data;
};

Link.prototype.call = function(success, options)
{
	var _cb = null;

	if (typeof options === 'object' && typeof options.auth_error === 'function') {
		_cb = options.auth_error;
	} else if (typeof this.openshift.auth_error === 'function') {
		_cb = this.openshift.auth_error;
	}

	var auth_error_cb = _cb ? function(link) {
		return function(data, status, xhr) {
			_cb(link, data, status, xhr);
		}
	} : undefined;

	var success_cb = success ? function(link) {
		return function(data, status, xhr) {
			success(link, data, status, xhr);
		}
	} : undefined;

	var settings = {};

	$.extend(settings, options);
	settings.success    = success_cb(this);
	settings.type       = this.data.method;
	settings.statusCode = { 401: auth_error_cb(this) }
	settings.beforeSend = function (xhr) {
		if (this.openshift.auth_token) {
			xhr.setRequestHeader('Authorization', 'Bearer ' + this.openshift.auth_token);
		}
	}.bind(this);

	var xhr = $.ajax(this.data.href, settings);
	xhr.openshift = this.openshift;

	return xhr;
};

Endpoint = function(openshift, data, link_extractor)
{
	this.openshift = openshift;
	this.data  = data;

	var le = typeof link_extractor === 'function' ? link_extractor : generic_link_extractor;
	this.links = le(this);
};

var generic_link_extractor = function(endpoint)
{
	var _links = null;
	if (endpoint.data.type == 'links') {
		_links = endpoint.data.data;
	} else {
		return object_list_link_extractor(endpoint);
	}

	var links = {};
	for (var name in _links) {
		links[name] = new Link(endpoint.openshift, name, _links[name]);
	}
	return links;
};

var object_list_link_extractor = function(endpoint)
{
	var data = endpoint.data.data;
	var links = {};
	for (var i in data) {
		links[data[i].id] = data[i].links;
	}
	return links;
};

String.prototype.stripRight = function(ch)
{
	var str = this.substr(0);
	while (str.length && str.substr(-1)==='/') {
		str = str.substr(0, str.length - 1);
	}
	return str;
}

OpenShift = function(options) {
	this.cache = {
		//domains: $.cookie('domains')
	};

	var opts = options ? options : {};
	this.auth_token = opts.auth_token;
	this.broker_url = opts.broker_url.stripRight('/');
	this.auth_error = opts.auth_error || function(openshift) {
		console.log('Unauthorized', openshift);
	};
	this.ready = opts.ready || function(openshift){};

	// standard endpoints
	this.api            = null;
	this.authorizations = {};
	this.applications   = {};

	$.getJSON(this.url('api'))
		.success(function(data, status, xhr) {
			console.log('api:', data);
			this.api = new Endpoint(this, data);
			this.ready(this);
		}.bind(this));
};

OpenShift.prototype.url = function(suffix)
{
	return this.broker_url + '/' + suffix + '.json';
};

OpenShift.prototype.list_authorizations = function(options)
{
	console.log("list_authorizations", options);

	var success = function(link, data, status, xhr) {
		this.authorizations = new Endpoint(link.openshift, data);
		if (options && typeof options.success === 'function') {
			options.success(link, data, status, xhr);
		}
	}.bind(this);

	this.api.links.LIST_AUTHORIZATIONS.call(success, options);
};

OpenShift.prototype.get_or_add_authorization = function(options) {
	var tokens = this.authorizations.data.data.filter(
		function (token) {
			return token.note.trim().toLowerCase() === 'getupcloud console' ? token : false;
		});

	if (tokens.length) {
		options.success(tokens[0].token);
	} else {
		this.set_auth_token(null);
		var auth_options = $.extend({}, options);
		auth_options.success = options.success;
		auth_options.data    = {
				scope: 'session',
				reuse: true,
			}
		this.add_authorization(auth_options);
		//TODO: criar token
	}
};

OpenShift.prototype.add_authorization = function(options)
{
	console.log("add_authorization", options);

	var success = function(link, data, status, xhr) {
		if (options && typeof options.success === 'function') {
			options.success(link, data, status, xhr);
		}
	}.bind(this);

	this.api.links.ADD_AUTHORIZATION.call(success, options);
};

OpenShift.prototype.set_auth_token = function(token)
{
	this.auth_token = token;
};

OpenShift.prototype.list_applications = function(options)
{
	console.log("list_applications", options);

	var success = function(link, data, status, xhr) {
		this.applications = new Endpoint(link.openshift, data);
		if (options && typeof options.success === 'function') {
			options.success(link, data, status, xhr);
		}
	}.bind(this);

	this.api.links.LIST_APPLICATIONS.call(success, options);
};

})(jQuery);
