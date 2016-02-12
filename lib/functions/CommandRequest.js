'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Request = require('./Request');
var CommandResponse = require('./CommandResponse');

// The code for this message
var theFunctionCode = 0x47;

module.exports = CommandRequest;

/**
 * The Command request (code 0x47).
 *
 * The response to this request returns a binary object
 * read from the slave device.
 *
 * A binary representation of this request is at least
 * two bytes in
 * length and consists of:
 *
 *   - a function code (1 byte),
 *   - an command identifier (1 byte),
 *   - (optional) additional values
 *
 * @constructor
 * @extends {Request}
 * @param {integer} id Identifies the command to be executed
 * @param {Buffer}  values Additional bytes of data to send
 *
 * @throws {Error} If any of the specified sub-requests are invalid.
 */
function CommandRequest( id, values )
{
  Request.call(this, theFunctionCode);

  this.id = util.prepareNumericOption( id, 0, 0, 255, 'Command id');

  this.values = values || new Buffer(0);
}

util.inherits(CommandRequest, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are:
 *   - id: command id
 *
 * @param {object} options An options object.
 * @param {number} [options.id] Identifies the command
 * @param {buffer} [options.data] [optional additional data]
 *
 * @returns {CommandRequest} A request created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
CommandRequest.fromOptions = function(options)
{
  options.data = options.data || new Buffer(0);

  return new CommandRequest(options.id, options.data);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {CommandRequest} A request created from its binary
 * representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
CommandRequest.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 2);
  util.assertFunctionCode(buffer[0], theFunctionCode);

  var id = buffer[1];
  var byteCount = buffer.length - 2;
  var values = new Buffer(byteCount);

  buffer.copy(values, 0, 3, 3 + byteCount);

  return new CommandRequest(id, values);
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
CommandRequest.prototype.toBuffer = function()
{

  var builder = new buffers.BufferBuilder();

  builder
    .pushByte(theFunctionCode)
    .pushByte(this.id)
    .pushBuffer(this.values);

  return builder.toBuffer();
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
CommandRequest.prototype.toString = function()
{
  return util.format(
    "0x47 (REQ) Command %d",
    this.id
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
CommandRequest.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    CommandResponse
  );
};

/**
 * @returns {number} Object id
 */
CommandRequest.prototype.getId = function()
{
  return this.id;
};

/**
 * @returns {Buffer} Values of the registers
 */
CommandRequest.prototype.getValues = function()
{
  return this.values;
}
/*jshint unused:false*/

