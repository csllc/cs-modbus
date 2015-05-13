'use strict';

var util = require('util');
var Connection = require('../Connection');

module.exports = NoConnection;

/**
 * @constructor
 * @extends {Connection}
 * @param {serialport.SerialPort} serialPort
 * @event open Alias to the `open` event of the underlying `SerialPort`.
 * @event close Alias to the `close` event of the underlying `SerialPort`.
 * @event error Emitted when the underlying `SerialPort` emits the `error`
 * event or its `write()` method throws.
 * @event write Emitted before writing any data to the underlying
 * `SerialPort` (even if the serial port is closed).
 * @event data Alias to the `data` event of the underlying `SerialPort`.
 */
function NoConnection(serialPort)
{
  Connection.call(this);
}

util.inherits(NoConnection, Connection);

NoConnection.prototype.destroy = function() {};

/**
 * @returns {boolean}
 */
NoConnection.prototype.isOpen = function() {
  return true;
};

/**
 * @param {Buffer} data
 */
NoConnection.prototype.write = function(data)
{
  try {
    this.emit('write', data);
  } catch (e){
    this.emit('error', e);
  }
};
