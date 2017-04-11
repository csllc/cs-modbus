'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Response = require('./Response');

module.exports = ReadFifo8Response;

/**
 * The read FIFO8 response (code 0x41).
 *
 * A binary representation of this response varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a FIFO status (1 byte),
 *   - a count of bytes which follow
 *   - values of the registers (`N` bytes).
 *
 * @constructor
 * @extends {Response}
 * @param {number} status A status indicator
 * @param {Buffer} values data bytes
 * @throws {Error} If the length of the `values` buffer is not
 * between 2 and 250.
 */
function ReadFifo8Response(status, values)
{
  Response.call(this, 0x41);

  if (values.length < 0 || values.length > 250)
  {
    throw new Error(util.format(
      "The length of the `values` buffer must be a number "
        + "between 0 and 250, got: %d",
      values.length
    ));

  }

  this.values = values;

  this.status = status;

}

util.inherits(ReadFifo8Response, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `status` (number, required) - FIFO status byte
 *   - `values` (Buffer, required) -
 *     Values of the registers. Must be a buffer of length
 *     between 0 and 250.
 *
 * @param {object} options An options object.
 * @param {number} options.status a status code
 * @param {Buffer} options.values
 * @returns {ReadFifo8Response} A response
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadFifo8Response.fromOptions = function(options)
{
  return new ReadFifo8Response(options.status, options.values);
};

/**
 * Creates a new response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the response.
 * @returns {ReadFifo8Response} A response
 * created from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of the response message.
 */
ReadFifo8Response.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 3);
  util.assertFunctionCode(buffer[0], 0x41);

  var status = {
    more: ( buffer[1] & 0x01) > 0,
    overflow: ( buffer[1] & 0x02) > 0
  };
  var byteCount = buffer[2];
  var values = new Buffer(byteCount);

  buffer.copy(values, 0, 3, byteCount + 3);

  return new ReadFifo8Response(status, values);
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
ReadFifo8Response.prototype.toBuffer = function()
{
  var status = 0;
  if( this.status.more ){
    status |= 1;
  }

  if( this.status.overflow ){
    status |= 2;
  }

  return new buffers.BufferBuilder()
    .pushByte(0x41)
    .pushByte(status)
    .pushByte(this.values.length)
    .pushBuffer(this.values)
    .toBuffer();
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
ReadFifo8Response.prototype.toString = function()
{
  var status = '';

  if( this.status.more ){
    status = status + 'more ';
  }

  if( this.status.overflow ){
    status = status + 'overflow';
  }

  return util.format(
    "0x41 (RES) Status: %s, %d bytes: ",
    status,
    this.values.length,
    this.values
  );
};

/**
 * @returns {Buffer} Values of the data values.
 */
ReadFifo8Response.prototype.getValues = function()
{
  return this.values;
};

/**
 * @returns {number} A number of the data values.
 */
ReadFifo8Response.prototype.getCount = function()
{
  return this.values.length;
};

/**
 * @returns {number} Status byte for the buffer
 */
ReadFifo8Response.prototype.getStatus = function()
{
  return this.status;
};