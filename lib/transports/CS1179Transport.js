/**
 * Transport module for CS-MODBUS that handles Transaction objects and 
 * converts them to be transported over the CS1179 protocol.
 * The CS1179 communicates via serial port at 115200 N81, in three
 * byte packets.  Each packet can read or write one byte of memory in the attached controller.
 *
 * This transport has to be smart and recognize the function code; if it is not a function code
 * that we can process, the transaction is rejected.  Otherwise, we build an ADU out of 
 * three-byte commands for each byte we want to access in the controller.
 * We then feed the commands one at a time to the connection, and collect responses.
 * When we have no more commands, we return the response and complete the transaction.
 *
 * As far as configuration, you should set
 * maxConcurrentRequests: 1,
 * timeout: about 20ms times the number of bytes to be accessed (observed experimentally)
 *
 * To see which function codes are supported, see the getAdu() method.
 */

'use strict';

var util = require('util');
//var buffers = require('h5.buffers');
var Transport = require('../Transport');
var transportUtils = require('../functions/util');

//var InvalidResponseDataError = require('../errors').InvalidResponseDataError;

module.exports = CS1179Transport;

// These are MODBUS function codes we know about
var MB_READ_MEMORY = 0x45;
var MB_WRITE_MEMORY = 0x46;
var MB_WRITE_MEMORY_VERIFY = 0x64;
var MB_SLAVEID = 0x11;
var MB_COMMAND = 0x47;

// Define the commands that we can send to the device
// 1179 V102 codes and their translations
/**  
 * We want to use the "ARAM" commands for low RAM operations since they get translated
 * into I2C commands the Phoenix actually knows about.
 */
var RAM_WR_CMD = 0x00 // -> 0x00
var HRAM_WR_CMD = 0x20 // -> 0x06
var ARAM_WR_CMD = 0x40 // -> 0x04
var RAM_RD_CMD = 0x01 // -> 0x01
var HRAM_RD_CMD = 0x21 // -> 0x07
var ARAM_RD_CMD = 0x41 // -> 0x05
var E2_WR_CMD = 0x06 // -> 0xB0
var E2_RD_CMD = 0x07 // -> 0xA0
var E2_WRVFY_CMD = 0x0B // -> 0xB0, 0xA0

var USB_I2C_RESET = 0x0F;


/**
 * @constructor
 * @extends {Transport}
 * @param {Connection} connection
 * @event request Emitted right before the ADU is passed to the underlying
 * `Connection`.
 */
function CS1179Transport(connection) {
 
  Transport.call(this, connection);

  // collects response bytes
  this.reader = [];

  // references the transaction we are working on
  this.transaction = null;

  // if response not completed in time
  this.handleTimeout = this.handleTimeout.bind(this);

  // catch incoming data from the connection
  this.connection.on('data', this.onData.bind(this));
}

util.inherits(CS1179Transport, Transport);

/**
 *
 */
CS1179Transport.prototype.destroy = function() {
  
  this.removeAllListeners();

  if (this.connection !== null) {
    this.connection.destroy();
    this.connection = null;
  }

  if (this.transaction !== null) {

    this.transaction.destroy();

    this.clearTransaction();

  }
};

/**
 * @param {Transaction} transaction
 */
CS1179Transport.prototype.sendRequest = function(transaction) {
  
  if (this.transaction) {
    throw new Error(
      "Can only start one transaction with this transport type ");
  }

  // In case this is a retry, where the ADU was already set, we
  // clear it out so the Transaction class doesn't throw
  transaction.adu = null;

  var adu = this.getAdu(transaction);

  this.transaction = transaction;

  // if we have an adu start sending it
  if( adu && adu.length > 0 ) {
    this.emit('request', transaction);

    this.sendNextChunk( adu );

    // set the overall timer
    transaction.start( this.handleTimeout );

  }
  else {
    throw new Error(
      "Invalid ADU for CS1179Transport");
  }
};

