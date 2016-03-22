/**
 * This example opens the port and reads some registers, using the
 * Register object
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

  var Register = modbus.Register;

  var slaveId = new Register( {
    title: 'Slave ID',
    addr: 0x00,
    length: 0x01,
    format: Register.prototype.value8
  });

  var channelMap = new Register( {
    title: 'Channel Map',
    addr: 0x01,
    length: 0x02,
    format: function( value ) {
      return 'channelMap format';
    }
  });

  var msBetweenStatusTx = new Register( {
    title: 'Status Interval',
    addr: 0x04,
    length: 0x01,
    format: Register.prototype.value16,
    units: 'ms'
  });

  var powerOffSec = new Register( {
    title: 'Power Off',
    addr: 0x05,
    length: 0x01,
    format: Register.prototype.value16,
    units: 's'
  });

  var networkFormation = new Register( {
    title: 'Formation',
    addr: 0x06,
    length: 0x01,
    format: Register.prototype.value16
  });

  var pairingTimeout = new Register( {
    title: 'Pairing Timeout',
    addr: 0x07,
    length: 0x01,
    format: Register.prototype.value16,
    units: 's'
  });

  var config = new Register( {
    title: 'Configuration',
    addr: 0x00,
    length: 0x07,
    set: function( data ) {

      // data is a buffer containing 'length*2' bytes
      slaveId.set( data.readUInt16BE( 0 ));
      channelMap.set( data.readUInt32BE( 2 ));
      msBetweenStatusTx.set( data.readUInt16BE( 6 ));
      powerOffSec.set( data.readUInt16BE( 8 ));
      networkFormation.set( data.readUInt16BE( 10 ));
      pairingTimeout.set( data.readUInt16BE( 12 ));
    },
    format: function() {
      return {
        slaveId: slaveId.format(),
        channelMap: channelMap.format(),
        msBetweenStatusTx: msBetweenStatusTx.format(),
        powerOffSec: powerOffSec.format(),
        networkFormation: networkFormation.format(),
        pairingTimeout: pairingTimeout.format(),
      }
    }

  });

  var t1 = master.readHoldingRegisters( config.addr, config.length, {
    onComplete: function(err, response ) {
      //console.log( err, response );

      config.set( response.values );
      //console.log( slaveId );
      console.log( config.format() );

    }
  } );



  /*var t1 = master.reportSlaveId( {
    unit: 0,
    maxRetries: 3,
    timeout: 100,
    //interval: 100
  });
  */

  //var t1 = master.readFifo8( 0, 50 );

  //var t1 = master.readMemory( 1, 0, 0, 10 );

  //var t1 = master.readObject( 3, {
  //  onComplete: function(err, response ) {
  //    console.log( err, response );
  //  }
 // } );

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
