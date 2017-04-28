
var tab, tabInfo;
var db = chrome.extension.getBackgroundPage().db;
var pf = chrome.extension.getBackgroundPage().pf;
var servers = [];
var serverIndex=0;
var wsPath = localStorage.ws_path || "/ws/browser";
var headers=[];
var tabUL = null;
function init(){
	chrome.tabs.getSelected(null, function(t){
		tab = t;
		tabInfo = pf.tabInfo[tab.id];
		updateCmsInfo(tabInfo);
		loadServers();
	});
	if(localStorage.ui_tabs != "false") {
		var tabDIV = document.createElement("div");
		tabDIV.setAttribute("id", "tabs");
		document.getElementById('content').appendChild(tabDIV);
		tabUL = document.createElement("ul");
		tabDIV.appendChild(tabUL);
	}
}
window.addEventListener('load', init);

var asyncTasks = 2;
function complete() {
	if(--asyncTasks <= 0) {
		try{
			$("#status").slideUp();
			$("#content").slideDown();
			addHeaders();
			if(tabUL != null)
				$("#tabs").tabs();
		}catch(e){
			console.dir(e);
			document.getElementById("content").style.display="block";
			document.getElementById("status").style.display="none";
		}
		
	}
}
function updateCmsInfo(tabInfo) {
	try{
		var cacheInfo = "Unknown",
			rh = tabInfo.responseHeaders,
			cmsInfo = rh["X-CMS-Info"],
			scope = cmsInfo != null ? cmsInfo.replace(/scope=([A-Z]+)/, "$1") : "N/A";
		switch(scope) {
			case "APPLICATION": cacheInfo = "Yes (public)"; break;
			case "SESSION": cacheInfo = "Yes (private)"; break;
			case "REQUEST": cacheInfo = "No"; break;
		}
		$('#cache_info').text(cacheInfo);
		for(var name in rh){
			if(name) headers.push({"key": name, "value": rh[name]});
		}
	}catch(e){
		console.dir(e);
	}
}
function addPluginContent(req) {
	try{
		var rcDebug = $("#rc_debug_con");
		rcDebug.hide();
		if(req.status != 200) {
			var node = startSection("Information");
			rcDebug.show().addClass(getNextPropClass());
			node.appendChild(rcDebug[0]);
			if(req.status == 401) {
				$(node).append('<p class="login_prompt">Login to <a target="vipasuite" href="https://' + servers[serverIndex] + '">Vipa Suite</a> to get more information.</p>');
			}
			setupRCToggle();
			return;
		}
		var result = JSON.parse(req.responseText);
		var config = result.config || {};
		var links = config.links || {};
		for(var section in result) {
			if(section == 'config')
				continue;
			//console.log("Section = " + section);
			var node = startSection(section);
			var sectionEntries = result[section];
			if((typeof sectionEntries == 'string')) {
				// 	HTML
				var sectionContent = document.createElement('div');
				sectionContent.innerHTML = sectionEntries;
				node.appendChild(sectionContent);
			} else {
				for(var key in sectionEntries) {
					var value = sectionEntries[key];
					//console.log(key + " = " + value);
					var newProp = createProp(key, value, links);
					node.appendChild(newProp);
					if(key == "Coalescing") {
						rcDebug.addClass(getNextPropClass());
						node.appendChild(rcDebug[0]);
					}
					// JQUERY Doesn't work on section.
				}
			}
		}
		var rcEnabled = result.Information.Coalescing;
		if(tabInfo !== null && rcEnabled) {
			rcDebug.show();
			if(!tabInfo.rc_on)
				$("#rc_debug").text("true");
			setupRCToggle();
		}

	}catch(e){
		console.dir(e);
	}finally{
		complete();
	}
}
function setupRCToggle() {
	$("#rc_debug_toggle").click(function(){
		var purl, nurl = tab.url;
		nurl = nurl.replace(/cms_rc_debug(=[^&]+)?/,"");
		if(nurl.lastIndexOf("?") == nurl.length-1 || nurl.lastIndexOf("&") == nurl.length-1) 
			nurl = nurl.substring(0,nurl.length-1);
		purl = parseUri(nurl);
		if(purl.query) 
			nurl = nurl + "&";
		else
			nurl = nurl + "?";
		nurl = nurl + "cms_rc_debug";
		if(!tabInfo.rc_on)
			nurl = nurl + "=off";
		tabInfo.rc_on=!tabInfo.rc_on;
		$("#rc_debug").text(!tabInfo.rc_on);
		chrome.tabs.update(tab.id, {url: nurl});
	});
}
function addHeaders() {
	if(!headers || headers.length == 0)
		return;
	var node = startSection("Headers");
	headers.forEach(function(h){
		node.appendChild(createProp(h.key, h.value));
	});
}
var rowCount=0;
function getNextPropClass(){
	return (rowCount++)%2 ? ' even' : ' odd';
}
function startSection(section) {
	rowCount=0;
	var elID = section.replace(/[ ]/, "_");
	var node = document.getElementById(elID);
	if(!node) {
		if(tabUL != null) {
			$(tabUL).append('<li><a href="#' + elID + '">' +  section + '</a></li>');
			$(tabUL.parentNode).append('<div id="' + elID + '"></div>');
		} else {
			node = document.createElement('section');
			node.setAttribute('id', elID);
			node.innerHTML = '<header>' + section + '</header>';
			document.getElementById('content').appendChild(node);
		}
		node = document.getElementById(elID);
	}
	if(section == 'Information') {
		var prop = $('#cache_info_con').show()[0];
		prop.className = prop.className + getNextPropClass();
		node.appendChild(prop);
	}
	if(section == 'Advanced') {
		node.appendChild(createProp('Server Install', '<a target="vipasuite" href="https://' + servers[serverIndex] + '">' + servers[serverIndex] + '</a>'));
	}
	return node;
}

