# cs-modbus

Implementation of the Modbus TCP/ASCII/RTU master for node.js.
This module is based on h5.modbus, and contains extensions and improvements
for use with Control Solutions MODBUS products.

## Installation
Install nodejs for your platform (http://nodejs.org)

Add the module to your nodejs project
`npm install csllc/cs-modbus.git`

If you intend to use a serial-port based MODBUS connection, you need
`npm install serialport`


The examples in ./node_modules/cs-modbus/examples may be helpful.

## Basic Use

```
// Include the module
var modbus = require('cs-modbus');

// Include the serial port handler, and open /dev/ttyAMA0
// (replace the port name with an appropriate one for your
// system)
var SerialPort = require('serialport').SerialPort;
var serialPort = new SerialPort('/dev/ttyAMA0', {
  baudRate: 9600
});

// Configure the master
// In this case we set up for MODBUS-RTU over the serial port
// we just declared.
var master = modbus.createMaster({
  transport: {
    type: 'rtu',
    connection: {
      type: 'serial',
      serialPort: serialPort
    }
  },
});

// When the master is initialized..
master.once('connected', function()
{
  // Read a set of discrete inputs from the slave device with address 1
  // (the parameters of this command will depend on what
  // kind of slave you are connected to)
  var t1 = master.readDiscreteInputs(0x0000, 8, {
    unit: 1
  });
});

```


## License

This project is released under the
[MIT License](https://raw.github.com/csllc/cs-modbus/master/license.md).
