/**
 * This example opens a MODBUS USB connection and reads the device information
 *
 */
'use strict';

// Serial port interface
var SerialPort = require('serialport').SerialPort;

// Modbus interface
var modbus = require('../lib');

// Read config.json file
var config = require('../config');

// use the port specified in the environment, or fall back to config file.
config.port.name = process.env.MODBUS_PORT || config.port.name;

var serialPort;

if( config.master.transport.connection.type === 'serial') {

  // Create and open a serial port for the master to use
  serialPort = new SerialPort(config.port.name, config.port.options );

  config.master.transport.connection.serialPort = serialPort;

}


var master = modbus.createMaster(config.master );


// Hook all the events so we can see what happens
master.on('connected', function()
{
  console.log('[master#connected]');
});

master.on('disconnected', function()
{
  console.log('[master#disconnected]');
});

master.on('error', function(err)
{
  console.error('[master#error] %s', err.message);
});

var connection = master.getConnection();

connection.on('open', function()
{
  console.log('[connection#open]');
});

connection.on('close', function()
{
  console.log('[connection#close]');
});

connection.on('error', function(err)
{
  console.log('[connection#error] %s', err.message);
});

connection.on('write', function(data)
{
  console.log('[connection#write]', data);
});

connection.on('data', function(data)
{
  console.log('[connection#data]', data);
});

var transport = master.getTransport();

transport.on('request', function(transaction)
{
  console.log('[transport#request] %s', transaction.getRequest());
});

master.once('connected', function()
{
  /*var t1 = master.reportSlaveId( {
    unit: 0,
    maxRetries: 3,
    timeout: 100,
    //interval: 100
  });
  */

  //var t1 = master.readFifo8( 0, 50 );

  //var t1 = master.readMemory( 1, 0, 0, 10 );

  var t1 = master.readObject( 3, {
    onComplete: function(err, response ) {
      console.log( err, response );
    }
  } );

  t1.on('timeout', function()
  {
    console.error('[transaction#timeout]');
  });

  t1.on('error', function(err)
  {
    console.error('[transaction#error] %s', err.message);
  });

  t1.on('response', function(response)
  {
    if (response.isException())
    {
      console.error('[transaction#response] %s', response);
    }
    else
    {
      console.log('[transaction#response] %s', response);
    }
  });

  t1.on('complete', function(err, response)
  {
    if (err)
    {
      console.error('[transaction#complete] %s', err.message);
    }
    else
    {
      console.log('[transaction#complete] %s', response);
    }
  });

  t1.on('cancel', function()
  {
    console.log('[transaction#cancel]');
  });

  setTimeout(
    function()
    {
      t1.cancel();
      master.destroy();
    },
    5000
  );
});
