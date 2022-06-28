'use strict';

var util = require('./util');
var Request = require('./Request');
var WriteObjectResponse =
  require('./WriteObjectResponse');

module.exports = WriteObjectRequest;

/**
 * The write object request (code 0x44).
 *
 * A binary representation of this request varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - an object id (1 byte),
 *   - a byte count (`N`; 1 byte),
 *   - values of the registers (`N` bytes).
 *
 * @constructor
 * @extends {Request}
 * @param {number} id the object ID
 * @param {Buffer} values the object data
 * @throws {Error} If the `id` is not a number between 0 and 0xFF.
 * @throws {Error} If the `values` is not between 1 and 250 bytes
 */
function WriteObjectRequest(id, values)
{
  Request.call(this, 0x44);

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

util.inherits(WriteObjectRequest, Request);

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
 * @returns {WriteObjectRequest} A request
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteObjectRequest.fromOptions = function(options)
{
  return new WriteObjectRequest(options.id, options.values);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {WriteObjectRequest} A request
 * created from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
WriteObjectRequest.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 4);
  util.assertFunctionCode(buffer[0], 0x44);

  var id = buffer[1];
  var byteCount = buffer[2];
  var values = Buffer.alloc(byteCount);

  buffer.copy(values, 0, 3, 3 + byteCount);

  return new WriteObjectRequest(id, values);
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
WriteObjectRequest.prototype.toBuffer = function()
{
  var buffer = Buffer.alloc(3 + this.values.length);

  buffer[0] = 0x44;
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
WriteObjectRequest.prototype.toString = function()
{
  return util.format(
    "0x44 (REQ) Write %d bytes to Object %d :",
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
WriteObjectRequest.prototype.createResponse =
  function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    WriteObjectResponse
  );
};

/**
 * @returns {number} The Object ID.
 */
WriteObjectRequest.prototype.getId = function()
{
  return this.id;
};

/**
 * @returns {Buffer} object data
 */
WriteObjectRequest.prototype.getValues = function()
{
  return this.values;
};
