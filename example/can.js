// Concise example of sending commands via a CANBUS connection

'use strict';

var CanBus = require('../../can-usb-com');
var modbus = require('../lib');

// Create the object that manages the physical connection
var bus = new CanBus({
  canRate: 500000,
  baudRate: 460800,
  j1939: {
    address: 0xD0,
  }
});

// Create the MODBUS master
var master = modbus.createMaster({
  transport: {
    type: 'j1939',
    connection: {
      type: 'generic',
      device: bus
    }
  },
  suppressTransactionErrors: true,
  retryOnException: true,
  maxConcurrentRequests: 1,
  defaultUnit: 0,
  defaultMaxRetries: 10,
  defaultTimeout: 100
});


// Hook events for demo/debug
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

// Hook events for a particular transaction
// Transactions are temporary, and exist only long enough to 
// transfer one PDU 
function hookTransaction( t1 ) {

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
}

// When the master signals that it is connected:
master.once('connected', function()
{

  // send a command to unit 0x80.  t1 is the transaction
  // object that tracks progress of the transaction
  var t1 = master.command( 0xF0, Buffer.from([]), {
    
    // station ID to send the PDU to
    unit: 0x80,

    // how many times we retry if error
    maxRetries: 0,

    // How long should we wait before deciding the transaction has timed out?
    timeout: 128*20,

    // Repeat the transaction until it is canceled.
    //interval: 500
  });


  // var t2 = master.readMemory(0x0380, 128, {
  //   unit: 0,
  //   maxRetries: 0,
  //   timeout: 128*20,
  //   interval: 500
  // });

  // //var t3 = master.writeMemory(0x0319, [ 0x16 ] );

  // var t3 = master.reportSlaveId({ 
  //   timeout: 200,
  //   interval: 500
  // });

  hookTransaction( t1 );
  // hookTransaction( t2 );
  // hookTransaction( t3 );

  setTimeout(
    function()
    {
      t1.cancel();
      //t2.cancel();
      master.destroy();
    },
    500000
  );
});

// Look for a serial port and try to open it.
// The master:connected event will take over from there
bus.list()
.then( function( ports ) {

  // got a list of the ports, try to open the last one which is likely
  // the USB cable
  ports = ports.slice(-1);

  // Open the COM port and initialize the USBCAN device...
  return bus.open( ports[0].comName );
  
})
.catch( function( err ){
  console.error( err );
  process.exit(1);
});



