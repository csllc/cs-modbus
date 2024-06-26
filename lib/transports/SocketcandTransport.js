'use strict';

var util = require('util');
var buffers = require('h5.buffers');
var Transport = require('../Transport');
var InvalidResponseDataError = require('../errors').InvalidResponseDataError;

var MESSAGE_ID = 0x10EF0000;

module.exports = SocketcandTransport;

/**
 * @constructor
 * @extends {Transport}
 * @param {Connection} connection
 * @event request Emitted right before the ADU is passed to the underlying
 * `Connection`.
 */
function SocketcandTransport(connection) {
  Transport.call(this, connection);

  /**
   * @type {h5.buffers.BufferQueueReader}
   */
  this.reader = new buffers.BufferQueueReader();

  /**
   * @type {SocketcandTransport.Header}
   */
  this.header = new SocketcandTransport.Header();

  /**
   * @private
   * @type {number}
   */
  this.nextTransactionId = 0;

  // this is hardcoded for now...
  this.myCanId = 1;

  /**
   * @private
   * @type {object.<number, Transaction>}
   */
  this.transactions = {};

  this.connection.on('data', this.onData.bind(this));
}

util.inherits(SocketcandTransport, Transport);

/**
 * @constructor
 */
SocketcandTransport.Header = function() {
  /**
   * @type {number}
   */
  this.id = -1;

  /**
   * @type {number}
   */
  this.version = -1;

  /**
   * @type {number}
   */
  this.length = -1;

  /**
   * @type {number}
   */
  this.unit = -1;
};

/**
 * @param {h5.buffers.BufferQueueReader} bufferReader
 */
SocketcandTransport.Header.prototype.read = function(bufferReader) {
  this.id = bufferReader.shiftUInt16();
  this.version = bufferReader.shiftUInt16();
  this.length = bufferReader.shiftUInt16() - 1;
  this.unit = bufferReader.shiftByte();
};

/**
 * @param {Transaction} transaction
 * @returns {InvalidResponseDataError|null}
 */
SocketcandTransport.Header.prototype.validate = function(transaction) {
  var message;
  var expectedUnit = transaction.getUnit();

  if (this.version !== 0) {
    message = util.format(
      "Invalid version specified in the MODBUS response header. " +
      "Expected: 0, got: %d",
      this.version
    );
  } else if (this.length === 0) {
    message = "Invalid length specified in the MODBUS response header. " +
      "Expected: at least 1, got: 0.";
  } else if (this.unit !== expectedUnit) {
    message = util.format(
      "Invalid unit specified in the MODBUS response header. " +
      "Expected: %d, got: %d.",
      expectedUnit,
      this.unit
    );
  }

  return typeof message === 'undefined' ?
    null :
    new InvalidResponseDataError(message);
};

SocketcandTransport.Header.prototype.reset = function() {
  this.id = -1;
  this.version = -1;
  this.length = -1;
  this.unit = -1;
};

SocketcandTransport.prototype.destroy = function() {
  this.removeAllListeners();

  if (this.connection !== null) {
    this.connection.destroy();
    this.connection = null;
  }

  if (this.transactions !== null) {
    Object.keys(this.transactions).forEach(function(id) {
      this.transactions[id].transaction.destroy();
    }, this);

    this.transactions = {};
  }
};

/**
 * @param {Transaction} transaction
 */
SocketcandTransport.prototype.sendRequest = function(transaction) {

  if (this.transactions[transaction.unit]) {
    throw new Error(
      "Can only start one transaction per slave with this transport type "
    );
  }

  this.transactions[transaction.unit] = this.getAdu(transaction);

  // if adu is null we should abort somehow


  this.emit('request', transaction);

  this.sendNextChunk(this.transactions[transaction.unit]);

  // set the overall timer
  transaction.start(this.createTimeoutHandler(transaction.unit));
};

/**
 *
 */
SocketcandTransport.prototype.sendNextChunk = function(obj) {

  // console.log('chunk: ', obj.chunks[0]);
  this.connection.write(obj.chunks[0]);

  // this is an imperfect attempt at not using the chunk timer for 'non-chunked' messags
  if (obj.chunks.length > 1) {
    obj.chunkTimer = setTimeout(
      this.createChunkTimeoutHandler(obj.transaction.unit),
      2100);
  }
};


