'use strict';

var util = require('./util');
var Request = require('./Request');
var WriteFifo8Response =
  require('./WriteFifo8Response');

module.exports = WriteFifo8Request;

/**
 * The write 8-bit FIFO request (code 0x47).
 *
 * A binary representation of this request varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a FIFO Id (1 byte),
 *   - a byte count (`N`; 1 byte),
 *   - values to be written (`N` bytes).
 *
 * @constructor
 * @extends {Request}
 * @param {number} id the FIFO ID
 * @param {Buffer} values Values to be written to the FIFO
 * @throws {Error} If the `id` is not a number between 0 and 0xFF.
 * @throws {Error} If the `values` is not between 1 and 250 bytes
 */
function WriteFifo8Request(id, values)
{
  Request.call(this, 0x47);

  if( values.length < 1 || values.length > 250)
  {
    throw new Error(util.format(
      "The length of the `values` Buffer must be  "
        + "between 1 and 250, got: %d",
      values.length
    ));
  }

  /**
   * A starting address. A number between 0 and 0xFFFF.
   *
   * @private
   * @type {number}
   */
  this.id = util.prepareNumericOption(id, 0, 0, 255, 'id');

  /**
   * Values of the registers. A buffer of length between 1 and 250.
   *
   * @private
   * @type {Buffer}
   */
  this.values = values;
}

util.inherits(WriteFifo8Request, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are:
 *
 *   - `id` (number, optional) -
 *     The object ID. If specified, must be a number between 0 and 0xFF.
 *     Defaults to 0.
 *
 *   - `values` (Buffer, required) -
 *     Values of the registers. Must be a buffer of length
 *     between 1 and 250.
 *
 * @param {object} options An options object.
 * @param {number} [options.id]
 * @param {Buffer} options.values
 * @returns {WriteFifo8Request} A request
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteFifo8Request.fromOptions = function(options)
{
  return new WriteFifo8Request(options.id, options.values);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {WriteFifo8Request} A request
 * created from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
WriteFifo8Request.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 4);
  util.assertFunctionCode(buffer[0], 0x47);

  var id = buffer[1];
  var byteCount = buffer[2];
  var values = new Buffer(byteCount);

  buffer.copy(values, 0, 3, 3 + byteCount);

  return new WriteFifo8Request(id, values);
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
WriteFifo8Request.prototype.toBuffer = function()
{
  var buffer = new Buffer(3 + this.values.length);

  buffer[0] = 0x47;
  buffer[1] = this.id;
  buffer[2] = this.values.length;
  this.values.copy(buffer, 3);

  return buffer;
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
WriteFifo8Request.prototype.toString = function()
{
  return util.format(
    "0x47 (REQ) Write %d bytes to FIFO %d :",
    this.values.length,
    this.id,
    this.values
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
WriteFifo8Request.prototype.createResponse =
  function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    WriteFifo8Response
  );
};

/**
 * @returns {number} The FIFO ID.
 */
WriteFifo8Request.prototype.getId = function()
{
  return this.id;
};

/**
 * @returns {Buffer} Values of the registers
 */
WriteFifo8Request.prototype.getValues = function()
{
  return this.values;
};
