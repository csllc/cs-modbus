/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var ReadDiagnosticsRequest = require(LIB_DIR + '/functions/ReadDiagnosticsRequest');
var ReadDiagnosticsResponse = require(LIB_DIR + '/functions/ReadDiagnosticsResponse');
var ExceptionResponse = require(LIB_DIR + '/functions/ExceptionResponse');

describe("ReadDiagnosticsRequest", function()
{
  it("should throw if the value is invalid", function()
  {
    function testLessThanZero1()
    {
      new ReadDiagnosticsRequest(-1337);
    }

    function testLessThanZero2()
    {
      new ReadDiagnosticsRequest(-1);
    }

    function testGreaterThanMax1()
    {
      new ReadDiagnosticsRequest(256);
    }

    testLessThanZero1.should.throw();
    testLessThanZero2.should.throw();
    testGreaterThanMax1.should.throw();
  });



  describe("getCode", function()
  {
    it("should return a valid function code", function()
    {
      new ReadDiagnosticsRequest(0x00, 2).getCode().should.be.equal(0x08);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var req = ReadDiagnosticsRequest.fromOptions({
        value: 0x01
      });

      req.getValue().should.be.equal(0x01);
    });

  });

  describe("fromBuffer", function()
  {
    it("should throw if the specified Buffer is not at least 3 bytes long", function()
    {
      function test1()
      {
        ReadDiagnosticsRequest.fromBuffer(new Buffer([]));
      }

      function test2()
      {
        ReadDiagnosticsRequest.fromBuffer(new Buffer([0x03, 0x00]));
      }

      test1.should.throw();
      test2.should.throw();
    });

    it("should throw if the first byte is an invalid function code", function()
    {
      function test()
      {
        ReadDiagnosticsRequest.fromBuffer(new Buffer([0x02, 0x00, 0x80]));
      }

      test.should.throw();
    });

    it("should read uint8 at 1 as a value", function()
    {
      ReadDiagnosticsRequest.fromBuffer(new Buffer([0x08, 0x12])).getValue().should.be.equal(0x12);
    });

  });

  describe("toBuffer", function()
  {
    it("should return a correct length Buffer", function()
    {
      new ReadDiagnosticsRequest(0x0001).toBuffer().length.should.be.equal(2);
    });

    it("should write the function code as uint8 at 0", function()
    {
      new ReadDiagnosticsRequest(0x0002).toBuffer()[0].should.be.equal(0x08);
    });

    it("should write the id as uint8 at 1", function()
    {
      new ReadDiagnosticsRequest(0x21).toBuffer()[1].should.be.equal(0x21);
    });

  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      new ReadDiagnosticsRequest(0x0001).toString().should.be.a('string');
    });
  });

  describe("createResponse", function()
  {
    it("should return an instance of ExceptionResponse if the function code is an exception", function()
    {
      var req = new ReadDiagnosticsRequest(0x0001, 2);
      var res = req.createResponse(new Buffer([0x88, 0x02]));

      res.should.be.an.instanceOf(ExceptionResponse);
      res.getCode().should.be.equal(0x08);
      res.getExceptionCode().should.be.equal(2);
    });

    it("should return an instance of ReadDiagnosticsResponse if the function code is not an exception", function()
    {
      var req = new ReadDiagnosticsRequest(0x01, 2);
      var res = req.createResponse(new Buffer([0x08, 0x02, 0x01, 0x01]));

      res.should.be.an.instanceOf(ReadDiagnosticsResponse);
      res.getCode().should.be.equal(0x08);
      res.getCount().should.be.equal(1);
      res.getValues().length.should.be.equal(1);
    });
  });

  describe("getValue", function()
  {
    it("should return a value specified in the constructor", function()
    {
      new ReadDiagnosticsRequest(0x23).getValue().should.be.equal(0x23);
    });
  });

});
