'use strict';

// Concise example of reading `8` discrete inputs starting from address `0x0000`
// from a slave via a CANBUS/socketcand connection
//
// Note: this example connects to a Control Solutions proprietaty system, not 
// a standard MODBUS slave.  It is only useful with specific Control Solutions 
// products

// library for communicating with CANBUS
var SocketCan = require('cs-mb-socketcand');
var conn = new SocketCan();

var modbus = require('../lib');

var master = modbus.createMaster({
  transport: {
    type: 'socketcand',
    connection: {
      type: 'generic',
      device: conn
    }
  },
  suppressTransactionErrors: true,
  retryOnException: true,
  maxConcurrentRequests: 1,
  defaultUnit: 200,
  defaultMaxRetries: 0,
  defaultTimeout: 4000
});

//  Wait for a CAN network to be detected as a result of scanning
conn.on('discover', function( bus ) {

  console.log( 'Discovered '+ bus.name + ' at ' + bus.url  );

  conn.stopScanning();

  conn.connect( bus )
  .then( function() {

    console.log( 'Connected to ', bus.bus );

    conn.registerDevice( 200 );

    conn.on('status', function( id, from, data ){
      console.log( 'Status ', id + ' from ' + from + ': ', data );
    });

    // the 'connect' event will also be emitted by conn, which
    // will be detected by the modbus MASTER, and the modbus stuff
    // will take things from there
  })
  .catch( function( err ) {
    console.log( 'Caught error ', err );

    // try again
    setTimeout( conn.startScanning, 5000 );

  });

});

var transport = master.getTransport();

transport.on('request', function(transaction)
{
  console.log('[transport#request] %s', transaction.getRequest());
});


var connection = master.getConnection();

connection.on('write', function(data)
{
  console.log('[connection#write] %s', data );
});

// When the MODBUS master knows he is connected, we can send MODBUS commands
master.once('connected', function()
{
  var t1 = master.readMemory( 0x0319, 1, {
    unit: 200,

    //timeout: 1000,
    
    onComplete: function(err, response)
    {
      if (err)
      {
        console.error(err.message);
      }
      else
      {
        console.log(response.toString());
      }
    }
  });

  var t2 = master.writeMemory( 0x0319, [0x10], {
    unit: 200,

    //timeout: 1000,
    
    onComplete: function(err, response)
    {
      if (err)
      {
        console.error(err.message);
      }
      else
      {
        console.log(response.toString());
      }
    }
  });

  setTimeout(
    function()
    {
      t1.cancel();
      t2.cancel();
      master.destroy();
      process.exit();
    },
    5000
  );
});

// look for a network.  The events will take it from here
conn.startScanning();