/**
 * Writes out the next chunk to the connection.
 * Assumes there is a chunk to be written and it is adu[0]
 */
CS1179Transport.prototype.sendNextChunk = function(adu) {

  this.connection.write( adu[0] );

};

/**
 * @private
 * @param {number} id
 * @param {Transaction} transaction
 * @returns {Buffer}
 */
CS1179Transport.prototype.getAdu = function(transaction) {

  var adu = null;

  var request = transaction.getRequest();

  switch (request.code) {

    // Read memory
    case MB_READ_MEMORY:
      this.reader.push( MB_READ_MEMORY );
      adu = this.buildAduReadMemory(transaction);
      break;

    // Write memory
    case MB_WRITE_MEMORY:
      this.reader.push( MB_WRITE_MEMORY );
      adu = this.buildAduWriteMemory(transaction);
      break;

    // Write memory verify
    case MB_WRITE_MEMORY_VERIFY:
      this.reader.push( MB_WRITE_MEMORY_VERIFY );
      adu = this.buildAduWriteMemory(transaction);
      break;

    // Get slaveID
    case MB_SLAVEID:
      adu = this.buildAduSlaveId(transaction);
      break;

    // Command
    case MB_COMMAND:
      adu = this.buildAduCommand(transaction);
      break;

    default:
      transaction.handleError(
        new Error('Function not supported by CS1179 transport'));
      break;
  }

  // get rid of any previous adu or the transaction will error out
  transaction.adu = null;

  // we store it in the transaction for future reference
  transaction.setAdu(adu);

  return adu;
};

/**
 * @private
 * @param {number} id
 * @param {Transaction} transaction
 * @returns {Buffer}
 */
CS1179Transport.prototype.buildAduReadMemory = function(transaction) {
  
  var chunks = [];

  var request = transaction.getRequest();

  for (var i = 0; i < request.count; i++) {

    var address = request.address + i;

    var bank = (address >> 8) & 0xff;
    var offset = address & 0xFF;

    var opcode;
    var opcodeToString;

    switch (bank) {
      // case 0 - Lo Ram Read
      case 0:
        opcode = ARAM_RD_CMD;
        opcodeToString = 'low RAM read';
        break;

      // case 1 - Hi Ram Read
      case 1:
        opcode = HRAM_RD_CMD;
        opcodeToString = 'high RAM read';
        break;

      // case 2 - Shadow Read
      case 2:
        // SHEE bank is 512, subtract to get base address.
        address = address - 512;

        // Run address through translator
        address = transportUtils.addressTranslator(address);
        // calculate the correct offset
        offset = address & 0xFF;

         // Determine the opcode based on the returned address
         // Lo Ram Write
        if (address >= 0x0A0 && address <= 0x0EF) {
          opcode = ARAM_RD_CMD;
          opcodeToString = 'low RAM read';
        // Hi Ram Write
        } else if ((address >= 0x190 && address <= 0x1AF) ||
                  (address >= 0x1B0 && address <= 0x1CF) ||
                  (address >= 0x130 && address <= 0x15F)) {
          opcode = HRAM_RD_CMD;
          opcodeToString = 'high RAM read';
        } else {
          throw new Error(`Translated address 0x${address.toString(16)} is out of range.`);
        }
        break;

      // case 3 - EE Read
      case 3:
        opcode = E2_RD_CMD;
        break;

      // case default - unrecognized
      default:
        throw new Error(`Unsupported bank value: ${bank}`);
    }

    chunks.push([opcode, offset, 0]);
  }

  return chunks;

};


/**
 * @private
 * @param {number} id
 * @param {Transaction} transaction
 * @returns {Buffer}
 */
