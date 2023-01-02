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
					if (this.pathConfigs[i].hasOwnProperty('min') && this.pathConfigs[i].hasOwnProperty('max')){
						this.serviceTree.addPath(this.pathConfigs[i].path, this.pathConfigs[i].type, this.pathConfigs[i].value, this.pathConfigs[i].min, this.pathConfigs[i].max);
					}else{
						this.serviceTree.addPath(this.pathConfigs[i].path, this.pathConfigs[i].type, this.pathConfigs[i].value);
					}					
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
            try{
				if (node.variant){
					node.variant.value = msg.payload;
					node.busItem.SetValue(node.variant);
					node.status({fill:"green",shape:"ring",text:"sent:" + msg.payload});
				}else{
					async function writeValue() {
						try{
							let obj = await node.bus.getProxyObject(node.service, msg.topic);
							node.busItem = await obj.getInterface('com.victronenergy.BusItem');
							node.variant = await node.busItem.GetValue()
							node.variant.value = msg.payload;
							node.busItem.SetValue(node.variant);
							node.status({fill:"green",shape:"ring",text:"sent:" + msg.payload});
						}catch(e){
							node.status({fill:"red",shape:"ring",text:"error"});
							done(e);
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
					node.status({fill:"green",shape:"ring",text:"sent:" + msg.payload});
				}else{
					async function writeValue() {
						try{
							let obj = await node.bus.getProxyObject(node.service, node.path);
							node.busItem = await obj.getInterface('com.victronenergy.BusItem');
							node.variant = await node.busItem.GetValue()
							node.variant.value = msg.payload;
							node.busItem.SetValue(node.variant);
							node.status({fill:"green",shape:"ring",text:"sent:" + msg.payload});
						}catch(e){
							node.status({fill:"red",shape:"ring",text:"error"});
							done(e);
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
	
	function GetServicePathValue(config) {
        RED.nodes.createNode(this,config);
        var node = this;
		this.service = config.service;
		this.path = config.path;
		this.bus = dbus.systemBus();
		this.busItem = null;
		
		async function GetBusItemInterface() {
			try{
				let obj = await node.bus.getProxyObject(node.service, node.path);
				node.busItem = await obj.getInterface('com.victronenergy.BusItem');
				node.busItem.on('PropertiesChanged', function(dict){
					let msg = {payload: dict.Value.value, topic: node.path, service: node.service};
					node.send(msg);
					node.status({fill:"green",shape:"ring",text:"received:" + msg.payload});
				});
			}catch(e){
				node.status({fill:"red",shape:"ring",text:"error"});
				node.error(e);
				
				setTimeout(() => { GetBusItemInterface(); }, 2000);
			}
		}
		
		GetBusItemInterface();
    }
	
    RED.nodes.registerType("create-service",CreateService);
	RED.nodes.registerType("set-service-value",SetServiceValue);
	RED.nodes.registerType("set-service-path-value",SetServicePathValue);
	RED.nodes.registerType("get-service-path-value",GetServicePathValue);
}
