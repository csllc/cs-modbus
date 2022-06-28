/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var ReadObjectRequest = require(LIB_DIR + '/functions/ReadObjectRequest');
var ReadObjectResponse = require(LIB_DIR + '/functions/ReadObjectResponse');
var ExceptionResponse = require(LIB_DIR + '/functions/ExceptionResponse');

describe("ReadObjectRequest", function()
{
  it("should throw if the object id is invalid", function()
  {
    function testLessThanZero1()
    {
      new ReadObjectRequest(-1337);
    }

    function testLessThanZero2()
    {
      new ReadObjectRequest(-1);
    }

    function testGreaterThanMax1()
    {
      new ReadObjectRequest(256);
    }

    testLessThanZero1.should.throw();
    testLessThanZero2.should.throw();
    testGreaterThanMax1.should.throw();
  });


  it("should use 0x00 as a default id", function()
  {
    new ReadObjectRequest().getId().should.be.equal(0x00);
  });

  describe("getCode", function()
  {
    it("should return a valid function code", function()
    {
      new ReadObjectRequest(0).getCode().should.be.equal(0x43);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var req = ReadObjectRequest.fromOptions({
        id: 0x01
      });

      req.getId().should.be.equal(0x01);
    });

  });

  describe("fromBuffer", function()
  {
    it("should throw if the specified Buffer is not at least 2 bytes long", function()
    {
      function test1()
      {
        ReadObjectRequest.fromBuffer(Buffer.from([]));
      }

      function test2()
      {
        ReadObjectRequest.fromBuffer(Buffer.from([0x03]));
      }

      test1.should.throw();
      test2.should.throw();
    });

    it("should throw if the first byte is an invalid function code", function()
    {
      function test()
      {
        ReadObjectRequest.fromBuffer(Buffer.from([0x02, 0x00]));
      }

      test.should.throw();
    });

    it("should read uint8 at 1 as an id", function()
    {
      ReadObjectRequest.fromBuffer(Buffer.from([0x43, 0x12])).getId().should.be.equal(0x12);
    });

  });

  describe("toBuffer", function()
  {
    it("should return a 2 byte Buffer", function()
    {
      new ReadObjectRequest(1).toBuffer().length.should.be.equal(2);
    });

    it("should write the function code as uint8 at 0", function()
    {
      new ReadObjectRequest(2).toBuffer()[0].should.be.equal(0x43);
    });

    it("should write the id as uint8 at 1", function()
    {
      new ReadObjectRequest(0x21).toBuffer()[1].should.be.equal(0x21);
    });

  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      new ReadObjectRequest(2).toString().should.be.a.String();
    });
  });

  describe("createResponse", function()
  {
    it("should return an instance of ExceptionResponse if the function code is an exception", function()
    {
      var req = new ReadObjectRequest(2);
      var res = req.createResponse(Buffer.from([0xC3, 0x22]));

      res.should.be.an.instanceOf(ExceptionResponse);
      res.getCode().should.be.equal(0x43);
      res.getExceptionCode().should.be.equal(0x22);
    });

    it("should return an instance of ReadObjectResponse if the function code is not an exception", function()
    {
      var req = new ReadObjectRequest(2);
      var res = req.createResponse(Buffer.from([0x43, 0x02, 0x01, 0x01]));

      res.should.be.an.instanceOf(ReadObjectResponse);
      res.getCode().should.be.equal(0x43);
      res.getCount().should.be.equal(2);
      res.getValues().length.should.be.equal(2);
    });
  });

  describe("getId", function()
  {
    it("should return an id specified in the constructor", function()
    {
      new ReadObjectRequest(0x23).getId().should.be.equal(0x23);
    });
  });

});
