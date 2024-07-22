'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Response = require('./Response');

module.exports = CommandResponse;

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
function CommandResponse( id, values )
{
  Response.call(this, 0x47);

  if (values.length < 0 || values.length > 500)
  {
    throw new Error(util.format(
      "The length of the `values` buffer must be a number "
        + "between 0 and 500, got: %d",
      values.length
    ));
  }

  if (id < 0 || id > 255)
  {
    throw new Error(util.format(
      "Invalid Command ID (must be 0 to 255) "
        + "got: %d",
      id
    ));
  }

  this.id = id;

  /**
   * Values of the registers. A buffer of length between 2 and 250.
   *
   * @private
   * @type {Buffer}
   */
  this.values = values;
}

util.inherits(CommandResponse, Response);

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
CommandResponse.fromOptions = function(options)
{
  return new CommandResponse(options.id, options.values);
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
CommandResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 2);
  util.assertFunctionCode(buffer[0], 0x47);

  var id = buffer[1];
  var byteCount = buffer.length - 2;
  var values = Buffer.alloc(byteCount);

  buffer.copy(values, 0, 2, byteCount + 2);

  return new CommandResponse(id, values);
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
CommandResponse.prototype.toBuffer = function()
{
  return new buffers.BufferBuilder()
    .pushByte(0x47)
    .pushByte(this.id)
    .pushBuffer(this.values)
    .toBuffer();
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
CommandResponse.prototype.toString = function()
{
  return util.format(
    "0x47 (RES) Command %d: ",
    this.id,
    this.values
  );
};

/**
 * @returns {number} Command ID
 */
CommandResponse.prototype.getId = function()
{
  return this.id;
};

/**
 * @returns {Buffer} Values of the data values.
 */
CommandResponse.prototype.getValues = function()
{
  return this.values;
};

/**
 * @returns {number} A number of the data values.
 */
CommandResponse.prototype.getCount = function()
{
  return this.values.length;
};