CS1179Transport.prototype.buildAduSlaveId = function() {
  
  var chunks = [];

  //chunks.push([ USB_STX, E2_RD_CMD, 0xF9, 0, 0xFA, 0, 0, USB_ETX ]);


  // product
  chunks.push( [E2_RD_CMD, 0xF9, 0]);
  chunks.push( [E2_RD_CMD, 0xFA, 0]);

  // version
  chunks.push( [E2_RD_CMD, 0x03, 0]);
  chunks.push( [E2_RD_CMD, 0x04, 0]);

  // serial number
  chunks.push( [E2_RD_CMD, 0xFB, 0]);
  chunks.push( [E2_RD_CMD, 0xFC, 0]);
  chunks.push( [E2_RD_CMD, 0xFD, 0]);
  chunks.push( [E2_RD_CMD, 0xFE, 0]);

  return chunks;

};

/**
 * @private
 * @param {number} id
 * @param {Transaction} transaction
 * @returns {Buffer}
 */
CS1179Transport.prototype.buildAduWriteMemory = function(transaction) {
  
  var chunks = [];
  var request = transaction.getRequest();
  var values = request.values;

  for (var i = 0; i < values.length; i++) {

    var address = request.address + i;
    var bank = (address >> 8) & 0xff;

    // Note: unclear if this needs to be done before or after we subtract bank from address
    var offset = address & 0xFF; 
    var opcode;
    var opcodeToString;

    switch (bank) {
      // case 0 - Lo Ram Write
      case 0:
        opcode = ARAM_WR_CMD;
        opcodeToString = 'low RAM write';
        break;
      
      // case 1 - Hi Ram Write
      case 1:
        opcode = HRAM_WR_CMD;
        opcodeToString = 'high RAM write';
        break;

      // case 2 - Shadow Write
      case 2:
        // SHEE bank is 512, subtract to get base address.
        address = address - 512; 

        // Run address through translator 
        /**
         *    EE Addr	       RAM Addr
         * -----------------------------
         *   Start End	 |   Start	End
         *   0x00	 0x4F	 |   0x0A0	0x0EF - Lo Ram 
         *   0x50	 0x6F	 |   0x190	0x1AF - Hi Ram
         *   0x80	 0x9F	 |   0x1B0	0x1CF - Hi Ram
         *   0xB0	 0xDF	 |   0x130	0x15F - Hi Ram
         */

        address = transportUtils.addressTranslator(address);
        // calculate the correct offset
        offset = address & 0xFF; 

         // Determine the opcode based on the returned address
         // Lo Ram Write
        if (address >= 0x0A0 && address <= 0x0EF) {
          opcode = ARAM_WR_CMD;
          opcodeToString = 'low RAM write';
        // Hi Ram Write
        } else if ((address >= 0x190 && address <= 0x1AF) ||
                  (address >= 0x1B0 && address <= 0x1CF) ||
                  (address >= 0x130 && address <= 0x15F)) {
          opcode = HRAM_WR_CMD;
          opcodeToString = 'high RAM write';
        } else {
          throw new Error(`Translated address 0x${address.toString(16)} is out of range.`);
        }
        break;

      // case 3 - EE Write
      case 3:
        // If the modbus command is a write verify request, set corresponding write verify opcode
        if (request.code == MB_WRITE_MEMORY_VERIFY) {
          opcode = E2_WRVFY_CMD;
          opcodeToString = 'E2 write & verify';
        } else {
          opcode = E2_WR_CMD;
          opcodeToString = 'E2 write';
        }
        break;
      
      // case default - unrecognized 
      default:
        throw new Error(`Unsupported bank value: ${bank}`);
    }

    /**
     * If the modbus command was sent through as a writeMemoryVerify command, but we are not performing an E2 write,
     * switch the modbus command code to be a standard writeMemory command.
     * ( writeMemoryVerify is only supported for E2 writes )
     */
    if (request.code == MB_WRITE_MEMORY_VERIFY && opcode != E2_WRVFY_CMD) {
      console.log('Modbus command switched to standard writeMemory request for', opcodeToString + '. writeMemoryVerify is only supported for E2 writes.');

      this.reader.pop();
      this.reader.push( MB_WRITE_MEMORY );
    }

    chunks.push([opcode, offset, values[i] ] );
  }

  return chunks;

};


