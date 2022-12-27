const dbus = require('dbus-next');
//const bus = dbus.systemBus();
const VictronInterfaceTree = require('./victronInterfaceTree');


async function main() {
	try{
		let bus = await dbus.systemBus();
		let newTree = await new VictronInterfaceTree(bus, 'com.victronenergy.battery.sk2');
		await newTree.addPath('/ProductName', 'string', 'SKBat');
		await newTree.addPath('/CustomName', 'string', 'SKBattery');
		await newTree.addPath('/Mgmt/Connection', 'string', 'SignalK');
		await newTree.addPath('/Mgmt/ProcessName', 'string', 'SignalK');
		await newTree.addPath('/Mgmt/ProcessVersion', 'string', 'v1.0');
		await newTree.addPath('/Connected', 'int', 1);
		await newTree.addPath('/DeviceInstance', 'int', 101);
		await newTree.addPath('/ProductID', 'int', 0);
		await newTree.addPath('/Serial', 'string', 'SKBAT1');
		await newTree.addPath('/HardwareVersion', 'string', 'v1.0');
		await newTree.addPath('/FirmwareVersion', 'string', 'v.10');
		await newTree.addPath('/Dc/0/Voltage', 'double', 10.5);
		await newTree.addPath('/Info/MaxChargeVoltage', 'double', 15.2);
		await newTree.startService();
	}catch(e){
		console.log(e);
	}
}

main().catch((err) => {
  console.log('Error: ' + err);
});	
