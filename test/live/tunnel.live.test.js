/**
 * Unit test for the Tunnel transport with a real device connected to the port
 *
 * This test will fail unless there is a tunnel-capable MODBUS master connected via the serial port
 * defined in the config.json or the MODBUS_PORT environment variable.
 * 
 * The slaveId of the device and baud rate must be specfied in the config.json or the following 
 * environment variables:
 * MODBUS_BAUDRATE
 * MODBUS_SLAVE
 *
 */
'use strict';


// Test helpers
var expect = require('chai').expect;

// Event/function spies for testing
var sinon = require('sinon');

// Configuration defaults
var config = require('../../config');

// Module which manages the serial port
var serialPortFactory = require('serialport');

// Load the object that handles MODBUS formatting
var MbPort = require('../../lib/index');

// override config file port name if necessary
config.port.name = process.env.MODBUS_PORT || config.port.name;

// override slave id if necessary
config.master.defaultUnit = 
  process.env.MODBUS_SLAVE || config.master.defaultUnit;

// override slave id if necessary
config.port.options.baudrate = process.env.MODBUS_BAUDRATE ||
  config.port.options.baudrate;


// Open the serial port we are going to use
var port = new serialPortFactory.SerialPort(
      config.port.name,
      config.port.options,
      false );

// Set defaults for a tunneling master
config.master.transport.type = 'tunnel';
config.master.maxConcurrentRequests = 2;
config.master.defaultMaxRetries = 0;
config.master.defaultTimeout = 2000;

// Set the serial port we will use
config.master.transport.connection.serialPort = port;

// Create the MODBUS master
var master = MbPort.createMaster( config.master );

/**
 * Pre-test
 *
 * Runs once, before all tests in this block.
 * Calling the done() callback tells mocha to proceed with tests
 *
 */
before(function( done ) {

  // Attach event handler for the port opening
  master.once( 'connected', function () {
    done();
  });

  // Open the port
  port.open(function(err) {
    if( err ) {
      done(err);
    }
  });


  var connection = master.getConnection();

  connection.on('open', function(){
    console.log( '[connection#open]');
  });

  connection.on('close', function(){
    console.log('[connection#close]');
  });

  connection.on('error', function(err){
    console.log('Error: ', '[connection#error] ' + err.message);
  });

  connection.on('write', function(data){
    console.log('[TX] ', data );
  });

  connection.on('data', function(data){
    console.log('[RX] ', data );
  });


});

/**
 * Post-test
 *
 * Runs after all tests in this block are completed
 */
after(function( done ) {
  
  master.destroy();
  port.close();
  done();

});

beforeEach(function( done ) {
  // runs before each test in this block
  done();
});

afterEach(function( done ) {
  // runs after each test in this block
  done();
});


describe('Read Device', function() {

  it('Should read the slave ID ', function(done) {

    var sniff = sinon.spy();

    master.transport.on('sniff', sniff );


    master.reportSlaveId( function( err, response ) {

      expect( err ).to.equal(null);


      setTimeout( done, 5000 );
    });

  });

});

