/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var WriteSingleCoilRequest = require(LIB_DIR + '/functions/WriteSingleCoilRequest');
var WriteSingleCoilResponse = require(LIB_DIR + '/functions/WriteSingleCoilResponse');
var ExceptionResponse = require(LIB_DIR + '/functions/ExceptionResponse');

describe("WriteSingleCoilRequest", function()
{
  it("should throw if the specified address is invalid", function()
  {
    function testLessThanZero1()
    {
      new WriteSingleCoilRequest(-1337, true);
    }

    function testLessThanZero2()
    {
      new WriteSingleCoilRequest(-1, true);
    }

    function testGreaterThanFFFF()
    {
      new WriteSingleCoilRequest(0x10000, true);
    }

    testLessThanZero1.should.throw();
    testLessThanZero2.should.throw();
    testGreaterThanFFFF.should.throw();
  });

  it("should use 0x0000 as a default address", function()
  {
    new WriteSingleCoilRequest().getAddress().should.be.equal(0x0000);
  });

  it("should use FALSE as a default state", function()
  {
    new WriteSingleCoilRequest().getState().should.be.equal(false);
  });

  describe("getCode", function()
  {
    it("should return a valid function code", function()
    {
      new WriteSingleCoilRequest(0x0000, true).getCode().should.be.equal(0x05);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var req = WriteSingleCoilRequest.fromOptions({
        address: 0x0001,
        state: true
      });

      req.getAddress().should.be.equal(0x0001);
      req.getState().should.be.equal(true);
    });
  });

  describe("fromBuffer", function()
  {
    it("should throw if the specified Buffer is not at least 5 bytes long", function()
    {
      function test1()
      {
        WriteSingleCoilRequest.fromBuffer(Buffer.from([]));
      }

      function test2()
      {
        WriteSingleCoilRequest.fromBuffer(Buffer.from([0x05, 0x00, 0x01, 0x00]));
      }

      test1.should.throw();
      test2.should.throw();
    });

    it("should throw if the first byte is an invalid function code", function()
    {
      function test()
      {
        WriteSingleCoilRequest.fromBuffer(Buffer.from([0x03, 0x00, 0x00, 0x00, 0x01]));
      }

      test.should.throw();
    });

    it("should read uint16 at 1 as an address", function()
    {
      var frame = Buffer.from([0x05, 0x12, 0x34, 0x00, 0x01]);
      var req = WriteSingleCoilRequest.fromBuffer(frame);

      req.getAddress().should.be.equal(0x1234);
    });

    it("should set state to TRUE if uint16 at 3 is equal to 0xFF00", function()
    {
      var frame = Buffer.from([0x05, 0x12, 0x34, 0xFF, 0x00]);
      var req = WriteSingleCoilRequest.fromBuffer(frame);

      req.getState().should.be.equal(true);
    });

    it("should set state to FALSE if uint16 at 3 is not equal to 0xFF00", function()
    {
      var frame = Buffer.from([0x05, 0x12, 0x34, 0x00, 0x00]);
      var req = WriteSingleCoilRequest.fromBuffer(frame);

      req.getState().should.be.equal(false);
    });
  });

  describe("toBuffer", function()
  {
    it("should return a 5 byte long Buffer", function()
    {
      new WriteSingleCoilRequest(0x0001, true).toBuffer().length.should.be.equal(5);
    });

    it("should write the function code as uint8 at 0", function()
    {
      new WriteSingleCoilRequest(0x0002, true).toBuffer()[0].should.be.equal(0x05);
    });

    it("should write the address as uint16 at 1", function()
    {
      new WriteSingleCoilRequest(0x1234, true).toBuffer().readUInt16BE(1).should.be.equal(0x1234);
    });

    it("should write the state as 0xFF00 at 3 if TRUE", function()
    {
      new WriteSingleCoilRequest(0x0001, true).toBuffer().readUInt16BE(3).should.be.equal(0xFF00);
    });

    it("should write the state as 0x0000 at 3 if FALSE", function()
    {
      new WriteSingleCoilRequest(0x0001, false).toBuffer().readUInt16BE(3).should.be.equal(0x0000);
    });
  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      new WriteSingleCoilRequest(0x0001, true).toString().should.be.a.String();
      new WriteSingleCoilRequest(0x0001, false).toString().should.be.a.String();
    });
  });

  describe("createResponse", function()
  {
    it("should return an instance of ExceptionResponse if the function code is an exception", function()
    {
      var req = new WriteSingleCoilRequest(0x0001, true);
      var res = req.createResponse(Buffer.from([0x85, 0x02]));

      res.should.be.an.instanceOf(ExceptionResponse);
      res.getCode().should.be.equal(0x05);
      res.getExceptionCode().should.be.equal(2);
    });

    it("should return an instance of WriteSingleCoilResponse if the function code is not an exception", function()
    {
      var req = new WriteSingleCoilRequest(0x0001, true);
      var res = req.createResponse(Buffer.from([0x05, 0x00, 0x01, 0xFF, 0x00]));

      res.should.be.an.instanceOf(WriteSingleCoilResponse);
      res.getCode().should.be.equal(0x05);
      res.getAddress().should.be.equal(0x0001);
      res.getState().should.be.equal(true);
    });
  });

  describe("getAddress", function()
  {
    it("should return an address specified in the constructor", function()
    {
      new WriteSingleCoilRequest(0x1234, false).getAddress().should.be.equal(0x1234);
    });
  });

  describe("getState", function()
  {
    it("should return a state value specified in the constructor", function()
    {
      new WriteSingleCoilRequest(0x1234, true).getState().should.be.equal(true);
    });
  });
});
