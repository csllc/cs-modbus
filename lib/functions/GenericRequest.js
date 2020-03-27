'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Request = require('./Request');
var GenericResponse = require('./GenericResponse');


module.exports = GenericRequest;

/**
 * The Generic request (any function code).
 *
 * The response to this request returns a data
 *  from the slave device.
 *
 * A binary representation of this request is at least
 * one bytes in
 * length and consists of:
 *
 *   - a function code (1 byte),
 *   - (optional) additional values
 *
 * @constructor
 * @extends {Request}
 * @param {integer} func Identifies the function code
 * @param {Buffer}  values Additional bytes of data to send
 *
 * @throws {Error} If any of the specified sub-requests are invalid.
 */
function GenericRequest( func, values )
{
  Request.call(this, func);

  this.func = util.prepareNumericOption( func, 0, 0, 255, 'Function Code');

  this.values = values || new Buffer(0);
}

util.inherits(GenericRequest, Request);

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
GenericRequest.fromOptions = function(options)
{
  options.data = options.data || new Buffer(0);

  return new GenericRequest(options.func, options.data);
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
GenericRequest.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 2);
  util.assertFunctionCode(buffer[0], this.func);

  var func = buffer[1];
  var byteCount = buffer.length - 2;
  var values = new Buffer(byteCount);

  buffer.copy(values, 0, 3, 3 + byteCount);

  return new GenericRequest(func, values);
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
GenericRequest.prototype.toBuffer = function()
{

  var builder = new buffers.BufferBuilder();

  builder
    .pushByte(this.func)
    .pushBuffer(this.values);

  return builder.toBuffer();
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
GenericRequest.prototype.toString = function()
{
  return util.format(
    "0x" + this.func.toString(16) + " (REQ) Function : ",
    this.values
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
GenericRequest.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    GenericResponse
  );
};

/**
 * @returns {number} Object id
 */
GenericRequest.prototype.getFunc = function()
{
  return this.func;
};

/**
 * @returns {Buffer} Values of the registers
 */
GenericRequest.prototype.getValues = function()
{
  return this.values;
};
/*jshint unused:false*/