function createProp(key, value, links) {
	links = links || {};
	// This way due to problems with jquery and html5 section elements
	var newProp = document.createElement('div');
	newProp.setAttribute('class', 'prop' + getNextPropClass());
	if( (typeof value == 'string') && value.match(/[<](span|div|label|p)[^>]*/ig)) {
		// HTML
		newProp.innerHTML = '<label>' + key + '</label><div class="value">' +  value + '</div>';	
	} else {
		if(links[key]) {
			value = '<a target="vipasuite" href="' + links[key] + '">' + value + '</a>'; 
		}
		newProp.innerHTML = '<label>' + key + '</label><span class="value">' +  value + '</span>';
	}
	return newProp;
}
function loadServers() {
	db.getInstallServer(tabInfo.hostname, function(response){
		if(response.server)
			servers.push(response.server);
		db.getInstallServers(function(res){
			servers = servers.concat(res);
			loadData();
		});
	});
}
function loadData(){
	try{
		if(tabInfo != null) {
			queryWebService();
		}
	}finally{
		complete();
	}
}
function queryWebService() {
	if(servers.length == 0)
		servers.push("https://vipasuite.com");
	var s = servers[serverIndex];
	//console.log("trying server: " + s);
	pf.xhr({
		url: "https://" + s + wsPath + "?host=" + tabInfo.hostname + "&path=" + tabInfo.pathname + "&petree=" + (localStorage.show_pe_tree||false),
		callback:function(){
				if(this.readyState == 4){
					if(this.status == 404 || this.status == 0/*network error*/) {
						serverIndex++;
						if(servers[serverIndex]){
							queryWebService();
							return;
						}
					} else if(this.status == 200 || this.status == 401) {
						// Found the server installation for this host, save.
						if(serverIndex != 0){
							//console.log("Saving successful connection. Host = " + tabInfo.hostname + ", server = " + servers[serverIndex]);
							db.setInstallServer(tabInfo.hostname, servers[serverIndex]);
						}
					}
					addPluginContent(this);
				}
			}
		});
}

//(c) Steven Levithan <stevenlevithan.com>
//MIT License
function parseUri(url) {
	var p=["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
		u={},i=p.length,
		m=/^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/.exec(url);
	while (i--) u[p[i]] = m[i] || "";
	return u;
};