/**
 * Makes an ADU for the COMMAND function code
 * @private
 * @param {number} id
 * @param {Transaction} transaction
 * @returns {Buffer}
 */
CS1179Transport.prototype.buildAduCommand = function() {
  
  // the only command we know is RESET, so use that

  return [[USB_I2C_RESET, 0, 0]];

};


/**
 * Flush any collected data and forget about the transaction
 *
 * @private
 * @param {number} id
 * @returns {function}
 */
CS1179Transport.prototype.clearTransaction = function() {

  if (this.reader.length > 0) {
    this.reader = [];
  }

  this.transaction = null;
};

/**
 * Handler for response not complete within allowed time
 *
 * @private
 * @param {number} id
 * @returns {function}
 */
CS1179Transport.prototype.handleTimeout = function() {
  
  this.clearTransaction();

};

/**
 * Once we've sent and received all the chunks, build
 * the MODBUS response to pass back up the chain
 */
CS1179Transport.prototype.finishResponse = function() {

  var transaction = this.transaction;
  var request = transaction.getRequest();
  
  try {

    var resp;

    if( request.code === MB_READ_MEMORY ) {
      resp = request.createResponse( Buffer.from( this.reader )) ;
      
      this.clearTransaction();
      transaction.handleResponse(resp);

    }
    else if( request.code === MB_WRITE_MEMORY ) {
      resp = request.createResponse( Buffer.from( [MB_WRITE_MEMORY, 0] )) ;
      
      this.clearTransaction();
      transaction.handleResponse(resp);

    }
    else if( request.code === MB_WRITE_MEMORY_VERIFY ) {
      resp = request.createResponse( Buffer.from( [MB_WRITE_MEMORY_VERIFY, 0] )) ;
      
      this.clearTransaction();
      transaction.handleResponse(resp);

    }
    else if( request.code === MB_SLAVEID ) {
      resp = request.createResponse( Buffer.from( [
        MB_SLAVEID,
        9,    // length
        this.reader[1],
        255,
        this.reader[2],
        this.reader[3],
        0,
        this.reader[4],
        this.reader[5],
        this.reader[6],
        this.reader[7],

        ])) ;
      
      this.clearTransaction();
      transaction.handleResponse( resp );

    }
    else if( request.code === MB_COMMAND ) {
      resp = request.createResponse( Buffer.from( [
        MB_COMMAND,
        0    // Assume success if we got here
        ])) ;
      
      this.clearTransaction();
      transaction.handleResponse( resp );

    }
  }
  catch (error) {
    transaction.handleError(error);
  }

 };

/**
 * Handler for incoming data from the connection
 * @private
 * @param {Buffer} [data]
 */
CS1179Transport.prototype.onData = function(data) {

  // should have exactly three bytes...

  if (data.length > 2  && this.transaction !== null ) {
    
    var transaction = this.transaction;

    if (data[0] === 0x88 && data[1] === 0x88 && data[2] === 0x88) {
      this.clearTransaction();
      transaction.handleError(
        new Error('Invalid CS1179 Command'));
    } 
    else if (data[0] === 0x77 && data[1] === 0x77 && data[2] === 0x77) {
      this.clearTransaction();
      transaction.handleError(
        // not connected to device/I2C error.  CS1108 is probably asleep
        new Error('Device Not connected'));
    }
    else {
      var adu = transaction.getAdu();

      this.reader.push( data[0]);

      if( adu.length > 1 ) {
        adu.shift();
        this.sendNextChunk( adu );
      }
      else if( adu.length === 1) {
        // this was the last byte we were waiting for
        this.finishResponse();
      }     

    }

  }

};
