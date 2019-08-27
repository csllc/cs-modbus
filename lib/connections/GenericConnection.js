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
 * @param {Object} connection - an object representing the hardware interface.
 * @event open emitted when the connection is opened
 * @event close emitted when the connection is closed
 * @event error emitted when an error is detected by the connection
 * or its `send()` method throws.
 * @event write Emitted before writing any data to the underlying
 * connection (even if the connection is closed).
 * @event data emitted when the connection receives data
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

