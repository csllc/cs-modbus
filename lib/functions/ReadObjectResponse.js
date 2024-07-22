'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Response = require('./Response');

module.exports = ReadObjectResponse;

/**
 * The read holding registers response (code 0x43).
 *
 * A binary representation of this response varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a count of bytes which follow
 *   - object data (`N` bytes).
 *
 * @constructor
 * @extends {Response}
 * @param {Buffer} values bytes containing the object
 * @throws {Error} If the length of the `values` buffer is not
 * acceptable.
 */
function ReadObjectResponse( values )
{
  Response.call(this, 0x43);

  if (values.length < 0 || values.length > 500)
  {
    throw new Error(util.format(
      "The length of the `values` buffer must be a number "
        + "between 0 and 500, got: %d",
      values.length
    ));
  }

  /**
   * Values of the registers. A buffer of  length between 2 and 500.
   *
   * @private
   * @type {Buffer}
   */
  this.values = values;
}

util.inherits(ReadObjectResponse, Response);

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
 * @returns {ReadObjectResponse} A response
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadObjectResponse.fromOptions = function(options)
{
  return new ReadObjectResponse(options.values);
};

/**
 * Creates a new response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the response.
 * @returns {ReadObjectResponse} A response
 * created from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of the response message.
 */
ReadObjectResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 2);
  util.assertFunctionCode(buffer[0], 0x43);

  var byteCount = buffer[1];
  var values = Buffer.alloc(byteCount);

  buffer.copy(values, 0, 2, byteCount + 2);

  return new ReadObjectResponse(values);
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
ReadObjectResponse.prototype.toBuffer = function()
{
  return new buffers.BufferBuilder()
    .pushByte(0x43)
    .pushByte(this.values.length)
    .pushBuffer(this.values)
    .toBuffer();
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
ReadObjectResponse.prototype.toString = function()
{
  return util.format(
    "0x43 (RES) %d bytes: ",
    this.values.length,
    this.values
  );
};

/**
 * @returns {Buffer} Values of the data values.
 */
ReadObjectResponse.prototype.getValues = function()
{
  return this.values;
};

/**
 * @returns {number} A number of the data values.
 */
ReadObjectResponse.prototype.getCount = function()
{
  return this.values.length;
};
