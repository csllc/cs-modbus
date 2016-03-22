'use strict';

var util = require('util');
var Connection = require('../Connection');

module.exports = WebsocketConnection;

/**
 * @constructor
 * @extends {Connection}
 * @param {WebsocketConnection.Options|object} options
 * @event open Alias to the `connect` event of the underlying `Socket`.
 * @event close Alias to the `disconnect` event of the underlying `Socket`.
 * @event error Emitted when the underlying `Socket` emits the `error`
 * event or throws.
 * @event write Emitted before writing any data to the underlying
 * `Socket` (even if the socket is closed).
 * @event data Alias to the `message` event of the underlying `Socket`.
 */
function WebsocketConnection(socket)
{
  Connection.call(this);

  /**
   * @readonly
   * @type {WebsocketConnection.Options}
   */
/*
  this.options = options instanceof WebsocketConnection.Options
    ? options
    : new WebsocketConnection.Options(options);
console.log( this.options);
*/
  /**
   * @private
   * @type {dgram.Socket}
   */
  this.socket = this.setUpSocket(socket);

  //this.socket.connect(this.url);
}

util.inherits(WebsocketConnection, Connection);

/**
 * @constructor
 * @param {object} options
 * @param {Socket} options.socket
 * @param {string} [options.url]
 */
WebsocketConnection.Options = function(options)
{
  /**
   * @type {Socket}
   */
  this.socket = options.socket;

  /**
   * @type {string}
   */
  //this.url = typeof options.url === 'string' ?
  //  options.url : 'http://127.0.0.1:8080';

};

WebsocketConnection.prototype.destroy = function()
{
  this.removeAllListeners();

  this.options = null;

  if (this.socket !== null)
  {
    this.socket.removeAllListeners();
    this.socket.close();
    this.socket = null;
  }
};

/**
 * @returns {boolean} Returns `true` if the underlying `Socket` is connected,
 *
 */
WebsocketConnection.prototype.isOpen = function()
{
  try{
    return (this.socket.connected ? true: false);
  }
  catch(e) {
    return false;
  }
};

/**
 * @param {Buffer} data
 */
WebsocketConnection.prototype.write = function(data)
{
  this.emit('write', data);

  try
  {
    this.socket.emit(
      'data',
      data );
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
WebsocketConnection.prototype.setUpSocket = function(socket)
{
  //var socket = this.options.socket;

  socket.on('connect', this.emit.bind(this, 'open'));
  socket.on('disconnect', this.emit.bind(this, 'close'));
  socket.on('error', this.emit.bind(this, 'error'));
  socket.on('data', this.emit.bind(this, 'data'));

  return socket;
};
