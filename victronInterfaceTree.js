const EventEmitter = require('events').EventEmitter;
const dbus = require('dbus-next');
const Variant = dbus.Variant;
	
const {
  Interface, property, method, signal, DBusError,
  ACCESS_READ, ACCESS_WRITE, ACCESS_READWRITE
} = dbus.interface;

const dbusTypeDict = {
	'byte': 'y', 
	'boolen': 'b',
	'bool': 'b',
	'int16': 'n',
	'uint16': 'q',
	'int32': 'i',
	'int': 'i',
	'uint32': 'u',
	'int64': 'x',
	'uint64': 't',
	'double': 'd',
	'number': 'd',
	'float': 'd',
	'string': 's',
	'object_path': 'o',
	'signature': 'g',
	'unix_fd': 'h',
	'array': 'a',
	'struct': '(',
	'variant': 'v',
	'object': 'v',
	'dict_entry': '{'
}

class VictronInterfaceTree extends EventEmitter {
	constructor(bus, serviceName){
		super();
		this.bus = bus;
		this.serviceName = serviceName;
		this.nodes = {};
		this.serviceStarted = false;
		
		this.bus.on('error', (err) => {
		  // forward network and stream errors
		  this.emit('error', err);
		});
	}
	
	startService(){
		for (const [key, value] of Object.entries(this.nodes)) {
			this.bus.export(key, value);
		}
		this.bus.requestName(this.serviceName);
		this.serviceStarted = true;
	}
	
	stopService(){
		this.bus.releaseName(this.serviceName);
		for (const [key, value] of Object.entries(this.nodes)) {
			this.bus.unexport(key, value);
		}
		this.serviceStarted = false;
	}
	
	disconnectService(){
		this.bus.disconnect();
	}
	
	addPath(path, type, initialValue){
		if (!path.includes('/')) throw new Error('invalid path ' + path + ' no / found');
		
		let signature = '';
		if (type.length === 1) {
			signature = type;
		}else{
			if (type in dbusTypeDict){
				signature = dbusTypeDict[type];
			}else{
				throw new Error('no signature found for type ' + type);
			}
		}
		
		let pathParts = path.split('/');

		let rootInterface = null;

		let addedNodes = {};
		
		if ('/' in this.nodes){
			rootInterface = this.nodes['/'];
		}else{
			rootInterface = new VictronRootInterface('com.victronenergy.BusItem', this);
			this.nodes['/'] = rootInterface;
			addedNodes['/'] = rootInterface;
		}		

		let currentPath = '';
		for (let i = 1; i < pathParts.length; i++){
			currentPath += '/' + pathParts[i];
			if (!(currentPath in this.nodes)){
				if (i === pathParts.length - 1){
					let itemInterface = new VictronItemInterface('com.victronenergy.BusItem', path, signature, initialValue);
					this.nodes[currentPath] = itemInterface;
					addedNodes[currentPath] = itemInterface;
				}else{
					let subInterface = new VictronSubInterface('com.victronenergy.BusItem', currentPath, this);
					this.nodes[currentPath] = subInterface;
					addedNodes[currentPath] = subInterface;
				}
				
			}
		}
		
		if (this.serviceStarted){
			for (const [key, value] of Object.entries(addedNodes)) {
				this.bus.export(key, value);
				if (value instanceof VictronItemInterface){
					value.PropertiesChanged();
				}
			}
		}
	}
}

class VictronRootInterface extends Interface {
	constructor (name, tree) {
		super(name);
		this.tree = tree;
	}
	
	GetValue(){
		let dict = {};
		for (let key in this.tree.nodes){
			if (this.tree.nodes[key] instanceof VictronItemInterface){
				dict[key.substring(1)] = this.tree.nodes[key].GetValue();
			}
		}
		
		return new Variant('a{sv}', dict);
	}
	
	GetText(){
		let dict = {};
		for (let key in this.tree.nodes){
			if (this.tree.nodes[key] instanceof VictronItemInterface){
				dict[key.substring(1)] = this.tree.nodes[key].GetText();
			}
		}
		
		return new Variant('a{ss}', dict);
	}
	
	GetItems(){
		let dict = {};
		for (let key in this.tree.nodes){
			if (this.tree.nodes[key] instanceof VictronItemInterface){
				dict[key] = { Text: new Variant('s', this.tree.nodes[key].GetText()), Value: new Variant('v', this.tree.nodes[key].GetValue())};
			}
		}
		
		return dict;
	}
	
	ItemsChanged(){
		//needs to be added
	}
}

VictronRootInterface.configureMembers({
	methods:{
		GetValue: {
			inSignature: '',
			outSignature: 'v'
		},
		GetText: {
			inSignature: '',
			outSignature: 'v'
		},
		GetItems: {
			inSignature: '',
			outSignature: 'a{sa{sv}}'
		}
	},
	signals: {
		ItemsChanged: {
			signature: 'a{sa{sv}}'
		}
	}
});

class VictronSubInterface extends Interface {
	constructor (name, path, tree) {
		super(name);
		this.tree = tree;
		this.path = path;
	}
	
	GetValue(){
		let dict = {};
		for (let key in this.tree.nodes){
			if (this.tree.nodes[key] instanceof VictronItemInterface && key.includes(this.path)){
				dict[key.replace(this.path, '').substring(1)] = this.tree.nodes[key].GetValue();
			}
		}
		
		return new Variant('a{sv}', dict);
	}
	
	GetText(){
				let dict = {};
		for (let key in this.tree.nodes){
			if (this.tree.nodes[key] instanceof VictronItemInterface && key.includes(this.path)){
				dict[key.replace(this.path, '').substring(1)] = this.tree.nodes[key].GetText();
			}
		}
		
		return new Variant('a{ss}', dict);
	}
}

VictronSubInterface.configureMembers({
	methods:{
		GetValue: {
			inSignature: '',
			outSignature: 'v'
		},
		GetText: {
			inSignature: '',
			outSignature: 'v'
		}
	}
});

class VictronItemInterface extends Interface {	
	constructor (name, path, signature, initialValue) {
		super(name);
		this.itemValue = new Variant(signature, initialValue);
		this.path = path; 
	}
	
	SetValue(value){
		if (value instanceof Variant && value.signature === this.itemValue.signature && this.itemValue.value != value.value){
			this.itemValue.value = value.value;
			this.PropertiesChanged();
			return 0;
		}
		return 1;
	}
	
	GetDescription(language, length){
		return '';
	}
	
	GetValue(){
		return this.itemValue;
	}
	
	GetText(){
		return this.itemValue.value.toString();
	}
	
	PropertiesChanged(){
		let dict = {Value: this.GetValue(), Text: new Variant('s', this.GetText())};
		return dict;
	}
}

VictronItemInterface.configureMembers({
	methods:{
		SetValue: {
			inSignature: 'v',
			outSignature: 'i'
		},
		GetDescription: {
			inSignature: 'si',
			outSignature: 's'
		},
		GetValue: {
			inSignature: '',
			outSignature: 'v'
		},
		GetText: {
			inSignature: '',
			outSignature: 's'
		}
	},
	signals: {
		PropertiesChanged: {
			signature: 'a{sv}'
		}
	}
});

module.exports = VictronInterfaceTree;
