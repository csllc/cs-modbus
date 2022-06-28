'use strict';

var util = require('./util');
var Response = require('./Response');

module.exports = WriteMemoryVerifyResponse;

/**
 * The verified write memory response (code 0x64).
 *
 * A binary representation of this response is 2 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - a response status (1 byte),
 *
 * @constructor
 * @extends {Response}
 * @param {number} status A success indicator (0=success)
 * @throws {Error} If the `quantity` is not a number between 0 and 250.
 */
function WriteMemoryVerifyResponse(quantity)
{
  Response.call(this, 0x64);

  /**
   * Response status
   *
   * @private
   * @type {number}
   */
  this.status = util.prepareNumericOption(quantity, 0, 0, 250, 'Code');
}

util.inherits(WriteMemoryVerifyResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `status` (number) -
 *     result status
 *
 * @param {object} options An options object.
 * @param {number} [options.status]
 * @returns {WriteMemoryVerifyResponse} A response
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteMemoryVerifyResponse.fromOptions = function(options)
{
  return new WriteMemoryVerifyResponse(options.status);
};

/**
 * Creates a response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the response.
 * @returns {WriteMemoryVerifyResponse} Read input
 * registers response.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of the read input registers response.
 */
WriteMemoryVerifyResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 2);
  util.assertFunctionCode(buffer[0], 0x64);

  return new WriteMemoryVerifyResponse( buffer[1] );
};

/**
 * Returns a binary representation of the read input registers response.
 *
 * @returns {Buffer} A binary representation of the response.
 */
WriteMemoryVerifyResponse.prototype.toBuffer = function()
{
  var buffer = new Buffer(2);

  buffer[0] = 0x64;
  buffer[1] = this.status;

  return buffer;
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
WriteMemoryVerifyResponse.prototype.toString = function()
{
  return util.format(
    "0x64 (RES) Result status %d",
    this.status
  );
};

/**
 * @returns {number} A quantity of bytes written.
 */
WriteMemoryVerifyResponse.prototype.getStatus = function()
{
  return this.status;
};
