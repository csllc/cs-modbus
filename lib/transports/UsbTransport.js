/**
 * The USB transport is used for Control Solutions products that incorporate at USB
 * MODBUS function.  Data is sent in binary format like RTU, but we rely on
 * the USB framing for packet integrity so there is no start/stop or checksum used.
 *
 */
'use strict';

var util = require('util');
var buffers = require('h5.buffers');
var errors = require('../errors');
var Transport = require('../Transport');

module.exports = UsbTransport;

/**
 * @private
 * @const
 * @type {number}
 */
var MIN_FRAME_LENGTH = 3;



/**
 * @constructor
 * @extends {Transport}
 * @param {UsbTransport.Options|object} options
 * @event request Emitted right before the ADU is passed to the underlying
 * `Connection`.
 */
function UsbTransport(options)
{
  /**
   * @private
   * @type {UsbTransport.Options}
   */
  this.options = options instanceof UsbTransport.Options
    ? options
    : new UsbTransport.Options(options);

  Transport.call(this, this.options.connection);

  /**
   * @private
   * @type {Transaction}
   */
  this.transaction = null;

  /**
   * @private
   * @type {BufferQueueReader}
   */
  this.reader = new buffers.BufferQueueReader();

  /**
   * @private
   * @type {function}
   */
  this.handleFrameData = this.handleFrameData.bind(this);

  /**
   * @private
   * @type {function}
   */
  this.handleTimeout = this.handleTimeout.bind(this);

  this.connection.on('data', this.onData.bind(this));
}

util.inherits(UsbTransport, Transport);

/**
 * @constructor
 * @param {object} options
 * @param {Connection} options.connection
 * @param {number} [options.eofTimeout]
 */
UsbTransport.Options = function(options)
{
  /**
   * @type {Connection}
   */
  this.connection = options.connection;

};

UsbTransport.prototype.destroy = function()
{
  this.removeAllListeners();

  this.options = null;

  if (this.connection !== null)
  {
    this.connection.destroy();
    this.connection = null;
  }

  if (this.transaction !== null)
  {
    this.transaction.destroy();
    this.transaction = null;
  }

};

/**
 * @param {Transaction} transaction
 * @throws {Error}
 */
UsbTransport.prototype.sendRequest = function(transaction)
{
  if (this.transaction !== null)
  {
    throw new Error(
      "Can not send another request while the previous one "
        + "has not yet completed."
    );
  }

  this.transaction = transaction;

  var adu = this.getAdu(transaction);

  this.emit('request', transaction);

  this.connection.write(adu);

  transaction.start(this.handleTimeout);
};

/**
 * @private
 * @param {Transaction} transaction
 * @returns {Buffer}
 */
UsbTransport.prototype.getAdu = function(transaction)
{
  var adu = transaction.getAdu();

  if (adu === null)
  {
    adu = this.buildAdu(transaction);
  }

  return adu;
};

/**
 * @private
 * @param {Transaction} transaction
 * @returns {Buffer}
 */
UsbTransport.prototype.buildAdu = function(transaction)
{
  var request = transaction.getRequest();
  var pdu = request.toBuffer();
  var adu = this.frame(transaction.getUnit(), pdu);

  transaction.setAdu(adu);

  return adu;
};

/**
 * @private
 * @param {number} unit
 * @param {Buffer} pdu
 * @returns {Buffer}
 */
UsbTransport.prototype.frame = function(unit, pdu)
{
  var builder = new buffers.BufferBuilder();

  builder.pushByte(unit);
  builder.pushBuffer(pdu);

  return builder.toBuffer();
};


/**
 * @private
 */
UsbTransport.prototype.handleTimeout = function()
{
  if (this.eofTimer !== null)
  {
    clearTimeout(this.eofTimer);
  }

  this.skipResponseData();
};

/**
 * @private
 */
UsbTransport.prototype.skipResponseData = function()
{
  if (this.reader.length > 0)
  {
    this.reader.skip(this.reader.length);
  }

  this.transaction = null;
};

/**
 * @private
 * @param {Buffer} data
 */
UsbTransport.prototype.onData = function(data)
{

  if (this.transaction === null)
  {
    return;
  }

  this.reader.push(data);

  this.handleFrameData();
};

/**
 * @private
 */
UsbTransport.prototype.handleFrameData = function()
{
  var transaction = this.transaction;

  if (this.reader.length < MIN_FRAME_LENGTH)
  {
    this.skipResponseData();

    transaction.handleError(new errors.IncompleteResponseFrameError());

    return;
  }

  var unit = this.reader.shiftByte();

  // there is probably a better way to extract the response buffer from
  // the reader
  var responseBuffer = this.reader.shiftBuffer(this.reader.length,0);

  this.skipResponseData();

  var validationError = this.validate(
    transaction,
    unit,
    responseBuffer
  );

  if (validationError !== null)
  {
    transaction.handleError(validationError);

    return;
  }

  var request = transaction.getRequest();

  try
  {
    transaction.handleResponse(request.createResponse(responseBuffer));
  }
  catch (error)
  {
    transaction.handleError(error);
  }
};

/**
 * @private
 * @param {Transaction} transaction
 * @param {number} actualUnit
 * @param {Buffer} responseBuffer
 * @param {number} expectedChecksum
 * @returns {Error|null}
 */
UsbTransport.prototype.validate =
  function(transaction, actualUnit, responseBuffer)
{

  var expectedUnit = transaction.getUnit();

  if (actualUnit !== expectedUnit)
  {
    return new errors.InvalidResponseDataError(util.format(
      "Invalid unit specified in the MODBUS response. Expected: %d, got: %d.",
      expectedUnit,
      actualUnit
    ));
  }

  return null;
};