/**
 * @private
 * @param {number} id
 * @param {Transaction} transaction
 * @returns {Buffer}
 */
SocketcandTransport.prototype.getAdu = function(transaction) {
  var adu = transaction.getAdu();

  var request = transaction.getRequest();

  //console.log( 'REQUEST: ', request );


  if (adu === null) {
    switch (request.code) {

      // Read memory
      case 0x45:
        adu = this.buildAduReadMemory(transaction);
        break;

        // Write memory
      case 0x46:
        adu = this.buildAduWriteMemory(transaction);
        break;

        // Command
      case 0x47:
        adu = this.buildAduCommand(transaction);
        break;

      default:
        transaction.handleError(
          new Error('Function not supported by socketcand transport'));
        break;
    }

    //adu = this.buildAdu( transaction);

    transaction.setAdu(adu);
  }

  return {
    transaction: transaction,
    chunks: adu,
    response: [request.code]
  };

};


/**
 * @private
 * @param {number} id
 * @param {Transaction} transaction
 * @returns {Buffer}
 */
SocketcandTransport.prototype.buildAduCommand = function(transaction) {
  var request = transaction.getRequest();

  // return [ [
  //   transaction.unit,
  //   this.myCanId,
  //   request.code,
  //   request.id,
  //   request.values[0]
  // ]];

  return [{
    id: MESSAGE_ID + (transaction.getUnit() << 8) + this.myCanId,
    ext: true,
    buf: request.toBuffer()
  }];

  // var adu = {
  //   pgn: 61184,
  //   dst: transaction.getUnit(),
  //   buf: request.toBuffer()
  // };

  // return [adu];


};

/**
 * @private
 * @param {number} id
 * @param {Transaction} transaction
 * @returns {Buffer}
 */
SocketcandTransport.prototype.buildAduReadMemory = function(transaction) {
  var chunks = [];

  var request = transaction.getRequest();
  var bank = (request.address >> 8) & 0xff;
  var address = request.address & 0xFF;

  var command, opcode;

  // banks 0-3 are motor controller memory
  if (bank >= 0 && bank <= 3) {
    command = 0x48; // access motor controller memory

    if (bank === 0) {
      opcode = 0x05; // read LO ram
    } else if (bank === 1) {
      opcode = 0x07; // read hi ram
    } else if (bank === 2) {
      opcode = 0xC3; // read shadow EE
    } else {
      opcode = 0xC1; // read EE
    }

  } else {
    command = 0x45; // read memory opcode
    opcode = 0x04; // bank
  }


  for (var i = 0; i < request.count; i++) {

    var req = {
      id: MESSAGE_ID + (transaction.getUnit() << 8) + this.myCanId,
      ext: true,
    };

    if (command === 0x45) {
      req.buf = Buffer.from([command, opcode, address + i, 1]);
    } else {
      req.buf = Buffer.from([command, opcode, address + i]);
    }

    chunks.push(req);



    //  [
    //   transaction.unit,
    //   this.myCanId,
    //   command,
    //   opcode,
    //   address + i
    // ]);
  }

  //console.log( 'Chunks: ', chunks.length );

  return chunks;

};


/**
 * @private
 * @param {number} id
 * @param {Transaction} transaction
 * @returns {Buffer}
 */
SocketcandTransport.prototype.buildAduWriteMemory = function(transaction) {
  var chunks = [];

  var request = transaction.getRequest();
  var bank = (request.address >> 8) & 0xff;
  var address = request.address & 0xFF;

  var command, opcode;

  // banks 0-3 are motor controller memory
  if (bank >= 0 && bank <= 3) {
    command = 0x48;

    if (bank === 0) {
      opcode = 0x04; // write lo ram
    } else if (bank === 1) {
      opcode = 0x06; // write hi ram
    } else if (bank === 2) {
      opcode = 0xC2; // write shadow ee
    } else {
      opcode = 0xC0; // write EE
    }

  } else {
    command = 0x49; // access comm processor memory
    opcode = 0x2B; // write memory
  }

  var data = request.getValues();

  for (var i = 0; i < request.getCount(); i++) {

    chunks.push({
      id: MESSAGE_ID + (transaction.getUnit() << 8) + this.myCanId,
      ext: true,
      buf: Buffer.from([command, opcode, address + i, data[i]])
    });

    // chunks.push({
    //   pgn: 61184,
    //   dst: transaction.getUnit(),
    //   ext: true,
    //   buf: Buffer.from([command, opcode, address + i, data[i]])
    // });


    // chunks.push([
    //   transaction.unit,
    //   this.myCanId,
    //   command,
    //   opcode,
    //   address + i,
    //   data[i]
    // ]);
  }

  //console.log( 'Chunks: ', chunks.length );

  return chunks;

};

