/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var WriteMemoryVerifyResponse = require(LIB_DIR + '/functions/WriteMemoryVerifyResponse');

describe("WriteMemoryVerifyResponse", function()
{
  it("should throw if the specified status is invalid", function()
  {
    function testLessThanZero1()
    {
      new WriteMemoryVerifyResponse(-1337);
    }

    function testLessThanZero2()
    {
      new WriteMemoryVerifyResponse(-1);
    }

    function testTooBig()
    {
      new WriteMemoryVerifyResponse(0x100);
    }

    testLessThanZero1.should.throw();
    testLessThanZero2.should.throw();
    testTooBig.should.throw();
  });

  describe("getCode", function()
  {
    it("should return a valid function code", function()
    {
      new WriteMemoryVerifyResponse(0x00).getCode().should.be.equal(0x64);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var req = WriteMemoryVerifyResponse.fromOptions({
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
        WriteMemoryVerifyResponse.fromBuffer(Buffer.from([]));
      }

      function test2()
      {
        WriteMemoryVerifyResponse.fromBuffer(Buffer.from([0x64]));
      }

      test1.should.throw();
      test2.should.throw();
    });

    it("should throw if the first byte is an invalid function code", function()
    {
      function test()
      {
        WriteMemoryVerifyResponse.fromBuffer(Buffer.from([0x03, 0x00, 0x00, 0x00, 0x01]));
      }

      test.should.throw();
    });

    it("should read uint8 at 1 as a status", function()
    {
      var frame = Buffer.from([0x64, 0x12]);
      var req = WriteMemoryVerifyResponse.fromBuffer(frame);

      req.getStatus().should.be.equal(0x12);
    });

  });

  describe("toBuffer", function()
  {
    it("should return a 2 byte long Buffer", function()
    {
      new WriteMemoryVerifyResponse(0x01).toBuffer().length.should.be.equal(2);
    });

    it("should write the function code as uint8 at 0", function()
    {
      new WriteMemoryVerifyResponse(0x02).toBuffer()[0].should.be.equal(0x64);
    });

    it("should write the status 1", function()
    {
      new WriteMemoryVerifyResponse(0x31).toBuffer()[1].should.be.equal(0x31);
    });

  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      new WriteMemoryVerifyResponse(0x01).toString().should.be.a.String();
    });
  });

  describe("getStatus", function()
  {
    it("should return a status value specified in the constructor", function()
    {
      new WriteMemoryVerifyResponse(0x12).getStatus().should.be.equal(0x12);
    });
  });
});
