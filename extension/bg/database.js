var db = {
	error: function(tx, err) {
		console.log("Error");
		console.dir(err);
	},
	success: function(tx, r) {
		//console.log("Success");
		//console.dir(r);
	}
};

db.VSExtension = openDatabase("PFExtension", "1.0", "Proteus Framework Extension Database", 20*1024*1024);
chrome.runtime.onInstalled.addListener(function(details) {
	db.VSExtension.transaction(function(tx){
		tx.executeSql('CREATE TABLE IF NOT EXISTS '
				+ ' host_check(host TEXT PRIMARY KEY, pf TINYINT, checked INTEGER)',
				[], db.success, db.error);
		tx.executeSql('CREATE INDEX IF NOT EXISTS hc_host_time ON host_check (host, checked)', 
				[], db.success, db.error);
		tx.executeSql('CREATE TABLE IF NOT EXISTS '
				+ ' install_server(host TEXT PRIMARY KEY, install TEXT)', 
				[], db.success, db.error);
		/*tx.executeSql('CREATE INDEX IF NOT EXISTS is_host ON install_server (host)', 
			[], db.success, db.error);*/
	});	
});
db.hostCheckInterval = 1000*60*60*24*5;
db.checkHost = function(request, sendResponse) {
	db.VSExtension.transaction(function(tx){
		tx.executeSql("SELECT pf FROM host_check WHERE host = ? AND checked > ?",
				[request.hostname, new Date().getTime() - db.hostCheckInterval], 
				function(tx, r){
					var row = r.rows.length > 0 ? r.rows.item(0) : null, 
							o ={isCMS:null};
					if(row != null) {
						o.isCMS = row.vs == 1;
					}
					sendResponse(o);
				},
				function(tx, err){
					console.dir(err);
					sendResponse({});
				}); 
	});
};
db.setHost = function(request, isCMS) {
	db.VSExtension.transaction(function(tx){
		tx.executeSql("REPLACE INTO host_check (host, pf, checked) VALUES(?,?,?)",
				[request.hostname, isCMS ? 1 : 0, new Date().getTime()],
				db.success,
				db.error
				);
	});
};
db.cleanupHosts = function () {
	db.VSExtension.transaction(function(tx){
		tx.executeSql("DELETE FROM host_check WHERE checked < ?",
				[new Date().getTime() - db.hostCheckInterval],
				db.success,
				db.error
				);
	});
};
db.removeInstallServer = function(server) {
	db.VSExtension.transaction(function(tx){
		tx.executeSql("DELETE FROM install_server WHERE install = ?",
				[server],
				db.success,
				db.error
				);
	});
};
db.setInstallServer = function(host, server) {
	db.VSExtension.transaction(function(tx){
		tx.executeSql("REPLACE INTO install_server (host, install) VALUES(?,?)",
				[host, server],
				db.success,
				db.error
				);
	});
};
db.getInstallServer = function(host, sendResponse) {
	db.VSExtension.transaction(function(tx){
		tx.executeSql("SELECT install FROM install_server WHERE host = ? ",
			[host], 
			function(tx, r){
				var row = r.rows.length > 0 ? r.rows.item(0) : null, o ={server:null};
				if(row != null) {
					o.server = row.install;
				}
				sendResponse(o);
			},
			function(tx, err){
				console.dir(err);
				sendResponse({});
			}); 
	});
};
db.getInstallServers = function(sendResponse) {
	db.VSExtension.transaction(function(tx){
		tx.executeSql("SELECT install FROM install_server WHERE host = install ORDER BY length(host)",
			[], 
			function(tx, r){
				var res=[],i,ib;
				for(i=0, ib = r.rows.length; i < ib; i++){
					res.push(r.rows.item(i).install);
				}
				if(res.length == 0) {
					// Set defaults
					res = ["vipasuite.com", "draft.vipasuite.com", "qa.vipasuite.com"];
					for(i=0, ib = res.length; i < ib; i++){
						db.setInstallServer(res[i], res[i]);
					}
				}
				sendResponse(res);
			},
			function(tx, err){
				console.dir(err);
				sendResponse({});
			}); 
	});
};

(function() {
	var minutes = 60*4;
	chrome.alarms.create('CleanupHosts', {
		delayInMinutes:minutes,
		periodInMinutes:minutes
	});
	chrome.alarms.onAlarm.addListener(function(alarm) {
		if('CleanupHosts' == alarm.name) db.cleanupHosts();
	});
})();
