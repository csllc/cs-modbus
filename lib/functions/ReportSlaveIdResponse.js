'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Response = require('./Response');

module.exports = ReportSlaveIdResponse;

/**
 * The Slave ID response (code 0x11).
 *
 * A binary representation of this response is fixed length and consists of:
 *
 *   - a function code (1 byte),
 *   - a byte count `N` (1 byte),
 *   - a product ID (1 byte).
 *   - A run indicator (1 byte)
 *   - Software version (3 bytes)
 *   - optional additional data values (n bytes)
 *
 * @constructor
 * @extends {Response}
 * @param {byte} product Product ID
 * @param {byte} run The device's run indicator
 * @param {string} Software version (x.y.z) where x,y,and z are 0-255 inclusive
 * @param {buffer} Additional data bytes
 * @throws {Error} If the parameters are not valid
 */
function ReportSlaveIdResponse(product, run, version, values )
{
  Response.call(this, 0x11);

  if( product < 0 || product > 255 )
  {
    throw new Error(util.format(
      "Invalid Product ID, got: %d",
      product
    ));
  }

  if( run < 0 || run > 255 )
  {
    throw new Error(util.format(
      "Invalid Run Indicator, got: %d",
      run
    ));
  }

  var token = version.split('.');

  if( token.length !== 3 )
  {
    throw new Error(util.format(
      "Invalid Version, got: %s",
      version
    ));
  }

  /**
   * Values of the registers. A buffer of even length between 2 and 250.
   *
   * @private
   * @type {Buffer}
   */
  this.product = product;
  this.run = run;
  this.version = [
    parseInt(token[0],10),
    parseInt(token[1],10),
    parseInt(token[2],10)
    ];

  this.values = values || Buffer.alloc(0);

}

util.inherits(ReportSlaveIdResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `product` (byte, required)
 *   - `run` (byte, required)
 *   - `version` (string, required)
 *   - `values` (buffer, optional)
 *
 * @param {object} options An options object.
 * @param {integer} options.product
 * @param {run} options.run
 * @param {version} options.version
 * @param {values} options.values
 * @returns {ReportSlaveIdResponse} A response
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReportSlaveIdResponse.fromOptions = function(options)
{
  options.values = options.values || Buffer.alloc(0);

  return new ReportSlaveIdResponse(
    options.product,
    options.run,
    options.version);
};

/**
 * Creates a new response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the response.
 * @returns {ReportSlaveIdResponse} A response
 * created from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of the read holding registers response.
 */
ReportSlaveIdResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 7);
  util.assertFunctionCode(buffer[0], 0x11);

  //var byteCount = buffer[1];
  var version = util.format(
    "%d.%d.%d",
    buffer[4],
    buffer[5],
    buffer[6]
    );

  var numValues = buffer.length - 7;
  var values = Buffer.alloc( numValues );
  if( numValues > 0 ) {
    buffer.copy( values, 0, 7);
  }
  return new ReportSlaveIdResponse(buffer[2], buffer[3], version, values );
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
ReportSlaveIdResponse.prototype.toBuffer = function()
{
  return new buffers.BufferBuilder()
    .pushByte(0x11)
    .pushByte(this.product)
    .pushByte(this.run)
    .pushByte(this.version[0])
    .pushByte(this.version[1])
    .pushByte(this.version[2])
    .pushBuffer(this.values)
    .toBuffer();
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
ReportSlaveIdResponse.prototype.toString = function()
{
  var serial = '';

  if( 4 === this.values.length ) {
    serial = this.values.readUInt32BE(0).toString(10);
  }

  return util.format(
    "0x11 (RES) Prod: %d, Run: %d, Ver: %s Serial: %s",
    this.product,
    this.run,
    this.getVersion(),
    serial
  );
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
ReportSlaveIdResponse.prototype.getVersion = function()
{
  return util.format(
    "%d.%d.%d",
    this.version[0],
    this.version[1],
    this.version[2]
    );
};

/**
 * Returns the values buffer
 *
 * @returns {buffer} data values
 */
ReportSlaveIdResponse.prototype.getValues = function()
{
  return this.values;
};
