chrome.extension.sendMessage({action:"tabInfo"}, function(tabInfo){
	// Check if page is using resource coalescing
	if(tabInfo){
		var urls = Array.prototype.map.call(document.styleSheets, function(ss){return ss.href||'';})
		.concat(Array.prototype.map.call(document.scripts, function(s){return s.src||'';}));
		var rc_on = urls.some(function(url){return url.match(/\/resources\/[a-z0-9]+\/(js)?crf/) !== null;});
		tabInfo.rc_on = rc_on;
	}
});



