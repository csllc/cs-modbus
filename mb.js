#!/usr/bin/env node
/**
 * Example/demo for Control Solutions Advanced Control MODBUS interface package
 *
 * Run the demo from the command line.  The port settings in the config.json
 * file will be used to connect to the ACN device and execute the command.
 * If defined, the MODBUS_PORT environment variable will override the port identified
 * in the config.json file.
 *
 */
'use strict';

// get application path
var path = require('path');

// misc utilities
var util = require('util');

// console text formatting
var chalk = require('chalk');

// command-line options will be available in the args variable
var args = require('minimist')(process.argv.slice(2));

// Configuration defaults
var config = require('./config');

// Keep track of mode for output purposes (boolean)
var isAscii = (config.master.transport.type === 'ascii');

// Module which manages the serial port
var serialPortFactory = require('serialport');

// logging helper module
var winston = require('winston');

// Load the object that handles communication to the device
var ModbusPort = require('./lib/index');

// use environment variable for port name if specified
config.port.name = process.env.MODBUS_PORT || config.port.name;

if( args.h || args._.length < 2 ) {
  console.info( '\r--------MODBUS Utility: ' + config.port.name + '----------');
  console.info( 'Reads or writes from an MODBUS device\r');
  console.info( 'See config.json for connection configuration.\r');
  console.info( '\rCommand format:\r');
  console.info( path.basename(__filename, '.js') + '[-h -v] action [type] [...]\r');
  console.info( '    action: read/write\r');
  console.info( '    type: what sort of item\r');
  console.info( chalk.bold('        coil') + ' [start] [quantity]' );
  console.info( chalk.bold('        discrete') + ' [start] [quantity]');
  console.info( chalk.bold('        holding') + ' [start] [quantity]');
  console.info( chalk.bold('        input') + ' [start] [quantity]');
  console.info( chalk.bold('        slave'));
  console.info( chalk.bold('        fifo') + ' [id] [max]');
  console.info( chalk.bold('        object') + ' [id]');
  console.info( chalk.bold('        memory') + ' [type] [page] [address] [length]');
  console.info( chalk.underline( '\rOptions\r'));
  console.info( '    -h          This help output\r');
  console.info( '    -v          Verbose output (for debugging)\r');
  console.info( chalk.underline( '\rResult\r'));
  console.info( 'Return value is 0 if successful\r');
  console.info( 'Output may be directed to a file\r');
  console.info( '    e.g. ' + chalk.dim('mb read object 1 >> myConfig.json') + '\r');

  process.exit(0);
}

//console.log(args);
// Check the action argument for validity
var action = args._[0];
var type;

if( ['read', 'write'].indexOf( action ) < 0 ) {
  console.error(chalk.red( 'Unknown Action ' + action + ' Requested'));
}


//
// Configure the serial port logger
// This logs to the console only if the -v option is used
// Logs to a file if the --log option is used
//
winston.loggers.add('serial');

var serialLog = winston.loggers.get('serial');
serialLog.remove(winston.transports.Console);
if( args.v ){
  serialLog.add(winston.transports.Console, {
      level: 'silly',
      colorize: true,
      label: 'serial'
  });
}
if( args.log > '' ){
  serialLog.add(winston.transports.File, { filename: args.log });
}


//
// Configure the transport logger
// This logs to the console always
// Logs to a file if the --log option is used
//

winston.loggers.add('transaction',{
    console: {
      level: 'silly',
      colorize: true,
      label: 'transaction'
    },
});
var transLog = winston.loggers.get('transaction');
if( args.log > '' ){
  transLog.add(winston.transports.File, { filename: args.log });
}


/**
 * Clean up and exit the application.
 *
 * @param  {[type]} code [description]
 * @return {[type]}      [description]
 */
function exit(code) {

  master.destroy();

  process.exit(code);
}

/**
 * If error, print it, otherwise print the result as an object dump
 * @param  {err}
 * @return null
 */
function output( err, response ) {
  if( err ) {
    //console.log( chalk.red( err.message ) );
    exit(1);
  }
  else {
    //console.log(response);
    exit(0);
  }
}


// Open the serial port we are going to use
var port = new serialPortFactory.SerialPort( config.port.name, config.port.options, false );

// Make serial port available for the modbus master
config.master.transport.connection.serialPort = port;

// Create the MODBUS master
var master = ModbusPort.createMaster( config.master );


