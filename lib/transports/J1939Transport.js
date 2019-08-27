/**
 * Implements a MODBUS transport over a J1939 CANBUS connection
 * 
 * Requires the use of a J1939 connection which has the following methods:
 *   - sendPgn
 *   - isOpen
 *   
 * The connection must emit the following events:
 *   - 
 */
'use strict';

var util = require('util');
//var buffers = require('h5.buffers');
var Transport = require('../Transport');
//var InvalidResponseDataError = require('../errors').InvalidResponseDataError;

var J1939_PGN_PROPRIETARY_A = 61184;

module.exports = J1939Transport;

/**
 * @constructor
 * @extends {Transport}
 * @param {Connection} connection
 * @event request Emitted right before the ADU is passed to the underlying
 * `Connection`.
 */
function J1939Transport(connection)
{
  Transport.call(this, connection);

  /**
   * @private
   * @type {object.<number, Transaction>}
   */
  this.transactions = {};

  // wire the connection's data event to our onPgn method
  this.connection.on('data', this.onPgn.bind(this));
}

util.inherits(J1939Transport, Transport);


/**
 * @param {Transaction} transaction
 */
J1939Transport.prototype.sendRequest = function(transaction)
{
  //var id = this.getNextTransactionId();
  var adu = this.getAdu( transaction);

  this.transactions[transaction.getUnit()] = transaction;

  this.emit('request', transaction);

  this.connection.write( adu );

  transaction.start(this.createTimeoutHandler(transaction.getUnit()));
};


/**
 * @private
 * @param {number} id
 * @param {Transaction} transaction
 * @returns {Buffer}
 */
J1939Transport.prototype.getAdu = function( transaction)
{
  var adu = transaction.getAdu();

  if (adu === null)
  {
    adu = this.buildAdu( transaction);
  }

  return adu;
};

/**
 * @private
 * @param {number} id
 * @param {Transaction} transaction
 * @returns {Buffer}
 */
J1939Transport.prototype.buildAdu = function(transaction)
{
  var request = transaction.getRequest();
  
  var adu = {
    pgn: J1939_PGN_PROPRIETARY_A,
    dst: transaction.getUnit(),
    buf: request.toBuffer()
  };

  transaction.setAdu(adu);

  return adu;
};


/**
 * @private
 * @param {number} id
 * @returns {function}
 */
J1939Transport.prototype.createTimeoutHandler = function(id)
{
  var transactions = this.transactions;

  return function()
  {
    if (typeof transactions[id] !== 'undefined')
    {
      delete transactions[id];
    }
  };
};

/**
 * @private
 * @param {Buffer} [data]
 */
J1939Transport.prototype.onPgn = function(pgn)
{
  if( pgn.pgn === J1939_PGN_PROPRIETARY_A ) {
    var transaction = this.transactions[ pgn.src ];

    if (typeof transaction === 'undefined') {
      // we have no transaction in progress for this unit

      return;
    }
    else {
      // we have a transaction in progress and got an incoming
      // message.  Try to formulate it into a response
      var request = transaction.getRequest();

      try
      {
        transaction.handleResponse(request.createResponse( pgn.buf ));
      }
      catch (error)
      {
        transaction.handleError(error);
      }

    }
  }


};

