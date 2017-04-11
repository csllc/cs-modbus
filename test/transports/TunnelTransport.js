/**
 * Unit test for TunnelTransport
 *
 * A mocked connection (fake 'master') is used to simulate the remote device
 *
 *
 */

/*global describe:false,it:false*/

'use strict';

var expect = require('chai').expect;
var should = require('chai').should;
var util = require('util');

var LIB_DIR = (process.env.LIB_FOR_TESTS_DIR || '../../lib');
//var TunnelTransport = require(LIB_DIR + '/transports/TunnelTransport');
var Connection = require(LIB_DIR + '/Connection');
var MB = require(LIB_DIR +'/index');

// The tunnel Function Code
var SLAVE_COMMAND = 71;

/**
 * Create a mock connection object so we don't have to actually have a remote device to do this test
 *
 * This acts a lot like a SerialConnection
 * @constructor
 * @extends {Connection}
 */
function MockConnection()
{
  Connection.call(this);

  this.sequence = 1;
  this.responsePdu_t = new Buffer(0);

  // which device to poll..
  this.pollDevice = 127;

  this.timer = null;

  this.doPoll = this.doPoll.bind(this);

  var RtuTransport = require(LIB_DIR + '/transports/RtuTransport');
  var NoConnection = require(LIB_DIR + '/connections/NoConnection');

  // Use an instance of RTU transport for mocking the remote end of the link
  this.builder = new RtuTransport({connection: new NoConnection() });

  this.lastSentData = new Buffer(0);

}

util.inherits(MockConnection, Connection);

MockConnection.prototype.destroy = function() {
  this.stopPoll();
};

/**
 * @returns {boolean}
 */
MockConnection.prototype.isOpen = function() {
  return true;
};

/**
 * @returns {boolean}
 */
MockConnection.prototype.close = function() {
  this.stopPoll();
  return true;
};

/**
 * Simulates receiving of bytes
 * @returns {boolean}
 */
MockConnection.prototype.rx = function(buffer) {

  this.emit('data', buffer);
  return true;
};

/**
 * Simulate writing data out to the remote device
 *
 * We pretend we are the remote device, and update our response accordingly,
 * to be used at the next poll cycle.
 *
 * @param {Buffer} data
 */
MockConnection.prototype.write = function(data)
{
  try {
    // save it for later inspection if needed
    this.lastSentData = data;

    this.emit('write', data);

    // This should be a valid SLAVE_COMMAND PDU
    // pull apart the message
    var unit = data[0];
    var fc = data[1];
    var responseBuffer = data.slice(1, -2);
    var checksumbuf = data.slice(-2);
    var checksum = checksumbuf.readUInt16LE(0);

    var calcChecksum = this.builder.crc16(unit, responseBuffer);

    //console.log('unit:', unit, responseBuffer, checksumbuf, checksum, calcChecksum );

    if( calcChecksum === checksum ) {
      //console.log('checksum matches!');

      if( fc === SLAVE_COMMAND ) {
        
        var seq = data[2];
        //console.log('seq:', seq);

        if( this.sequence !== seq ) {
          // new sequence number, can ditch the last response PDU-T
          this.sequence = seq;
          this.responsePdu_t = new Buffer(0);

          // if there is a new PDU-T in the incoming message, process it and save it to send in the next poll
          var requestPdu = data.slice(3, -2);

          // depending on the function code sent to us, make up a mock response
          switch( requestPdu[1] ) {
            case 0x11:
              this.responsePdu_t = new Buffer( [0x01, 0x11, 0x00, 0x05,0xff,0x00,0x01,0x00]);
              break;

            default:
              console.log('Mock master didnt recognize function code ' + requestPdu[1]);
              break;
          }

        }
          // ELSE do nothing, perhaps lost message, don't trash the response PDU-T.
          // there is a special case if the slave and master just happen to have the
          // same sequence number when they initially communicate.  In this case,
          // we will send back an empty reponse, which the slave will ignore. When we
          // poll again, we will actually respond.

        

      }

    }

  } catch (e){
    this.emit('error', e);
  }
};

/**
 * Simulate the polling action that the remote master does.
 *
 * @param  {[type]} interval [description]
 * @param  {[type]} seq      [description]
 * @return {[type]}          [description]
 */
MockConnection.prototype.startPoll = function(interval, seq)
{
  if( 'number' === typeof( seq)) {
    this.sequence = seq;
  }

  // set a timer so doPoll gets called periodically
  this.timer = setInterval( this.doPoll, interval );

};

