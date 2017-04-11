#!/usr/bin/env node
/**
 * Scans all serial ports to find attached MODBUS devices
 *
 */
'use strict';

// get application path
var path = require('path');

// console text formatting
var chalk = require('chalk');

// command-line options will be available in the args variable
var args = require('minimist')(process.argv.slice(2));

// Configuration defaults
var config = require('./config');

// Module which manages the serial port
var SerialPortFactory = require('serialport');

// Load the object that handles communication to the device
var ModbusPort = require('./lib/index');

// override slave id to broadcast
config.master.defaultUnit = 0;


if( args.h ) {
  console.info( '\r--------MODBUS Port Scan----------');
  console.info( 'Attempts to check each serial port for a MODBUS device\r');
  console.info( '\rCommand format:\r');
  console.info( path.basename(__filename, '.js') + '[-h]\r');

  console.info( chalk.underline( '\rOptions\r'));
  console.info( '    -h          This help output\r');

  process.exit(0);
}

// Retrieve a list of all the ports on the machine
SerialPortFactory.list(function (err, ports) {

ports = ports.slice(-2);
console.log(ports);
  var numPorts = ports.length;

  ports.forEach(function(port) {
    console.log('opening ' + port.comName, config.port.options );

    config.port.options.autoOpen = false;
    var serialport = new SerialPortFactory( 
      port.comName, config.port.options);

    // Make serial port available for the modbus master
    config.master.transport.connection.serialPort = serialport;

    // Create the MODBUS master
    var master = ModbusPort.createMaster( config.master );

    try{
    serialport.open( function(error) {
      if( error ) {
        console.error( chalk.bold(port.comName) + 
          ': Unable to open(' + error + ')');
        numPorts--;
        if( 0 === numPorts ) {
          process.exit();
        }
      }
    });
}
catch( e ) {
  console.log( 'caught ' + e);
  numPorts--;
}
    // When the master is connected...
    master.once( 'connected', function () {

      // query the slave
      master.reportSlaveId({ maxRetries: 0, 
        onComplete: function(err, response) {
        if( err) {
          console.log( chalk.bold(port.comName) + ': No device found' );
        }
        else {
          console.log( port.comName + ': ' + response.toString() );
        }

        master.destroy();
        serialport.close();

        numPorts--;
        if( 0 === numPorts ) {
          process.exit();
        }

      }});

    });

  });

});

