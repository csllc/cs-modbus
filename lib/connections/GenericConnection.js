/**
 * Implements a generic connection class 
 * This can be used when you have a connection type that isn't embedded
 * in the cs-modbus library.  You create your connection externally, and 
 * pass the object to the cs-modbus library.  As long as it 
 * implements the correct interface, this will glue it into CS-MODBUS
 * 
 */
'use strict';

var util = require('util');
var Connection = require('../Connection');

module.exports = GenericConnection;

/**
 * @constructor
 * @extends {Connection}
 * @param {GenericConnection.Options|object} options
 * @event open Alias to the `listening` event of the underlying `dgram.Socket`.
 * @event close Alias to the `close` event of the underlying `dgram.Socket`.
 * @event error Emitted when the underlying `dgram.Socket` emits the `error`
 * event or its `send()` method throws.
 * @event write Emitted before writing any data to the underlying
 * `dgram.Socket` (even if the socket is closed).
 * @event data Alias to the `message` event of the underlying `dgram.Socket`.
 */
function GenericConnection( connection )
{
  Connection.call(this);

  this.connection = connection;

  // wire up the connection's events so they get passed to our listeners
  // We register for several variations because some connection types 
  // might differ in the events they emit
  connection.on('open', this.emit.bind(this, 'open'));
  connection.on('close', this.emit.bind(this, 'close'));
  connection.on('error', this.emit.bind(this, 'error'));
  connection.on('data', this.emit.bind(this, 'data'));

  // if already connected, let our listeners know
  if( connection.isOpen() ) {
    this.emit( 'open' );
  }
}

util.inherits(GenericConnection, Connection);


GenericConnection.prototype.destroy = function(){
  this.removeAllListeners();

  if (this.connection )
  {
    try {
      this.connection.destroy();
    }
    catch( e ) {

    }
    this.connection = null;
  }
};

/**
 * @returns {boolean} Returns `true` if the underlying connection is open
 */
GenericConnection.prototype.isOpen = function()
{
  return this.connection.isConnected();
};

/**
 * @param {Buffer} data
 */
GenericConnection.prototype.write = function(data)
{
  this.emit('write', data);

  try
  {
    this.connection.write( data );
  }
  catch (err)
  {
    this.emit('error', err);
  }
};

