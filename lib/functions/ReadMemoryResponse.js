'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Response = require('./Response');

module.exports = ReadMemoryResponse;

/**
 * The read memory response (code 0x45).
 *
 * A binary representation of this response varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - memory data (`N` bytes).
 *
 * @constructor
 * @extends {Response}
 * @param {Buffer} values bytes containing the object
 * @throws {Error} If the length of the `values` buffer is not
 * acceptable.
 */
function ReadMemoryResponse( values )
{
  Response.call(this, 0x45);

  if (values.length < 0 || values.length > 250)
  {
    throw new Error(util.format(
      "The length of the `values` buffer must be a number "
        + "between 0 and 250, got: %d",
      values.length
    ));
  }

  this.values = values;
}

util.inherits(ReadMemoryResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `values` (Buffer, required) -
 *     Values of the registers. Must be a buffer of length
 *     between 0 and 250.
 *
 * @param {object} options An options object.
 * @param {number} options.status a status code
 * @param {Buffer} options.values
 * @returns {ReadMemoryResponse} A response
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadMemoryResponse.fromOptions = function(options)
{
  return new ReadMemoryResponse(options.values);
};

/**
 * Creates a new response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the response.
 * @returns {ReadMemoryResponse} A response
 * created from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of the response message.
 */
ReadMemoryResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 2);
  util.assertFunctionCode(buffer[0], 0x45);

  var byteCount = buffer.length -1;
  var values = Buffer.alloc( byteCount );

  buffer.copy(values, 0, 1, byteCount+1);

  return new ReadMemoryResponse(values);
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
ReadMemoryResponse.prototype.toBuffer = function()
{
  return new buffers.BufferBuilder()
    .pushByte(0x45)
    .pushBuffer(this.values)
    .toBuffer();
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
ReadMemoryResponse.prototype.toString = function()
{
  return util.format(
    "0x45 (RES) %d bytes: ",
    this.values.length,
    this.values
  );
};

/**
 * @returns {Buffer} Values of the data values.
 */
ReadMemoryResponse.prototype.getValues = function()
{
  return this.values;
};

/**
 * @returns {number} A number of the data values.
 */
ReadMemoryResponse.prototype.getCount = function()
{
  return this.values.length;
};
