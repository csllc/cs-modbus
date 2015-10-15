'use strict';

var util = require('./util');
var Response = require('./Response');

module.exports = WriteObjectResponse;

/**
 * The write Object response (code 0x44).
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
function WriteObjectResponse(quantity)
{
  Response.call(this, 0x44);

  /**
   * the response status
   *
   * @private
   * @type {number}
   */
  this.status = util.prepareNumericOption(quantity, 0, 0, 250, 'Code');
}

util.inherits(WriteObjectResponse, Response);

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
 * @returns {WriteObjectResponse} A response
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteObjectResponse.fromOptions = function(options)
{
  return new WriteObjectResponse(options.status);
};

/**
 * Creates a response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the response.
 * @returns {WriteObjectResponse} Read input
 * registers response.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of the read input registers response.
 */
WriteObjectResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 2);
  util.assertFunctionCode(buffer[0], 0x44);

  return new WriteObjectResponse( buffer[1] );
};

/**
 * Returns a binary representation of the read input registers response.
 *
 * @returns {Buffer} A binary representation of the response.
 */
WriteObjectResponse.prototype.toBuffer = function()
{
  var buffer = new Buffer(2);

  buffer[0] = 0x44;
  buffer[1] = this.status;

  return buffer;
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
WriteObjectResponse.prototype.toString = function()
{
  return util.format(
    "0x44 (RES) Result status %d",
    this.status
  );
};

/**
 * @returns {number} A quantity of bytes written.
 */
WriteObjectResponse.prototype.getStatus = function()
{
  return this.status;
};
