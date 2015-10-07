'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Request = require('./Request');
var ReportSlaveIdResponse = require('./ReportSlaveIdResponse');

module.exports = ReportSlaveIdRequest;

/**
 * The Report Slave ID request (code 0x11).
 *
 * A binary representation of this request is 1 byte long and consists of:
 *
 *   - a function code (1 byte),
 *
 * @constructor
 * @extends {Request}
 * @throws {Error} If any of the specified sub-requests are invalid.
 */
function ReportSlaveIdRequest()
{
  Request.call(this, 0x11);

}

util.inherits(ReportSlaveIdRequest, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are:
 *
 *
 * @param {object} options An options object.
 * @returns {ReportSlaveIdRequest} A request created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReportSlaveIdRequest.fromOptions = function(options)
{
  return new ReportSlaveIdRequest(options);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {ReportSlaveIdRequest} A request created from its binary
 * representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
ReportSlaveIdRequest.fromBuffer = function(buffer)
{
  if( buffer.length !== 1)
  {
    throw new Error(util.format(
      "The specified buffer must be at 1 bytes long, was %d.", buffer.length
    ));
  }
  util.assertFunctionCode(buffer[0], 0x11);

  return new ReportSlaveIdRequest();
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
ReportSlaveIdRequest.prototype.toBuffer = function()
{
  var buffer = new Buffer([0x11]);

  return buffer;
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
ReportSlaveIdRequest.prototype.toString = function()
{
  return util.format(
    '0x11 (REQ) Report Slave ID' );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
ReportSlaveIdRequest.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    ReportSlaveIdResponse
  );
};


/*jshint unused:false*/

