# cs-modbus

Implementation of the Modbus TCP/ASCII/RTU master for node.js.
This module is based on h5.modbus, and contains extensions and improvements
for use with Control Solutions MODBUS products.

## Installation
Install nodejs for your platform (http://nodejs.org)
This will make the `node` and `npm` executables available.

Create a new folder and navigate there in a command prompt.

Add the MODBUS module to your nodejs project
`npm install csllc/cs-modbus.git`

If you intend to use a serial-port based MODBUS connection, you need
`npm install serialport`

## Basic Use
Create a new file (demo.js) in your project folder and insert the following into it:

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

    // The following hooks the transaction complete event, and prints out the result
  t1.on('complete', function(err, response)
  {
    if (err)
    {
      console.error('[Error] %s', err.message);
    }
    else
    {
      console.log(response);
    }
  });
});

```

## Examples

[The examples](example) may be helpful.

In order to run the examples, you should set an environment variable to the name of the serial port that is connected to the MODBUS device.  The method to do this varies by operating system, but as an example, set MODBUS_PORT=COM3 will cause the examples to use COM3.

Alternately, you can edit the examples/config.json file and store the port name there.  Other default configuration settings are stored in config.json as well.

[Ports](example/ports.js) lists all of the serial ports present on the system - which may help identify the correct port to use for the connection.

[Inspect USB](example/inspect-usb.js) is a straightforward approach to opening a serial port connection and querying the device's ID information (ReportSlaveId message).  The various events are hooked to show the progression of a typical message.

## Development
Units tests are provided which include code coverage reports:
`npm test`

## License

This project is released under the
[MIT License](https://raw.github.com/csllc/cs-modbus/master/license.md).
