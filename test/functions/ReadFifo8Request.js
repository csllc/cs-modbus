/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var ReadFifo8Request = require(LIB_DIR + '/functions/ReadFifo8Request');
var ReadFifo8Response = require(LIB_DIR + '/functions/ReadFifo8Response');
var ExceptionResponse = require(LIB_DIR + '/functions/ExceptionResponse');

describe("ReadFifo8Request", function()
{
  it("should throw if the fifo id is invalid", function()
  {
    function testLessThanZero1()
    {
      new ReadFifo8Request(-1337, 1);
    }

    function testLessThanZero2()
    {
      new ReadFifo8Request(-1, 1);
    }

    function testGreaterThanMax1()
    {
      new ReadFifo8Request(256, 1);
    }

    testLessThanZero1.should.throw();
    testLessThanZero2.should.throw();
    testGreaterThanMax1.should.throw();
  });

  it("should throw if the specified length is invalid", function()
  {
    function testLessThanZero1()
    {
      new ReadFifo8Request(0, -1);
    }

    function testGreaterThanMax()
    {
      new ReadFifo8Request(0, 251);
    }

    function testUndefined()
    {
      new ReadFifo8Request(0);
    }

    function testZero()
    {
      new ReadFifo8Request(0);
    }

    testLessThanZero1.should.throw();
    testGreaterThanMax.should.throw();
    testUndefined.should.not.throw();
    testZero.should.not.throw();
  });

  it("should use 0x00 as a default id", function()
  {
    new ReadFifo8Request().getId().should.be.equal(0x00);
  });

  it("should use 250 as a default length", function()
  {
    new ReadFifo8Request().getMax().should.be.equal(250);
  });

  describe("getCode", function()
  {
    it("should return a valid function code", function()
    {
      new ReadFifo8Request(0x00, 2).getCode().should.be.equal(0x41);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var req = ReadFifo8Request.fromOptions({
        id: 0x01,
        max: 2
      });

      req.getId().should.be.equal(0x01);
      req.getMax().should.be.equal(2);
    });

    it("should use a default max if none specified", function()
    {
      var req = ReadFifo8Request.fromOptions({
        id: 0xFF
      });

      req.getId().should.be.equal(0xFF);
      req.getMax().should.be.equal(250);
    });
  });

  describe("fromBuffer", function()
  {
    it("should throw if the specified Buffer is not at least 3 bytes long", function()
    {
      function test1()
      {
        ReadFifo8Request.fromBuffer(new Buffer([]));
      }

      function test2()
      {
        ReadFifo8Request.fromBuffer(new Buffer([0x03, 0x00]));
      }

      test1.should.throw();
      test2.should.throw();
    });

    it("should throw if the first byte is an invalid function code", function()
    {
      function test()
      {
        ReadFifo8Request.fromBuffer(new Buffer([0x02, 0x00, 0x80]));
      }

      test.should.throw();
    });

    it("should read uint8 at 1 as an id", function()
    {
      ReadFifo8Request.fromBuffer(new Buffer([0x41, 0x12, 0x34])).getId().should.be.equal(0x12);
    });

    it("should read uint16 at 2 as max", function()
    {
      ReadFifo8Request.fromBuffer(new Buffer([0x41, 0x12, 0x34])).getMax().should.be.equal(0x34);
    });
  });

  describe("toBuffer", function()
  {
    it("should return a correct length Buffer", function()
    {
      new ReadFifo8Request(0x0001, 2).toBuffer().length.should.be.equal(3);
    });

    it("should write the function code as uint8 at 0", function()
    {
      new ReadFifo8Request(0x0002, 3).toBuffer()[0].should.be.equal(0x41);
    });

    it("should write the id as uint8 at 1", function()
    {
      new ReadFifo8Request(0x21, 3).toBuffer()[1].should.be.equal(0x21);
    });

    it("should write the max as uint8 at 2", function()
    {
      new ReadFifo8Request(0x01, 100).toBuffer()[2].should.be.equal(100);
    });
  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      new ReadFifo8Request(0x0001, 2).toString().should.be.a('string');
    });
  });

  describe("createResponse", function()
  {
    it("should return an instance of ExceptionResponse if the function code is an exception", function()
    {
      var req = new ReadFifo8Request(0x0001, 2);
      var res = req.createResponse(new Buffer([0xC1, 0x02]));

      res.should.be.an.instanceOf(ExceptionResponse);
      res.getCode().should.be.equal(0x41);
      res.getExceptionCode().should.be.equal(2);
    });

    it("should return an instance of ReadFifo8Response if the function code is not an exception", function()
    {
      var req = new ReadFifo8Request(0x01, 2);
      var res = req.createResponse(new Buffer([0x41, 0x02, 0x01, 0x01]));

      res.should.be.an.instanceOf(ReadFifo8Response);
      res.getCode().should.be.equal(0x41);
      res.getCount().should.be.equal(1);
      res.getValues().length.should.be.equal(1);
    });
  });

  describe("getId", function()
  {
    it("should return an id specified in the constructor", function()
    {
      new ReadFifo8Request(0x23, 10).getId().should.be.equal(0x23);
    });
  });

  describe("getMax", function()
  {
    it("should return a max specified in the constructor", function()
    {
      new ReadFifo8Request(0x12, 10).getMax().should.be.equal(10);
    });
  });
});
