const pyshell = require('python-shell').PythonShell;

let options = {
  mode: 'text',
  pythonPath: 'velib/',
  pythonOptions: ['-u'], // get print results in real-time
  scriptPath: 'path/to/my/scripts',
  args: ["--serviceName com.victronenergy.battery.sk1 -p '/ProductName:string:SK Battery' -p '/CustomName:string:SKBattery' -p '/Mgmt/Connection:string:SignalK' -p '/Mgmt/ProcessName:string:Signalk' -p '/Mgmt/ProcessVersion:string:v1.0' -p '/Connected:int:1' -p '/DeviceInstance:int:100' -p '/ProductID:int:0' -p '/Serial:string:S1' -p '/HardwareVersion:string:v1.0' -p '/FirmwareVersion:string:v1.0' -p '/Dc/0/Voltage:float:13.4'"]
};

pyshell.run('createService.py', options, function (err, results) {
  if (err) throw err;
  // results is an array consisting of messages collected during execution
  console.log('results: %j', results);
});

