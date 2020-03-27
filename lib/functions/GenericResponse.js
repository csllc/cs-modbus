'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Response = require('./Response');

module.exports = GenericResponse;

/**
 * The read holding registers response (code 0x47).
 *
 * A binary representation of this response varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a command ID (1 byte)
 *   - optional values (`N` bytes).
 *
 * @constructor
 * @extends {Response}
 * @param {number} ID of the command
 * @param {Buffer} values bytes containing the object
 * @throws {Error} If the length of the `values` buffer is not
 * acceptable.
 */
function GenericResponse( func, values )
{
  Response.call(this, func);

  if (func < 0 || func > 255)
  {
    throw new Error(util.format(
      "Invalid Function (must be 0 to 255) "
        + "got: %d",
      func
    ));
  }

  this.func = func;

  /**
   * Values of the registers. A buffer of length between 2 and 250.
   *
   * @private
   * @type {Buffer}
   */
  this.values = values;
}

util.inherits(GenericResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `id` (number, required) - command ID
 *   - `values` (Buffer, required) -
 *     Values of the registers. Must be a buffer of length
 *     between 0 and 250.
 *
 * @param {object} options An options object.
 * @param {number} options.status a status code
 * @param {Buffer} options.values
 * @returns {CommandResponse} A response
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
GenericResponse.fromOptions = function(options)
{
  return new GenericResponse(options.func, options.values);
};

/**
 * Creates a new response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the response.
 * @returns {CommandResponse} A response
 * created from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of the response message.
 */
GenericResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 2);

  var func = buffer[1];
  var byteCount = buffer.length - 2;
  var values = new Buffer(byteCount);

  buffer.copy(values, 0, 2, byteCount + 2);

  return new GenericResponse(func, values);
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
GenericResponse.prototype.toBuffer = function()
{
  return new buffers.BufferBuilder()
    .pushByte(this.func)
    .pushBuffer(this.values)
    .toBuffer();
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
GenericResponse.prototype.toString = function()
{
  return util.format(
    "0x" + this.func.toString(16) + " (RES) Function : ",
    this.values
  );
};

/**
 * @returns {number} Command ID
 */
GenericResponse.prototype.getFunc = function()
{
  return this.func;
};

/**
 * @returns {Buffer} Values of the data values.
 */
GenericResponse.prototype.getValues = function()
{
  return this.values;
};

/**
 * @returns {number} A number of the data values.
 */
GenericResponse.prototype.getCount = function()
{
  return this.values.length;
};
