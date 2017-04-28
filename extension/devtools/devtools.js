try{

var noopFunc = function(response){};
function createRequest(a){
	return {action: a, tabId: chrome.devtools.inspectedWindow.tabId};
}
function log1(message){
	var req = createRequest('log');
	req.message = message;
	chrome.extension.sendMessage(req);
}
function Console() {
}
Console.Type = {
  LOG: "log",
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
  GROUP: "group",
  GROUP_COLLAPSED: "groupCollapsed",
  GROUP_END: "groupEnd"
};

Console.addMessage = function(type, format, args) {
  chrome.extension.sendMessage({
      action: "sendToConsole",
      tabId: chrome.devtools.inspectedWindow.tabId,
      args: escape(JSON.stringify(Array.prototype.slice.call(arguments, 0)))
  });
};

// Generate Console output methods, i.e. Console.log(), Console.debug() etc.
(function() {
  var console_types = Object.getOwnPropertyNames(Console.Type);
  for (var type = 0; type < console_types.length; ++type) {
    var method_name = Console.Type[console_types[type]];
    Console[method_name] = Console.addMessage.bind(Console, method_name);
  }
})();
//log1('Logging5 ' + chrome.devtools.inspectedWindow.tabId);
function resourceModified(resource, newContent){
	Console.log('Resource modified.');
	Console.log(resource);
	Console.log(newContent);
}
//log1('Logging6 ' + chrome.devtools.inspectedWindow.tabId);
function enableDevtools(){
	log1('Starting Devtools On CMS Hosted Page');
	Console.log('Starting Devtools On CMS Hosted Page');
	// TODO - add support for Elements panel sidebar for CMS Component information.
	chrome.devtools.inspectedWindow.onResourceContentCommitted.addListener(resourceModified);
	chrome.devtools.panels.create('CMS Resources',
            'icons/icon-64x24.png',
            'devtools/resources.html',
            function(panel) {  
				var btn = panel.createStatusBarButton('icons/icon-64x24.png', 'Testing a tooltip', false);
			});
}

var req = createRequest('enableDevtools');
chrome.extension.sendMessage(req, enableDevtools);

	
}catch(e){
	log1('Error: ' + e);
}
	



