'use strict';

var util = require('util');
var Connection = require('../Connection');

module.exports = NoConnection;

/**
 * @constructor
 * @extends {Connection}
 */
function NoConnection()
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
