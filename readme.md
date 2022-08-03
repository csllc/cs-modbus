# cs-modbus

A package implementing a flexible MODBUS master with extensions for proprietary Control Solutions messages
This module is based on h5.modbus.

## Prerequisites
Install nodejs for your platform (http://nodejs.org)
This will make the `node` and `npm` executables available.

## Configuration
Configuration of the MODBUS master happens mainly when the master is created (.createMaster()).
The options are similar to those supported by h5.modbus, with additional possibilities that make use
of Control Solutions-specific transports and connections.

### Connection Types
The connection type refers to the physical interface used to connect to the device/network.  The supported connection type are:
* `serial`: via a serial (COM) port.  Use the [nodejs serialport module](https://www.npmjs.com/package/serialport) to create and connect to a serial port. Pass the serial port instance to the createMaster call (options.transport.connection.serialPort = serialPortInstance )

* `tcp` connects via TCP/IP network; refer to the tcp options supported by h5.modbus
* `udp` connects via UDP/IP network; refer to the udp options supported by h5.modbus
* `none` uses no connection (can be useful for debugging/test but not much else)
* 'generic' can be used with a number of custom connection types, such as those implemented by
** [@csllc/cs-mb-ble](https://www.npmjs.com/package/@csllc/cs-mb-ble)
** [@csllc/cs-mb-socketcand](https://www.npmjs.com/package/@csllc/cs-mb-socketcand)

### Transports
The transport determines how the MODBUS PDU will be packaged for transmission across the connection. Choices are:
* `ascii` (see h5.modbus) uses standard MODBUS ASCII formatting
* `rtu` (see h5.modbus) uses standard MODBUS RTU formatting
* `ip` (see h5.modbus) uses standard MODBUS TCP formatting
* `tunnel` supports Control Solutions tunneling (see product documentation like CS document *DOC0003824A-SRS-A*)
* `socketcand` supports sending and receiving register PDUs across a socketCANd network

### The MODBUS Master
The "master" object controls the behavior of the MODBUS master.  When created, an options object is passed to the createMaster() function.  It needs the following:
* _transport:_ Determines how messages will be framed and encoded for transport over the connection.  See the Transports section above. 
** _slaveId_ is only used for the _tunnel_ transport; it defines the slave address that cs-modbus will monitor for SLAVE_COMMAND messages.
** _eofTimeout:_ the timeout in milliseconds used to detect the end-of-frame in RTU and tunnel connections.  These transports do not have an explicit end of message indicator; it is provided by measuring idle time on the bus.  This value should be at least 3.5 character times, at the chosen baud rate.  For example, at 19200 this value should be about 20.
** _connection_ defines the physical connection that will be used to communicate with the MODBUS network.
  *** _type:_  See above description of Connection Types
  *** _serialPort:_ (required for _serial_ connections).  Set to an instance of the node-serialport module. 
  *** TCP and UDP connections require additional parameters that are not detailed here; refer to lib/connnections/TcpConnection.js and lib/connections/UdpConnection.js for additional details.  
  *** _device:_ (required for _generic_ connections).  Set to an instance of the communication object. 

* _suppressTransactionErrors:_ (boolean)  determines whether errors detected at the transaction level will throw exceptions (which must be caught by the application code) or not.
* _retryOnException:_ (boolean or Array) determines whether the master will retry the message (up to the effective maxRetries) if the slave returns an exception code, or simply fail the message.  If an array of exception codes is supplied, the master will retry only if the exception is listed in the array.  For example: `retryOnException:[3,4,5]` will retry only exceptions 3,4,or 5.
* _maxConcurrentRequests:_ (integer) determines how many transactions may be attempted simultaneously.  This should be '1' for serial connections using RTU or ASCII transport.  A value of '2' provides an efficiency boost for TUNNEL transport over serial.  TCP and UDP connections can support a higher number of simultaneous transactions.  Note: the application may submit multiple requests to the master without concern for this maximum; additional requests will simply be queued until the connection is able to accept them.
* _defaultUnit:_ (integer): the default MODBUS unit identifier to transmit messages to. Can be overridden on a message-by-message basis.
* _defaultMaxRetries:_ (integer) the number of times to retry an unsuccessful transaction before failing it.  Can be overridden on a message-by-message basis
* _defaultTimeout:_ (integer) the number of milliseconds to wait for a response from the slave. This can be tweaked to maximize performance of a given system depending on the connection speed, etc.  Can be overridden on a message-by-message basis.

## Using cs-modbus to build an application

Create a new folder and navigate there in a command prompt.

Add the MODBUS module to your nodejs project
`npm install @csllc/cs-modbus`

If you intend to use a serial-port based MODBUS connection, you need
`npm install serialport`

### Basic Use
Create a new file (demo.js) in your project folder and insert the following into it:

```
// Include the module
var modbus = require('@csllc/cs-modbus');

// Include the serial port handler, and open /dev/ttyAMA0
// (replace the port name with an appropriate one for your
// system)
var SerialPort = require('serialport');
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


[The examples](example) will be helpful in understanding how to interface to the library.

[Ports](example/ports.js) lists all of the serial ports present on the system - which may help identify the correct port to use for the connection.

[Inspect USB](example/inspect-usb.js) is a straightforward approach to opening a serial port connection and querying the device's ID information (ReportSlaveId message).  The various events are hooked to show the progression of a typical message.

## Development
Clone or fork the repository, and edit the files to make the necessary changes.

Units tests are provided and should be updated for any code changes:
`npm test`

The tests include linting the code with JSHINT, running all unit tests, and producing test coverage reports.

### Style
The module does not at this point use a consistent code style; please follow the convention in the file you are editing, and/or the style as enforced by JSHINT.

### Test Coverage
`npm test` includes generation of code coverage reports.  To view them, review the build/coverage/lcov-report/index.html file.

## License

This project is released under the
[MIT License](https://raw.github.com/csllc/cs-modbus/master/license.md).
