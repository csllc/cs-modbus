'use strict';

var util = require('./util');
var Request = require('./Request');
var WriteMemoryResponse =
  require('./WriteMemoryResponse');

module.exports = WriteMemoryRequest;

/**
 * The write memory request (code 0x4B).
 *
 * A binary representation of this request varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a memory type (1 byte),
 *   - a page number (1 byte),
 *   - a starting address (2 bytes, big endian),
 *   - a byte count (`N`; 1 byte),
 *   - values to be written (`N` bytes).
 *
 * @constructor
 * @extends {Request}
 * @param {number} id the object ID
 * @param {Buffer} values the object data
 * @throws {Error} If the `id` is not a number between 0 and 0xFF.
 * @throws {Error} If the `values` is not between 1 and 250 bytes
 */
function WriteMemoryRequest(type, page, address, values)
{
  Request.call(this, 0x4B);

  if( values.length < 1 || values.length > 250)
  {
    throw new Error(util.format(
      "The length of the `values` Buffer must be  "
        + "between 1 and 250, got: %d",
      values.length
    ));
  }

  /**
   * Memory type A number between 0 and 0xFF.
   *
   * @private
   * @type {number}
   */
  this.type = util.prepareNumericOption(type, 0, 0, 255, 'type');

  /**
   * Memory page A number between 0 and 0xFF.
   *
   * @private
   * @type {number}
   */
  this.page = util.prepareNumericOption(page, 0, 0, 255, 'page');

  /**
   * A starting address. A number between 0 and 0xFFFF.
   *
   * @private
   * @type {number}
   */
  this.address = util.prepareAddress(address);

  /**
   * Values of the registers. A buffer of length between 1 and 250.
   *
   * @private
   * @type {Buffer}
   */
  this.values = values;
}

util.inherits(WriteMemoryRequest, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are:
 *
 *   - `type` (number, optional) -
 *     The memory type. If specified, must be a number between 0 and 0xFF.
 *     Defaults to 0.
 *
 *   - `page` (number, optional) -
 *     The memory page. If specified, must be a number between 0 and 0xFF.
 *     Defaults to 0.

 *   - `address` (number, optional) -
 *     The starting address. If specified, must be a number
 *     between 0 and 0xFFFF.
 *     Defaults to 0.
 *
 *   - `values` (Buffer, required) -
 *     Values of the registers. Must be a buffer of length
 *     between 1 and 250.
 *
 * @param {object} options An options object.
 * @param {number} [options.type]
 * @param {number} [options.page]
 * @param {number} [options.address]
 * @param {Buffer} options.values
 * @returns {WriteMemoryRequest} A request
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteMemoryRequest.fromOptions = function(options)
{
  return new WriteMemoryRequest(options.type, options.page,
    options.address, options.values);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {WriteMemoryRequest} A request
 * created from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
WriteMemoryRequest.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 7);
  util.assertFunctionCode(buffer[0], 0x4B);

  var type = buffer[1];
  var page = buffer[2];
  var address = buffer.readUInt16BE(3, true);

  var byteCount = buffer[5];
  var values = new Buffer(byteCount);

  buffer.copy(values, 0, 6, 6 + byteCount);

  return new WriteMemoryRequest(type, page, address, values);
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
WriteMemoryRequest.prototype.toBuffer = function()
{
  var buffer = new Buffer(6 + this.values.length);

  buffer[0] = 0x4B;
  buffer[1] = this.type;
  buffer[2] = this.page;
  buffer.writeUInt16BE(this.address, 3, true);
  buffer[5] = this.values.length;

  this.values.copy(buffer, 6);

  return buffer;
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
WriteMemoryRequest.prototype.toString = function()
{
  return util.format(
    "0x4B (REQ) Write %d bytes to Memory type %d at address %d:%d:",
    this.values.length,
    this.type,
    this.page,
    this.address,
    this.values
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
WriteMemoryRequest.prototype.createResponse =
  function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    WriteMemoryResponse
  );
};

/**
 * @returns {number} The memory type.
 */
WriteMemoryRequest.prototype.getType = function()
{
  return this.type;
};

/**
 * @returns {number} The memory page.
 */
WriteMemoryRequest.prototype.getPage = function()
{
  return this.page;
};

/**
 * @returns {number} The memory address.
 */
WriteMemoryRequest.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @returns {number} The byte count.
 */
WriteMemoryRequest.prototype.getCount = function()
{
  return this.values.length;
};

/**
 * @returns {Buffer} Values of the registers
 */
WriteMemoryRequest.prototype.getValues = function()
{
  return this.values;
};
