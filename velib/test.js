const pyshell = require('python-shell').PythonShell;

pyshell.run('test.py', null, function (err) {
	if (err) throw err;
	console.log('finished');
});
