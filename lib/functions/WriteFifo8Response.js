'use strict';

var util = require('./util');
var Response = require('./Response');

module.exports = WriteFifo8Response;

/**
 * The write 8-bit FIFO response (code 0x47).
 *
 * A binary representation of this response is 2 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - a quantity of bytes (1 byte),
 *
 * @constructor
 * @extends {Response}
 * @param {number} quantity A quantity of bytes written.
 * @throws {Error} If the `quantity` is not a number between 0 and 250.
 */
function WriteFifo8Response(quantity)
{
  Response.call(this, 0x47);

  /**
   * A quantity of bytes written
   *
   * @private
   * @type {number}
   */
  this.quantity = util.prepareNumericOption(quantity, 0, 0, 250, 'Quantity');
}

util.inherits(WriteFifo8Response, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `quantity` (number) -
 *     A quantity of bytes written.
 *
 * @param {object} options An options object.
 * @param {number} [options.quantity]
 * @returns {WriteFifo8Response} A response
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteFifo8Response.fromOptions = function(options)
{
  return new WriteFifo8Response(options.quantity);
};

/**
 * Creates a response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the response.
 * @returns {WriteFifo8Response} Read input
 * registers response.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of the read input registers response.
 */
WriteFifo8Response.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 2);
  util.assertFunctionCode(buffer[0], 0x47);

  return new WriteFifo8Response( buffer[1] );
};

/**
 * Returns a binary representation of the read input registers response.
 *
 * @returns {Buffer} A binary representation of the response.
 */
WriteFifo8Response.prototype.toBuffer = function()
{
  var buffer = new Buffer(2);

  buffer[0] = 0x47;
  buffer[1] = this.quantity;

  return buffer;
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
WriteFifo8Response.prototype.toString = function()
{
  return util.format(
    "0x47 (RES) Wrote %d bytes",
    this.quantity
  );
};

/**
 * @returns {number} A quantity of bytes written.
 */
WriteFifo8Response.prototype.getQuantity = function()
{
  return this.quantity;
};
