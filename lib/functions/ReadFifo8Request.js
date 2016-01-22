'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Request = require('./Request');
var ReadFifo8Response = require('./ReadFifo8Response');

// The code for this message
var theFunctionCode = 0x41;
var maxLimit = 250;

module.exports = ReadFifo8Request;

/**
 * The read FIFO8 request (code 0x41).
 *
 * The response to this request returns bytes pulled (and removed from)
 * from the head of the
 * specified FIFO (circular) buffer in the slave device.
 *
 * The maximum number of bytes to read is limited by the size of
 * the MODBUS packet. If the 'max' parameter is omitted, the response will
 * include as many bytes as possible.  A request with a zero byte max
 * effectively queries the status of the queue without removing any bytes.
 *
 * A binary representation of this request is three bytes in
 * length and consists of:
 *
 *   - a function code (1 byte),
 *   - a FIFO identifier (1 byte),
 *   - Maximum bytes to return
 *
 * @constructor
 * @extends {Request}
 * @param {integer} id Identifies the FIFO to be read
 * @param {integer} max Max number of bytes to be read (optional)
 *
 * @throws {Error} If any of the specified sub-requests are invalid.
 */
function ReadFifo8Request( id, max )
{
  Request.call(this, theFunctionCode);

  if('undefined' == typeof( max )) {
    max = maxLimit;
  }

  this.id = util.prepareNumericOption( id, 0, 0, 255, 'FIFO8 id');
  this.max = util.prepareNumericOption( max, 0, 0, maxLimit, 'Max bytes');

}

util.inherits(ReadFifo8Request, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are:
 *   - id: FIFO to read from
 *   - max: max number of bytes to read
 *
 * @param {object} options An options object.
 * @param {number} [options.id] Identifies the FIFO to be read
 * @param {number} [options.max] Max number of bytes to be read
 *
 * @returns {ReadFifo8Request} A request created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadFifo8Request.fromOptions = function(options)
{
  options.max = options.max || maxLimit;

  return new ReadFifo8Request(options.id, options.max);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {ReadFifo8Request} A request created from its binary
 * representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
ReadFifo8Request.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 3);
  util.assertFunctionCode(buffer[0], theFunctionCode);

  var reader = new buffers.BufferReader(buffer);

  reader.skip(2);

  return new ReadFifo8Request(buffer[1], buffer[2]);
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
ReadFifo8Request.prototype.toBuffer = function()
{
  var builder = new buffers.BufferBuilder();

  builder
    .pushByte(theFunctionCode)
    .pushByte(this.id)
    .pushByte(this.max);

  return builder.toBuffer();
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
ReadFifo8Request.prototype.toString = function()
{
  return util.format(
    "0x41 (REQ) Read up to %d bytes from FIFO %d",
    this.max,
    this.id
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
ReadFifo8Request.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    ReadFifo8Response
  );
};

/**
 * @returns {number} FIFO id
 */
ReadFifo8Request.prototype.getId = function()
{
  return this.id;
};

/**
 * @returns {number} max bytes to read
 */
ReadFifo8Request.prototype.getMax = function()
{
  return this.max;
};
/*jshint unused:false*/

