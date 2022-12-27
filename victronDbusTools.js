let dbus = require('dbus-next');
let Variant = dbus.Variant;
let VictronInterfaceTree = require('./victronInterfaceTree');

module.exports = function(RED) {
	function CreateService(config) {
        RED.nodes.createNode(this,config);
        var node = this;
		this.serviceName = config.serviceName;		
		this.pathConfigs = config.pathConfigs;
		this.serviceTree = null;
		this.bus = dbus.systemBus();
		
		node.status({fill:"yellow",shape:"ring",text:"stopped"});
        node.on('input', function(msg, send, done) {
			try{
				this.serviceTree = new VictronInterfaceTree(this.bus, this.serviceName);
				for (let i = 0; i < this.pathConfigs.length; i++){
					this.serviceTree.addPath(this.pathConfigs[i].path, this.pathConfigs[i].type, this.pathConfigs[i].value);
				}
				this.serviceTree.startService();
				node.status({fill:"green",shape:"ring",text:"running"});
				
				this.serviceTree.on('error', (err) => {
					node.status({fill:"red",shape:"ring",text:"error"});
					done(err);
				});		
			}catch(e){
				node.status({fill:"red",shape:"ring",text:"error"});
				done(e);
				this.serviceTree.stopService();
			}
        });
		node.on('close', function() {
			if (this.serviceTree){
				this.serviceTree.stopService();
				node.status({fill:"yellow",shape:"ring",text:"stopped"});
			}
		});
    }
	
    function SetServiceValue(config) {
        RED.nodes.createNode(this,config);
        var node = this;
		this.service = config.service;
		node.status({fill:"yellow",shape:"ring",text:"disconnected"});
        node.on('input', function(msg, send, done) {
            var exec = require('child_process').exec;
			var executeString = 'dbus -y ' + this.service + ' ' + msg.topic + ' SetValue ';
			if (typeof msg.payload == 'number'){
				executeString += '%' + msg.payload;
			}else if (typeof msg.payload == 'boolean'){
				if (msg.payload){
					executeString += '%1';
				}else{
					executeString += '%0';
				}
			}else if (typeof msg.payload == 'string'){
				executeString += msg.payload;
			}
			//node.warn(executeString);
			exec(executeString,
				function (error, stdout, stderr) {
					//node.warn(stdout);
					//node.warn(stderr);
					node.status({fill:"green",shape:"ring",text:"sent"});
					if (error !== null) {
						node.status({fill:"red",shape:"ring",text:"error"});
						done(error);
					}
				});
        });
    }
	
	function SetServicePathValue(config) {
        RED.nodes.createNode(this,config);
        var node = this;
		this.service = config.service;
		this.path = config.path;
		this.bus = dbus.systemBus();
		this.busItem = null;
		this.variant = null;
		
		node.status({fill:"yellow",shape:"ring",text:"disconnected"});
        node.on('input', function(msg, send, done) {
            try{
				if (node.variant){
					node.variant.value = msg.payload;
					node.busItem.SetValue(node.variant);
					node.status({fill:"green",shape:"ring",text:"sent"});
				}else{
					async function writeValue() {
						try{
							let obj = await node.bus.getProxyObject(node.service, node.path);
							node.busItem = await obj.getInterface('com.victronenergy.BusItem');
							node.variant = await node.busItem.GetValue()
							node.variant.value = msg.payload;
							node.busItem.SetValue(node.variant);
							node.status({fill:"green",shape:"ring",text:"sent"});
						}catch(e){
							console.log(e);
						}
					}
					
					writeValue();
				}
			}catch(e){
				node.status({fill:"red",shape:"ring",text:"error"});
				done(e);
			}
        });
    }
	
    RED.nodes.registerType("create-service",CreateService);
	RED.nodes.registerType("set-service-value",SetServiceValue);
	RED.nodes.registerType("set-service-path-value",SetServicePathValue);
}
