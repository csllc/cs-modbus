'use strict';

var Master = require('./Master');
var functions = require('./functions');

/**
 * @private
 * @const
 * @type {object.<string, function(object): Connection>}
 */
var connectionFactories = {
  'tcp': function createTcpConnection(options)
  {
    return new (require('./connections/TcpConnection'))(options);
  },
  'udp': function createUdpConnection(options)
  {
    return new (require('./connections/UdpConnection'))(options);
  },
  'serial': function createSerialConnection(options)
  {
    return new (require('./connections/SerialConnection'))(options.serialPort);
  },
  'generic': function createGenericConnection(options)
  {
    return new (require('./connections/GenericConnection'))(options.device);
  },
  // 'can': function createCanConnection(options)
  // {
  //   return new (require('./connections/CanConnection'))(options);
  // },
  'none': function createNoConnection(options)
  {
    return new (require('./connections/NoConnection'))(options);
  }
};

/**
 * @private
 * @const
 * @type {object.<string, function(object): Transport>}
 */
var transportFactories = {
  'ip': function createIpTransport(options)
  {
    return new (require('./transports/IpTransport'))(
      createConnection(options.connection)
    );
  },
  'socketcand': function createSocketcandTransport(options)
  {
    return new (require('./transports/SocketcandTransport'))(
      createConnection(options.connection)
    );
  },
  // 'cscan': function createCsCanTransport(options)
  // {
  //   return new (require('./transports/CsCanTransport'))(
  //     createConnection(options.connection)
  //   );
  // },
  'j1939': function createJ1939Transport(options)
  {
    return new (require('./transports/J1939Transport'))(
      createConnection(options.connection)
    );
  },
  'CS1179': function createCS1179Transport(options)
  {
    return new (require('./transports/CS1179Transport'))(
      createConnection(options.connection)
    );
  },
  'ascii': function createAsciiTransport(options)
  {
    return new (require('./transports/AsciiTransport'))(
      createConnection(options.connection)
    );
  },
  'rtu': function createRtuTransport(options)
  {
    options.connection = createConnection(options.connection);

    return new (require('./transports/RtuTransport'))(options);
  },
  'tunnel': function createTunnelTransport(options)
  {
    options.connection = createConnection(options.connection);

    return new (require('./transports/TunnelTransport'))(options);
  }
};

/**
 * @private
 * @param {object} [options]
 * @param {string} [options.type]
 * @returns {Connection}
 * @throws {Error} If any of the specified options are invalid.
 */
function createConnection(options)
{
  if (typeof options !== 'object')
  {
    options = {};
  }

  if (typeof options.type !== 'string')
  {
    options.type = 'tcp';
  }

  var connectionFactory = connectionFactories[options.type];

  if (typeof connectionFactory === 'undefined')
  {
    throw new Error("Unknown connection type: " + options.type);
  }

  return connectionFactory(options);
}

/**
 * @private
 * @param {object} [options]
 * @param {string} [options.type]
 * @param {object} [options.connection]
 * @returns {Transport}
 * @throws {Error} If any of the specified options are invalid.
 */
function createTransport(options)
{
  if (typeof options !== 'object')
  {
    options = {};
  }

  if (typeof options.type !== 'string')
  {
    options.type = 'ip';
  }

  var transportFactory = transportFactories[options.type];

  if (typeof transportFactory === 'undefined')
  {
    throw new Error("Unknown transport type: " + options.type);
  }

  return transportFactory(options);
}

/**
 * @param {object} [options]
 * @param {object} [options.transport]
 * @param {boolean} [options.retryOnException]
 * @param {number} [options.maxConcurrentRequests]
 * @param {number} [options.defaultUnit]
 * @param {number} [options.defaultMaxRetries]
 * @param {number} [options.defaultTimeout]
 * @returns {Master}
 * @throws {Error} If any of the specified options are invalid.
 */
function createMaster(options)
{
  if (typeof options === 'undefined')
  {
    options = {};
  }

  options.transport = createTransport(options.transport);
  options = new Master.Options(options);

  return new Master(options);
}

module.exports = {
  createMaster: createMaster,
  functions: functions,
  Register: require('./Register')
};
