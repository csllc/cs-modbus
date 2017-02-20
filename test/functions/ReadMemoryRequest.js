/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var ReadMemoryRequest = require(LIB_DIR + '/functions/ReadMemoryRequest');
var ReadMemoryResponse = require(LIB_DIR + '/functions/ReadMemoryResponse');
var ExceptionResponse = require(LIB_DIR + '/functions/ExceptionResponse');

describe("ReadMemoryRequest", function()
{


  it("should throw if the address is invalid", function()
  {
    function testLessThanZero1()
    {
      new ReadMemoryRequest( -1337);
    }

    function testLessThanZero2()
    {
      new ReadMemoryRequest( -1);
    }

    function testGreaterThanMax1()
    {
      new ReadMemoryRequest( 0x10000);
    }

    testLessThanZero1.should.throw();
    testLessThanZero2.should.throw();
    testGreaterThanMax1.should.throw();
  });

  it("should throw if the count is invalid", function()
  {
    function testLessThanZero1()
    {
      new ReadMemoryRequest( 0, -1337);
    }

    function testZero()
    {
      new ReadMemoryRequest( 0, 0);
    }

    function testGreaterThanMax1()
    {
      new ReadMemoryRequest( 0, 251);
    }

    testLessThanZero1.should.throw();
    testZero.should.throw();
    testGreaterThanMax1.should.throw();
  });

  it("should use 0x00 as a default address", function()
  {
    new ReadMemoryRequest().getAddress().should.be.equal(0x00);
  });

  it("should use 250 as a default count", function()
  {
    new ReadMemoryRequest().getCount().should.be.equal(250);
  });

  describe("getCode", function()
  {
    it("should return a valid function code", function()
    {
      new ReadMemoryRequest().getCode().should.be.equal(0x45);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var req = ReadMemoryRequest.fromOptions({
        
        address: 0x0303,
        count: 0x04
      });

      req.getAddress().should.be.equal(0x0303);
      req.getCount().should.be.equal(0x04);
    });

  });

  describe("fromBuffer", function()
  {
    it("should throw if the specified Buffer is not at least 3 bytes long", function()
    {
      function test1()
      {
        ReadMemoryRequest.fromBuffer(new Buffer([]));
      }

      function test2()
      {
        ReadMemoryRequest.fromBuffer(new Buffer([0x03, 0x03 ]));
      }

      test1.should.throw();
      test2.should.throw();
    });

    it("should throw if the first byte is an invalid function code", function()
    {
      function test()
      {
        ReadMemoryRequest.fromBuffer(new Buffer([0x02, 0x00]));
      }

      test.should.throw();
    });

    it("should read uint16 at 1 as an address", function()
    {
      ReadMemoryRequest.fromBuffer(new Buffer([0x45, 0x10, 0x00, 10 ])).getAddress().should.be.equal(0x1000);
    });

    it("should read uint8 at 3 as a count", function()
    {
      ReadMemoryRequest.fromBuffer(new Buffer([0x45, 0x10, 0x00, 10 ])).getCount().should.be.equal(10);
    });

  });

  describe("toBuffer", function()
  {
    it("should return a 4 byte Buffer", function()
    {
      new ReadMemoryRequest(1).toBuffer().length.should.be.equal(4);
    });

    it("should write the function code as uint8 at 0", function()
    {
      new ReadMemoryRequest(2).toBuffer()[0].should.be.equal(0x45);
    });

    it("should write the address as uint16 at 1", function()
    {
      new ReadMemoryRequest(0x1234).toBuffer().readUInt16BE(1).should.be.equal(0x1234);
    });

  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      new ReadMemoryRequest(1).toString().should.be.a.String();
    });
  });

  describe("createResponse", function()
  {
    it("should return an instance of ExceptionResponse if the function code is an exception", function()
    {
      var req = new ReadMemoryRequest(2);
      var res = req.createResponse(new Buffer([0xC5, 0x22]));

      res.should.be.an.instanceOf(ExceptionResponse);
      res.getCode().should.be.equal(0x45);
      res.getExceptionCode().should.be.equal(0x22);
    });

    it("should return an instance of ReadMemoryResponse if the function code is not an exception", function()
    {
      var req = new ReadMemoryRequest(2);
      var res = req.createResponse(new Buffer([0x45, 0x11, 0x22, 0x33]));

      res.should.be.an.instanceOf(ReadMemoryResponse);
      res.getCode().should.be.equal(0x45);
      res.getCount().should.be.equal(3);
      res.getValues().length.should.be.equal(3);
    });
  });


  describe("getAddress", function()
  {
    it("should return an address specified in the constructor", function()
    {
      new ReadMemoryRequest( 0x2323).getAddress().should.be.equal(0x2323);
    });
  });

  describe("getCount", function()
  {
    it("should return an type specified in the constructor", function()
    {
      new ReadMemoryRequest(0,1).getCount().should.be.equal(0x1);
    });
  });

});
