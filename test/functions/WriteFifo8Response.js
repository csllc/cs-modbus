/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var WriteFifo8Response = require(LIB_DIR + '/functions/WriteFifo8Response');

describe("WriteFifo8Response", function()
{
  it("should throw if the specified quantity is invalid", function()
  {
    function testLessThanZero1()
    {
      new WriteFifo8Response(-1337);
    }

    function testLessThanZero2()
    {
      new WriteFifo8Response(-1);
    }

    function testTooBig()
    {
      new WriteFifo8Response(0x100);
    }

    testLessThanZero1.should.throw();
    testLessThanZero2.should.throw();
    testTooBig.should.throw();
  });

  describe("getCode", function()
  {
    it("should return a valid function code", function()
    {
      new WriteFifo8Response(0x0000).getCode().should.be.equal(0x47);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var req = WriteFifo8Response.fromOptions({
        quantity: 0x01,
      });

      req.getQuantity().should.be.equal(0x01);
    });
  });

  describe("fromBuffer", function()
  {
    it("should throw if the specified Buffer is not at least 2 bytes long", function()
    {
      function test1()
      {
        WriteFifo8Response.fromBuffer(new Buffer([]));
      }

      function test2()
      {
        WriteFifo8Response.fromBuffer(new Buffer([0x05]));
      }

      test1.should.throw();
      test2.should.throw();
    });

    it("should throw if the first byte is an invalid function code", function()
    {
      function test()
      {
        WriteFifo8Response.fromBuffer(new Buffer([0x03, 0x00, 0x00, 0x00, 0x01]));
      }

      test.should.throw();
    });

    it("should read uint8 at 1 as a quantity", function()
    {
      var frame = new Buffer([0x47, 0x12]);
      var req = WriteFifo8Response.fromBuffer(frame);

      req.getQuantity().should.be.equal(0x12);
    });

  });

  describe("toBuffer", function()
  {
    it("should return a 2 byte long Buffer", function()
    {
      new WriteFifo8Response(0x01).toBuffer().length.should.be.equal(2);
    });

    it("should write the function code as uint8 at 0", function()
    {
      new WriteFifo8Response(0x02).toBuffer()[0].should.be.equal(0x47);
    });

    it("should write the quantity 1", function()
    {
      new WriteFifo8Response(0x31).toBuffer()[1].should.be.equal(0x31);
    });

  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      new WriteFifo8Response(0x01).toString().should.be.a('string');
    });
  });

  describe("getQuantity", function()
  {
    it("should return a quantity value specified in the constructor", function()
    {
      new WriteFifo8Response(0x12).getQuantity().should.be.equal(0x12);
    });
  });
});
