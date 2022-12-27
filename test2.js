let dbus = require('dbus-next');
let bus = dbus.systemBus();
let Variant = dbus.Variant;

		console.log('Started');
		// getting an object introspects it on the bus and creates the interfaces
		let obj = bus.getProxyObject('com.victronenergy.battery.sk1', '/Dc/0/Voltage');

		// the interfaces are the primary way of interacting with objects on the bus
		let busItem = obj.getInterface('com.victronenergy.BusItem');

		// call methods on the interface
		let newValue = busItem.GetValue()

		console.log('Current Value: ' + newValue);
