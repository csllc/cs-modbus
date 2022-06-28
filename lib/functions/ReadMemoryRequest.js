'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Request = require('./Request');
var ReadMemoryResponse = require('./ReadMemoryResponse');

module.exports = ReadMemoryRequest;

/**
 * The read memory request (code 0x45).
 *
 * The response to this request returns a set of bytes
 * read from the slave device.
 *
 * A binary representation of this request is 4 bytes in
 * length and consists of:
 *
 *   - a function code (1 byte),
 *   - start address (2 bytes)
 *   - count of bytes to read (1 byte),
 *
 * @constructor
 * @extends {Request}
 * @param {integer} [address] starting address for read operation
 * @param {integer} [count] number of bytes to read
 *
 *
 * @throws {Error} If any of the specified sub-requests are invalid.
 */
function ReadMemoryRequest( address, count )
{
  Request.call(this, 0x45);

  this.address = util.prepareAddress( address );
  this.count = util.prepareNumericOption( count, 250, 1, 250, 'Count');

}

util.inherits(ReadMemoryRequest, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are as follows:
 *
 * @param {object} options An options object.
 * @param {number} [options.address] starting address for read operation
 * @param {number} [options.count] number of bytes to read
 *
 * @returns {ReadMemoryRequest} A request created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadMemoryRequest.fromOptions = function(options)
{
  return new ReadMemoryRequest( options.address, options.count );
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {ReadMemoryRequest} A request created from its binary
 * representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
ReadMemoryRequest.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 4);
  util.assertFunctionCode(buffer[0], 0x45);

  return new ReadMemoryRequest(
    buffer.readUInt16BE(1, true),
    buffer[3]
    );
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
ReadMemoryRequest.prototype.toBuffer = function()
{
  var buffer = Buffer.alloc(4);

  buffer[0] = 0x45;
  buffer.writeUInt16BE(this.address, 1, true);
  buffer[3] = this.count; 

  return buffer;
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
ReadMemoryRequest.prototype.toString = function()
{
  return util.format(
    "0x45 (REQ) Read Memory address %d, count %d",
    this.address, this.count
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
ReadMemoryRequest.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    ReadMemoryResponse
  );
};


/**
 * @returns {number} memory address
 */
ReadMemoryRequest.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @returns {number} memory count
 */
ReadMemoryRequest.prototype.getCount = function()
{
  return this.count;
};

/*jshint unused:false*/

