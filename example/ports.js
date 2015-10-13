/**
 * Prints a list of the available serial ports on this system
 *
 */
'use strict';

// Declare the serial port interface
var portManager = require('serialport');

// Retrieve a list of all ports detected on the system
portManager.list(function (err, ports) {
  if( ports ) {
    // ports is now an array of port descriptions.
    ports.forEach(function(port) {

      // print each port description
      console.log(port.comName +
        ' : ' + port.pnpId + ' : ' + port.manufacturer );

    });
  }
});