// Attach event handler for the port opening
master.once( 'connected', function () {

  // Now do the action that was requested
  switch( action ) {

    case 'read':
      // Validate what we are supposed to get
      var type = args._[1] || 'unknown';

      switch( type ) {

        case 'coil':
          var address = args._[2] || 0;
          var quantity = args._[3] || 1;
          master.readCoils( address, quantity, output );
          break;

        case 'discrete':
          var address = args._[2] || 0;
          var quantity = args._[3] || 1;
          master.readDiscreteInputs( address, quantity, output );
          break;

        case 'holding':
          var address = args._[2] || 0;
          var quantity = args._[3] || 1;
          master.readHoldingRegisters( address, quantity, output );
          break;

        case 'input':
          var address = args._[2] || 0;
          var quantity = args._[3] || 1;
          master.readInputRegisters( address, quantity, output );
          break;

        case 'slave':
          master.reportSlaveId( output );
          break;

        case 'fifo':
          var id = args._[2] || 0;
          var max = args._[3] || 250;
          master.readFifo8( id, max, output );
          break;

        case 'object':
          var id = args._[2] || 0;
          master.readObject( id, output );
          break;

        case 'memory':
          var type = args._[2] || 0;
          var page = args._[3] || 0;
          var address = args._[4] || 0;
          var length = args._[5] || 250;
          master.readMemory( type, page, address, length, output );
          break;

        default:
          console.error( chalk.red('Trying to read unknown item ' + type ));
          exit(1);
          break;
      }

      break;

    case 'set':
      // Validate what we are supposed to set
      var type = args._[1] || 'unknown';

      switch( type ) {
        case 'coil':
          var address = args._[2] || 0;
          var value = args._[3] || 1;
          master.writeSingleCoil( address, value, output );
          break;

        case 'holding':
          var address = args._[2] || 0;
          var value = args._[3] || 1;
          master.writeSingleRegister( address, value, output );
          break;

        case 'fifo':
          var id = args._[2] || 0;
          var value = args._[3] || 0;
          master.writeFifo8( id, [value], output );
          break;

        //case 'object':
        //  var id = args._[2] || 0;
        //  master.writeObject( id, output );
        //  break;

        //case 'memory':
        //  var type = args._[2] || 0;
        //  var page = args._[3] || 0;
        //  var address = args._[4] || 0;
        //  var length = args._[5] || 250;
        //  master.writeMemory( type, page, address, length, output );
        //  break;

        default:
          console.error( chalk.red('Trying to write unknown item ' + type ));
          exit(1);
          break;

      }

      break;

    default:
      console.error( chalk.red('Unknown action: ' + action ));
      break;
  }

});

// port errors
port.on('error', function( err ) {
  console.error( chalk.underline.bold( err.message ));
});

// Hook events for logging

var connection = master.getConnection();

connection.on('open', function(){
  serialLog.info( '[connection#open]');
});

connection.on('close', function(){
  serialLog.info('[connection#close]');
});

connection.on('error', function(err){
  serialLog.error('Error: ', '[connection#error] ' + err.message);
});

connection.on('write', function(data){
  if( isAscii ) {
    serialLog.info('[TX] ' + data.toString());
  }
  else {
    serialLog.info('[TX] ', util.inspect( data ) );
  }
});

connection.on('data', function(data){
  if( isAscii ) {
    serialLog.info('[RX] ' + data.toString());
  }
  else {
    serialLog.info('[RX] ', util.inspect(data ));
  }
});

var transport = master.getTransport();

// catch event when a transaction starts.  Hook the events for logging
transport.on('request', function(transaction)
{

  transaction.once('timeout', function()
  {
    transLog.warn('[timeout]');
  });

  transaction.once('error', function(err)
  {
    transLog.error('[error] %s', err.message);
  });

  transaction.once('response', function(response)
  {
    if (response.isException())
    {
      transLog.error('[response] %s', response);
    }
    else
    {
      transLog.info(response.toString());
    }
  });

  transaction.once('complete', function(err, response)
  {
    if (err)
    {
      transLog.error('[complete] %s', err.message);
    }
    else
    {
      transLog.info('[complete] %s', response);
    }
  });

  transaction.once('cancel', function()
  {
    transLog.warn('[cancel]');
  });


  transLog.info( transaction.getRequest().toString());
});



// Open the port
// the 'open' event is triggered when complete
if( args.v ) {
  serialLog.info( 'Opening ' + config.port.name );
}

port.open(function(err) {
  if( err ) {
    console.log(err);
  }
});


