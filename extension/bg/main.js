var pf = {
	/*
	 * TabInfo for CMS hosted sites
	 * - rc_on # resource coalescing on (boolean)
	 * - tabId # tab id from chrome
	 */
	tabInfo:{}
};

//(c) Steven Levithan <stevenlevithan.com>
//MIT License
function parseUri(url) {
	var p=["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
		u={},i=p.length,
		m=/^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/.exec(url);
	while (i--) u[p[i]] = m[i] || "";
	return u;
}

chrome.tabs.onRemoved.addListener(function(tabId) {delete pf.tabInfo[tabId];});

pf.xhr = function(options) {
	var request = new XMLHttpRequest();
	// If caching is an issue add "Cache-Control: no-cache" to bypass proxies
	request.open(options.method || "GET", 
		options.url || location.href,
		true);
	if(options.callback)
		request.onreadystatechange = options.callback;
	request.send(options.body || null);
};

const tab_log = function(json_args) {
  var args = JSON.parse(unescape(json_args));
  console[args[0]].apply(console, Array.prototype.slice.call(args, 1));
}

// Called when a message is passed.  We assume that the content script
// wants to show the page action.
pf.handleRequest = function(request, sender, sendResponse) {
	//console.log("Got request");
	//console.dir(request);
	switch(request.action) {
		case "pageInformation": {
			pf.tabInfo[sender.tab.id].rc_on = request.rc_on;
			// Return nothing to let the connection be cleaned up.
			sendResponse({});
			break;
		}
		case "tabInfo": {
			sendResponse(pf.tabInfo[sender.tab.id]);
			break;
		}
		case "host_update": {
			db.setHost(request, request.isCMS);
			// Return nothing to let the connection be cleaned up.
			sendResponse({});
			break;
		}
		case "host_check": {
			db.checkHost(request, sendResponse);
			return true; // Keep Connection Open - checkHost must call sendResponse
			break;
		}
		case "log": {
			console.log(request.message);
			break;
		}
		case "sendToConsole": {
			chrome.tabs.executeScript(request.tabId, {
				code: "("+ tab_log + ")('" + request.args + "');",
			});
			break;
		}
		// FIXME - replace enableDevtools w/ tabInfo
		case "enableDevtools": {
			// Enable devtools if a CMS hosted tab w/o resource coalescing
			if(request.tabId in pf.tabInfo
					&& !pf.tabInfo[request.tabId].rc_on)
				sendResponse({});
			break;
		}
		default:
		{
			console.log("Unhandled case: " + request.action);
			// Return nothing to let the connection be cleaned up.
			break;
		}
	}
};

// Listen for the content / devtools scripts to send a message to the background page.
chrome.extension.onMessage.addListener(pf.handleRequest);

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (pf.tabInfo[tabId]) {
        chrome.pageAction.show(tabId);
    }
});

var filters = {urls:["*://*/*"], types:["main_frame"]};
// FIXME - track redirects and extra redirect source from headers and store in the tabInfo
chrome.webRequest.onHeadersReceived.addListener(function(details) {
	//console.dir(details);
	//if(details.type != 'main_frame') return;
	var tab = {
		tabId:details.tabId,
		url:details.url,
		method:details.method,
		statusLine:details.statusLine,
		responseHeaders:{},
		rc_on:false
	};
	details.responseHeaders.forEach(function(h){
		if(h.value){
			tab.responseHeaders[h.name]=h.value;
			//console.log(h.name + ": " + h.value);
		}	
	});
	if('X-CMS-Info' in tab.responseHeaders){
		var uri = parseUri(tab.url);
		tab.hostname = uri.host;
		tab.pathname = uri.path;
		pf.tabInfo[tab.tabId]=tab;
	} else if(pf.tabInfo[tab.tabId]){
		delete pf.tabInfo[tab.tabId];
	}
},
// Filters
filters,
["responseHeaders"]
);
