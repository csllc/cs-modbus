/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var EventEmitter = require('events').EventEmitter;
var sinon = require('sinon');
var SerialConnection = require(LIB_DIR + '/connections/SerialConnection');

describe("SerialConnection", function()
{
  it("should emit error events emitted by the specified SerialPort", function()
  {
    var serialPort = new EventEmitter();
    var expectedHits = [[new Error("ERROR!")]];
    var actualHits = [];

    var conn = new SerialConnection(serialPort);

    conn.on('error', function()
    {
      actualHits.push([].slice.call(arguments));
    });

    serialPort.emit('error', expectedHits[0][0]);

    actualHits.should.be.eql(expectedHits);
  });

  it("should emit data events emitted by the specified SerialPort", function()
  {
    var serialPort = new EventEmitter();
    var expectedHits = [[Buffer.alloc(10)]];
    var actualHits = [];

    var conn = new SerialConnection(serialPort);

    conn.on('data', function()
    {
      actualHits.push([].slice.call(arguments));
    });

    serialPort.emit('data', expectedHits[0][0]);

    actualHits.should.be.eql(expectedHits);
  });

  it("should emit open events emitted by the specified SerialPort", function()
  {
    var serialPort = new EventEmitter();
    var expectedHits = 1;
    var actualHits = 0;

    var conn = new SerialConnection(serialPort);

    conn.on('open', function()
    {
      actualHits++;
    });

    serialPort.emit('open');

    actualHits.should.be.eql(expectedHits);
  });

  it("should emit close events emitted by the specified SerialPort", function()
  {
    var serialPort = new EventEmitter();
    var expectedHits = 1;
    var actualHits = 0;

    var conn = new SerialConnection(serialPort);

    conn.on('close', function()
    {
      actualHits++;
    });

    serialPort.emit('close');

    actualHits.should.be.eql(expectedHits);
  });

  describe("write", function()
  {
    it("should delegate to a write method of the specified SerialPort", function()
    {
      var serialPort = new EventEmitter();
      var expectedHits = [[Buffer.alloc(10)]];
      var actualHits = [];

      serialPort.write = function()
      {
        actualHits.push([].slice.call(arguments));
      };

      var conn = new SerialConnection(serialPort);

      conn.write(expectedHits[0][0]);

      actualHits.should.be.eql(expectedHits);
    });

    it("should emit exceptions thrown by the SerialPort.write() as error events", function()
    {
      var serialPort = new EventEmitter();
      var expectedError = new Error();
      var actualError = null;

      serialPort.write = function()
      {
        throw expectedError;
      };

      var conn = new SerialConnection(serialPort);

      conn.on('error', function(err)
      {
        actualError = err;
      });

      conn.write(Buffer.alloc(10));

      actualError.should.be.equal(expectedError);
    });

    it("should emit a write event with the specified data as the first argument", function()
    {
      var serialPort = new EventEmitter();
      var expectedHits = [[Buffer.alloc(10)]];
      var actualHits = [];

      serialPort.write = function() {};

      var conn = new SerialConnection(serialPort);

      conn.on('write', function()
      {
        actualHits.push([].slice.call(arguments));
      });

      conn.write.apply(conn, expectedHits[0]);

      actualHits.should.be.eql(expectedHits);
    });

    it("should emit a write event even if the SerialPort.write() threw", function()
    {
      var serialPort = new EventEmitter();
      var expectedHits = [[Buffer.alloc(10)]];
      var actualHits = [];
      var expectedError = new Error("FAKE SerialPort.write()");
      var actualError = null;

      serialPort.write = function() { throw expectedError; };

      var conn = new SerialConnection(serialPort);

      conn.on('error', function(err)
      {
        actualError = err;
      });
      conn.on('write', function()
      {
        actualHits.push([].slice.call(arguments));
      });

      conn.write.apply(conn, expectedHits[0]);

      actualHits.should.be.eql(expectedHits);
      actualError.should.be.equal(expectedError);
    });
  });

  describe("destroy", function()
  {
    it("should remove all listeners", function()
    {
      var serialPort = new EventEmitter();
      var spy = sinon.spy();

      serialPort.close = function() {};

      var conn = new SerialConnection(serialPort);

      conn.on('test', spy);

      conn.destroy();

      conn.emit('test', 'test');

      sinon.assert.notCalled(spy);
    });

    it("should remove all listeners from the SerialPort", function()
    {
      var serialPort = new EventEmitter();
      var spy = sinon.spy();

      serialPort.close = function() {};
      serialPort.on('test', spy);

      var conn = new SerialConnection(serialPort);

      conn.destroy();

      serialPort.emit('test', 'test');

      sinon.assert.notCalled(spy);
    });

    it("should close the SerialPort", function()
    {
      var serialPort = new EventEmitter();
      var spy = sinon.spy();

      serialPort.close = spy;

      var conn = new SerialConnection(serialPort);

      conn.destroy();

      sinon.assert.calledOnce(spy);
    });

    it("should not throw if called multiple times", function()
    {
      var serialPort = new EventEmitter();

      serialPort.close = function() {};

      var conn = new SerialConnection(serialPort);

      function test()
      {
        conn.destroy();
        conn.destroy();
        conn.destroy();
        conn.destroy();
      }

      test.should.not.throw();
    });
  });

  describe("isOpen", function()
  {
    it("should return true if the SerialPort.isOpen property is truthy", function()
    {
      [true, 1, 'yes'].forEach(function(truthy)
      {
        var serialPort = new EventEmitter();
        serialPort.isOpen = truthy;

        var conn = new SerialConnection(serialPort);
        conn.isOpen().should.be.ok;
      });
    });

    it("should return false if the SerialPort.isOpen property is falsy", function()
    {
      [false, 0, 'no'].forEach(function(falsy)
      {
        var serialPort = new EventEmitter();
        serialPort.isOpen = falsy;

        var conn = new SerialConnection(serialPort);
        conn.isOpen().should.be.not.ok;
      });
    });
  });
});
