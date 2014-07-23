OpenShift.js
============

Javascript OpenShift API implementation.

It is being released on the early stages, so that people can contribute and drive the development course.

Motivation
==========

We at getupclud.com want to be able to provide our users with a low latency, CDN driven web console interface to our OpenShift infrastructure, and this project will provide the base fundation for that.

Goals
=====

The project aims to build a Javascript interface for OpenShift's RESTful API, providing a async interface with modular authentication mechanism.

Requirements
============

The lib must cope with following requeriments:

* Async interface - all interactions must be provided by a callbakc based  API. No blocking at all.
* Pluggable auth modules - User should be free to choose how to authenticate with OpenShift broker.
* Data centric - all data returned from broker must be easily reached from user callback functions.
* REST API driven interface - module's methods must mimic the original OpenShift's RESTful API.

Preview
=======

In order to use it from a differente domain than your broker's actual address, you must allow CORS to be acessible from your local origin URL. Supose you downloaded this repo and started it with `./run`. When you access http://127.0.0.1:9090, your browser refuses to fire any request to a different host:port combination than 127.0.0.1:9090. This is because a protection mechanism called [CORS](http://en.wikipedia.org/wiki/Cross-origin_resource_sharing) prevents a series of malicious websites to steal data from your browser.

So, you have two options now:

1. Allow CORS on your broker web server (the hard way):
---

Login into your browser instance and add it to file 

    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Headers "authorization"
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    RewriteEngine On
    RewriteCond %{REQUEST_METHOD} OPTIONS
    RewriteRule ^(.*)$ $1 [R=200,L]

2. Disable CORS on your browser (the insecure/easy way)

You cand disable CORS on [Chrome](http://stackoverflow.com/questions/3102819/disable-same-origin-policy-in-chrome) or [Firefox](http://stackoverflow.com/questions/17088609/disable-firefox-same-origin-policy).

> PS: I do not recomend using Internet Explorer because, you know, it's not a real browser. Please don't use it...

Now, execute `./run` and point your browser to [http://127.0.0.1:9090?broker=&lt;your-broker-hostname&gt;](#). It should open a login dialog and list all you apps once you authenticate. The example console uses localStorage from your browser to store a authentication token, use on all requests issued against your broker. That means your username and password are used only during auth/tokenization stages.

