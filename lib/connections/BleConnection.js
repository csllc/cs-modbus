/**
 * Implements a connection class using a Bluetooth Low Energy (BLE)
 * physical interface
 * 
 */
'use strict';

var util = require('util');
var Connection = require('../Connection');

module.exports = BleConnection;

/**
 * @constructor
 * @extends {Connection}
 * @param {BleConnection.Options|object} options
 * @event open Alias to the `listening` event of the underlying `dgram.Socket`.
 * @event close Alias to the `close` event of the underlying `dgram.Socket`.
 * @event error Emitted when the underlying `dgram.Socket` emits the `error`
 * event or its `send()` method throws.
 * @event write Emitted before writing any data to the underlying
 * `dgram.Socket` (even if the socket is closed).
 * @event data Alias to the `message` event of the underlying `dgram.Socket`.
 */
function BleConnection( device )
{
  Connection.call(this);

  /**
   * @readonly
   * @type {BleConnection.Options}
   */
  //this.options = options instanceof BleConnection.Options
  //  ? options
  //  : new BleConnection.Options(options);

  /**
   * @private
   * @type {dgram.Socket}
   */
  this.socket = this.setUpSocket( device );

  // if the socket is already connected when we get initialized...
  //if( this.socket.isConnected()) {
  //  this.emit( 'open' );
  //}
}

util.inherits(BleConnection, Connection);

/**
 * @constructor
 * @param {object} options
 * @param {dgram.Socket} options.socket
 * @param {string} [options.host]
 * @param {number} [options.port]
 */
BleConnection.Options = function(options)
{
  /**
   * @type {dgram.Socket}
   */
  this.socket = options.device;

  /**
   * @type {string}
   */
  //this.host = typeof options.host === 'string' ? options.host : '127.0.0.1';

  /**
   * @type {number}
   */
  //this.port = typeof options.port === 'number' ? options.port : 502;
};

BleConnection.prototype.destroy = function()
{
  this.removeAllListeners();

  this.options = null;

  if (this.socket !== null)
  {
    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
  }
};

/**
 * @returns {boolean} Returns `true` if the underlying `dgram.Socket` is bound,
 * i.e. the `bind()` method was called and the `listening` event was emitted.
 */
BleConnection.prototype.isOpen = function()
{
  return this.socket.isConnected();
};

/**
 * @param {Buffer} data
 */
BleConnection.prototype.write = function(data)
{
  this.emit('write', data);

  try
  {
    this.socket.sendUart( data );
  }
  catch (err)
  {
    this.emit('error', err);
  }
};

/**
 * @private
 * @returns {dgram.Socket}
 */
BleConnection.prototype.setUpSocket = function( device )
{
  var me = this;

  //device.on('connected', this.emit.bind(this, 'open'));
  device.on('connected', function() {
    device.enableUart()
    .then( function() { me.emit( 'open'); });
  });

  device.on('disconnected', this.emit.bind(this, 'close'));
  device.on('error', this.emit.bind(this, 'error'));
  device.on('data', this.emit.bind(this, 'data'));

  return device;
};
