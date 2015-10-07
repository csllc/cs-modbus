'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Request = require('./Request');
var ReadObjectResponse = require('./ReadObjectResponse');

// The code for this message
var theFunctionCode = 72;

module.exports = ReadObjectRequest;

/**
 * The read Object request (code 72).
 *
 * The response to this request returns a binary object
 * read from the slave device.
 *
 * A binary representation of this request is two bytes in
 * length and consists of:
 *
 *   - a function code (1 byte),
 *   - an object identifier (1 byte),
 *
 * @constructor
 * @extends {Request}
 * @param {integer} id Identifies the FIFO to be read
 *
 * @throws {Error} If any of the specified sub-requests are invalid.
 */
function ReadObjectRequest( id )
{
  Request.call(this, theFunctionCode);

  this.id = util.prepareNumericOption( id, 0, 0, 255, 'Object id');
}

util.inherits(ReadObjectRequest, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are:
 *   - id: object to read from
 *
 * @param {object} options An options object.
 * @param {number} [options.id] Identifies the object to be read
 *
 * @returns {ReadObjectRequest} A request created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadObjectRequest.fromOptions = function(options)
{
  return new ReadObjectRequest(options.id);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {ReadObjectRequest} A request created from its binary
 * representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
ReadObjectRequest.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 2);
  util.assertFunctionCode(buffer[0], theFunctionCode);

  var reader = new buffers.BufferReader(buffer);

  reader.skip(2);

  return new ReadObjectRequest(buffer[1]);
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
ReadObjectRequest.prototype.toBuffer = function()
{
  var builder = new buffers.BufferBuilder();

  builder
    .pushByte(theFunctionCode)
    .pushByte(this.id);

  return builder.toBuffer();
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
ReadObjectRequest.prototype.toString = function()
{
  return util.format(
    "0x46 (REQ) Read Object %d",
    this.id
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
ReadObjectRequest.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    ReadObjectResponse
  );
};

/**
 * @returns {number} Object id
 */
ReadObjectRequest.prototype.getId = function()
{
  return this.id;
};


/*jshint unused:false*/

