/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var ReadInputRegistersResponse = require(LIB_DIR + '/functions/ReadInputRegistersResponse');

describe("ReadInputRegistersResponse", function()
{
  it("should throw if the specified Buffer is invalid", function()
  {
    function testEmpty()
    {
      new ReadInputRegistersResponse(Buffer.alloc(0));
    }

    function testGreaterThan250()
    {
      new ReadInputRegistersResponse(Buffer.alloc(252));
    }

    function testOdd()
    {
      new ReadInputRegistersResponse(Buffer.alloc(101));
    }

    testEmpty.should.throw();
    testGreaterThan250.should.throw();
    testOdd.should.throw();
  });

  describe("getCode", function()
  {
    it("should return a valid function code", function()
    {
      new ReadInputRegistersResponse(Buffer.from([0x01, 0x02, 0x03, 0x04])).getCode().should.be.equal(0x04);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var res = ReadInputRegistersResponse.fromOptions({
        values: Buffer.from([0x01, 0x02, 0x03, 0x04])
      });

      res.getValues().should.be.eql(Buffer.from([0x01, 0x02, 0x03, 0x04]));
    });
  });

  describe("fromBuffer", function()
  {
    it("should throw if the specified Buffer is not at least 4 byte long", function()
    {
      function test1()
      {
        ReadInputRegistersResponse.fromBuffer(Buffer.from([]));
      }

      function test2()
      {
        ReadInputRegistersResponse.fromBuffer(Buffer.from([0x04, 0x02, 0x00]));
      }

      test1.should.throw();
      test2.should.throw();
    });

    it("should throw if the first byte is an invalid function code", function()
    {
      function test()
      {
        ReadInputRegistersResponse.fromBuffer(Buffer.from([0x01, 0x00]));
      }

      test.should.throw();
    });

    it("should read N bytes starting at 2 where N is a byte at 1 as a values Buffer", function()
    {
      ReadInputRegistersResponse.fromBuffer(Buffer.from([0x04, 0x02, 0xAB, 0xCD])).getValues().should.be.eql(Buffer.from([0xAB, 0xCD]));
    });
  });

  describe("toBuffer", function()
  {
    it("should return a 6 byte long Buffer for 2 registers", function()
    {
      new ReadInputRegistersResponse(Buffer.from([0x01, 0x02, 0x03, 0x04])).toBuffer().length.should.be.equal(6);
    });

    it("should write the function code as uint8 at 0", function()
    {
      new ReadInputRegistersResponse(Buffer.from([0x01, 0x02, 0x03, 0x04])).toBuffer()[0].should.be.equal(0x04);
    });

    it("should write the following byte count as uint8 at 1", function()
    {
      new ReadInputRegistersResponse(Buffer.from([0x01, 0x02, 0x03, 0x04])).toBuffer()[1].should.be.equal(4);
    });

    it("should write the Buffer of values at 2", function()
    {
      var res = new ReadInputRegistersResponse(Buffer.from([0x01, 0x02, 0x03, 0x04]));
      var buf = res.toBuffer();

      buf[2].should.be.equal(0x01);
      buf[3].should.be.equal(0x02);
      buf[4].should.be.equal(0x03);
      buf[5].should.be.equal(0x04);
    });
  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      new ReadInputRegistersResponse(Buffer.from([0x01, 0x02, 0x03, 0x04])).toString().should.be.a.String();
    });
  });

  describe("getValues", function()
  {
    it("should return an a values Buffer specified in the constructor", function()
    {
      new ReadInputRegistersResponse(Buffer.from([0x01, 0x02, 0x03, 0x04])).getValues().should.be.eql(Buffer.from([0x01, 0x02, 0x03, 0x04]));
    });
  });

  describe("getCount", function()
  {
    it("should return a length of the values Buffer specified in the constructor divided by 2", function()
    {
      new ReadInputRegistersResponse(Buffer.from([0x01, 0x02, 0x03, 0x04])).getCount().should.be.eql(2);
    });
  });
});
