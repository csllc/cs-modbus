/**
 * Example using a Bluetooth low energy connection.
 * This requires the cs-ble-controller library or similar to make the connection
 * 
 */
'use strict';

// Concise example of reading `8` discrete inputs starting from address `0x0000`
// from a MODBUS slave connected through a bluetooth port (all configuration
// options are explicitly set to default values).

var ble = require('cs-ble-controller');
var modbus = require('../lib');


// Wait for the bluetooth hardware to become ready
ble.once('stateChange', function(state) {

  console.log( 'ble#stateChange: ' + state );

  if(state === 'poweredOn') {

    // Listen for the first device found
    ble.once('discover', function( peripheral ) {

      ble.stopScanning();

      // Create a new controller associated with the discovered peripheral
      var device = new ble.Controller( peripheral );

      runExample( device );

    });

    // start looking for bluetooth devices
    ble.startScanning();

  }

});


function runExample( device ) {

  var master = modbus.createMaster({
    transport: {
      type: 'ip',
      connection: {
        type: 'ble',
        device: device
      }
    },
    suppressTransactionErrors: false,
    retryOnException: true,
    maxConcurrentRequests: 1,
    defaultUnit: 0,
    defaultMaxRetries: 3,
    defaultTimeout: 100
  });

  device.on('connected', function() {
    console.log( '[device#connected]');
  });

  device.on('disconnected', function() {
    console.log( '[device#connected]');
  });

  device.on('connected', function() {
    console.log( '[device#connected]');
  });

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
    var t1 = master.readDiscreteInputs(0x0000, 8, {
      unit: 0,
      maxRetries: 3,
      timeout: 1000,
      interval: 100
    });

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
        process.exit(0);
      },
      5000
    );
  });


  // now connect to the device and let event handlers take over
  device.connect()
  .catch( function( err ) { 
    console.log( '[device#error]', err );
  });


}

