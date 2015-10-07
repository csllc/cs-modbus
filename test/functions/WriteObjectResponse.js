/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var WriteObjectResponse = require(LIB_DIR + '/functions/WriteObjectResponse');

describe("WriteObjectResponse", function()
{
  it("should throw if the specified status is invalid", function()
  {
    function testLessThanZero1()
    {
      new WriteObjectResponse(-1337);
    }

    function testLessThanZero2()
    {
      new WriteObjectResponse(-1);
    }

    function testTooBig()
    {
      new WriteObjectResponse(0x100);
    }

    testLessThanZero1.should.throw();
    testLessThanZero2.should.throw();
    testTooBig.should.throw();
  });

  describe("getCode", function()
  {
    it("should return a valid function code", function()
    {
      new WriteObjectResponse(0x00).getCode().should.be.equal(0x49);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var req = WriteObjectResponse.fromOptions({
        status: 0x01,
      });

      req.getStatus().should.be.equal(0x01);
    });
  });

  describe("fromBuffer", function()
  {
    it("should throw if the specified Buffer is not at least 2 bytes long", function()
    {
      function test1()
      {
        WriteObjectResponse.fromBuffer(new Buffer([]));
      }

      function test2()
      {
        WriteObjectResponse.fromBuffer(new Buffer([0x49]));
      }

      test1.should.throw();
      test2.should.throw();
    });

    it("should throw if the first byte is an invalid function code", function()
    {
      function test()
      {
        WriteObjectResponse.fromBuffer(new Buffer([0x03, 0x00, 0x00, 0x00, 0x01]));
      }

      test.should.throw();
    });

    it("should read uint8 at 1 as a status", function()
    {
      var frame = new Buffer([0x49, 0x12]);
      var req = WriteObjectResponse.fromBuffer(frame);

      req.getStatus().should.be.equal(0x12);
    });

  });

  describe("toBuffer", function()
  {
    it("should return a 2 byte long Buffer", function()
    {
      new WriteObjectResponse(0x01).toBuffer().length.should.be.equal(2);
    });

    it("should write the function code as uint8 at 0", function()
    {
      new WriteObjectResponse(0x02).toBuffer()[0].should.be.equal(0x49);
    });

    it("should write the status 1", function()
    {
      new WriteObjectResponse(0x31).toBuffer()[1].should.be.equal(0x31);
    });

  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      new WriteObjectResponse(0x01).toString().should.be.a('string');
    });
  });

  describe("getStatus", function()
  {
    it("should return a status value specified in the constructor", function()
    {
      new WriteObjectResponse(0x12).getStatus().should.be.equal(0x12);
    });
  });
});