/**
 * @private
 * @param {number} id
 * @returns {function}
 */
SocketcandTransport.prototype.createTimeoutHandler = function(id) {
  var transactions = this.transactions;

  return function() {
    if (typeof transactions[id] !== 'undefined') {
      delete transactions[id];
    }
  };
};

/**
 * @private
 * @param {number} id
 * @returns {function}
 */
SocketcandTransport.prototype.createChunkTimeoutHandler = function(id) {
  var me = this;

  // this is a timeout handler that retries sending the chunk.

  return function() {
    if (me.transactions[id] &&
      typeof me.transactions[id] !== 'undefined' &&
      me.transactions[id].chunks.length > 0) {
      me.sendNextChunk(me.transactions[id]);
    }
  };
};


SocketcandTransport.prototype.handleChunk = function(from, request, response, value) {

  //console.log( 'Value ', value );

  // this appears to be the data we are looking for
  if (request.code === 0x45) {
    response.push(value);
  } else if (request.code === 0x46) {
    //success
    response.push(0);
  }

  if (this.transactions[from].chunkTimer) {
    clearTimeout(this.transactions[from].chunkTimer);
    this.transactions[from].chunkTimer = null;
  }

  this.transactions[from].chunks.shift();

  if (this.transactions[from].chunks.length) {


    this.sendNextChunk(this.transactions[from]);
  } else {
    //console.log( 'RESPONSE: ', response );
    // when we think we have a complete response, try processing it

    try {
      this.transactions[from].transaction.handleResponse(
        request.createResponse(Buffer.from(response)));
    } catch (error) {
      this.transactions[from].transaction.handleError(error);
    }

    delete this.transactions[from];

  }

};



/**
 * Event handler for incoming data from the remote device
 *
 * @private
 * @param {Object} data
 * @param {number} data.id the CANBUS message ID
 * @param {boolean} data.ext whether the id is 'extended' (29-bit)
 * @param {Buffer} data.buf the incoming data
 *
 */
SocketcandTransport.prototype.onData = function(data) {


  var to = (data.id >> 8) & 0xFF;
  var pf = (data.id & 0x00FF0000);

  if (data.ext && (pf === 0x00EF0000) && (to === this.myCanId)) {
    var from = (data.id) & 0xFF;

    var cmd = data.buf[0];
    var op = data.buf[1];
    var address = data.buf[2];
    var value = data.buf[3];


    if (this.transactions[from] &&
      this.transactions[from].chunks &&
      this.transactions[from].chunks.length > 0) {

      var transaction = this.transactions[from].transaction;
      var chunk = this.transactions[from].chunks[0];

      var request = transaction.getRequest();
      var response = this.transactions[from].response;

      // special case for reading comm eeprom
      if (cmd === 0x45 && !Array.isArray(data)) {

        value = data.buf[1];
        this.handleChunk(from, request, response, value);
      }
      // special case for command function code
      else if (cmd === 0x47 && !Array.isArray(data)) {

        if (this.transactions[from].chunkTimer) {
          clearTimeout(this.transactions[from].chunkTimer);
          this.transactions[from].chunkTimer = null;
        }

        try {
          this.transactions[from].transaction.handleResponse(
            request.createResponse(data.buf));
        } catch (error) {
          this.transactions[from].transaction.handleError(error);
        }

        delete this.transactions[from];

      } else if ((cmd & 0x7F) === (chunk.buf[0] & 0x7F) &&
        op === chunk.buf[1] &&
        (address - (request.address & 0xFF)) === (response.length - 1)) {

        this.handleChunk(from, request, response, value);
      }

    }

  }

};