/**
 * Stops the polling timer
 *
 * @return {[type]} [description]
 */
MockConnection.prototype.stopPoll = function()
{
    if( this.timer ) {
    clearTimeout( this.timer );
  }

};

/**
 * Simulates the remote master's poll message
 *
 * @return {[type]} [description]
 */
MockConnection.prototype.doPoll = function()
{
  var me = this;

  // Let all other events finish, then we will fire off this PDU
  process.nextTick(function() {

    var buf = new Buffer([SLAVE_COMMAND, me.sequence ]);
    var message = me.builder.frame( me.pollDevice, Buffer.concat([buf, me.responsePdu_t ]));

    // emit the 'receive data' event that lets the TunnelTransport receive this message
    me.emit('data', message );

  });
};



var connection;
var master;




/**
 * Pre-test
 *
 * Runs once, before all tests in this block.
 * Calling the done() callback tells mocha to proceed with tests
 *
 */
beforeEach(function( done ) {

  connection = new MockConnection();

  master = MB.createMaster( {
    "transport": {
        "type": "tunnel",
        "slaveId" : 127,
        "connection": {
            "type": "serial",
            "serialPort": connection
          }
        },
      "suppressTransactionErrors": true,
      "retryOnException": false,
      "maxConcurrentRequests": 3,
      "defaultUnit": 1,
      "defaultMaxRetries": 1,
      "defaultTimeout": 1000

  });

  done();

});

/**
 * Pre-test
 *
 * Runs once, before all tests in this block.
 * Calling the done() callback tells mocha to proceed with tests
 *
 */
afterEach(function( done ) {

  master.destroy();
  connection.destroy();
  master = null;
  connection = null;

  done();
});


describe("TunnelTransport", function()
{
  it("should send a request", function(done)
  {
      connection.startPoll(100);

      master.reportSlaveId( function(err, response) {
        expect(err).to.equal(null);
        expect(response).to.be.an('object');
        done();

      });
  });

  it("should timeout if master doesn't poll", function(done)
  {
      master.reportSlaveId( function(err, response) {
        expect(response).to.equal(null);
        expect(err).to.be.an('object');
        expect(err.name).to.be.equal('ResponseTimeoutError');

        done();

      });
  });

  it("should handle no more than two requests", function()
  {
    function test1()
    {
      master.reportSlaveId();
      master.reportSlaveId();
    }

    function test2()
    {
      master.reportSlaveId();
      master.reportSlaveId();
      master.reportSlaveId();
    }
    test1();
    test2();

  });

  it("should complete two requests", function(done)
  {
    var count = 0;

    connection.startPoll(100);

    master.reportSlaveId( function(err, response) {
      expect(err).to.equal(null);
      expect(response).to.be.an('object');
      count++;
      if( count === 2 ) {
        done();
      }
    });

    master.reportSlaveId( function(err, response) {
      expect(err).to.equal(null);
      expect(response).to.be.an('object');
      count++;
      if( count === 2 ) {
        done();
      }
    });

  });

  it("should sniff incomplete packets", function(done)
  {
    var errTimeout = setTimeout(function () {
      should.fail('Event never fired');
      done();
    }, 200); //fail if event not received

    var testBuf = new Buffer( [1,2,3]);

    master.transport.on('sniff',function(type, buffer) {
      clearTimeout(errTimeout); //cancel error timeout
      expect(type).to.equal('incomplete');
      expect(buffer).to.deep.equal(testBuf);
      done();

    });


    connection.rx( testBuf );

  });

  it("should sniff bad checksums", function(done)
  {
    var errTimeout = setTimeout(function () {
      should.fail('Event never fired');
      done();
    }, 200); //fail if event not received

    var testBuf = new Buffer( [1,2,3,4]);

    master.transport.on('sniff',function(type, buffer) {
      clearTimeout(errTimeout); //cancel error timeout
      expect(type).to.equal('bad checksum');
      expect(buffer).to.deep.equal(testBuf);
      done();

    });

    connection.rx( testBuf );

  });

  it("should emit valid packets", function(done)
  {
    var errTimeout = setTimeout(function () {
      should.fail('Event never fired');
      done();
    }, 200); //fail if event not received

    var testBuf = new Buffer( [0x01, 0x11, 0xc0, 0x2c]);

    master.transport.on('sniff',function(type, buffer) {
      clearTimeout(errTimeout); //cancel error timeout
      expect(type).to.equal('pdu');
      expect(buffer).to.deep.equal(testBuf);
      done();

    });

    connection.rx( testBuf );

  });

});
