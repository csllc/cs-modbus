/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var ReadFifo8Response = require(LIB_DIR + '/functions/ReadFifo8Response');

describe("ReadFifo8Response", function()
{
  it("should throw if the specified Buffer has invalid length", function()
  {
    function testGreaterThan250()
    {
      new ReadFifo8Response(0x00, new Buffer(251));
    }

    function testMax()
    {
      // 250 plus length plus status plus function code
      new ReadFifo8Response(0x00, new Buffer(250));
    }

    testGreaterThan250.should.throw();
    testMax.should.not.throw();
  });

  describe("getCode", function()
  {
    it("should return a valid function code", function()
    {
      new ReadFifo8Response(0x00, new Buffer([0x01, 0x04])).getCode().should.be.equal(0x41);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var res = ReadFifo8Response.fromOptions({
        status: 0x01,
        values: new Buffer([0xFF, 0xFF])
      });

      res.getValues().should.be.eql(new Buffer([0xFF, 0xFF]));
      res.getStatus().should.be.eql(0x01);
    });

  });

  describe("fromBuffer", function()
  {
    it("should throw if the specified Buffer is not at least 3 byte long", function()
    {
      function test1()
      {
        ReadFifo8Response.fromBuffer(new Buffer([]));
      }

      function test2()
      {
        ReadFifo8Response.fromBuffer(new Buffer([0x04, 0x00]));
      }

      test1.should.throw();
      test2.should.throw();
    });

    it("should throw if the first byte is an invalid function code", function()
    {
      function test()
      {
        ReadFifo8Response.fromBuffer(new Buffer([0x01, 0x00]));
      }

      test.should.throw();
    });

    it("should read N bytes starting at 3 where N is a byte at 2 as a values Buffer", function()
    {
      ReadFifo8Response.fromBuffer(new Buffer([0x41, 0xFF, 0x02, 0x11, 0x22]))
        .getValues().should.be.eql(new Buffer([0x11, 0x22]));
    });
  });

  describe("toBuffer", function()
  {
    it("should return a 4 byte long Buffer for one value", function()
    {
      new ReadFifo8Response(0, new Buffer([0x04])).toBuffer().length.should.be.equal(4);
    });

    it("should write the function code as uint8 at 0", function()
    {
      new ReadFifo8Response(0, new Buffer([0x41, 0x04, 0x00])).toBuffer()[0].should.be.equal(0x41);
    });

    it("should write the status as uint8 at 1", function()
    {
      new ReadFifo8Response(4, new Buffer(0)).toBuffer()[1].should.be.equal(4);
    });

    it("should write the following byte count as uint8 at 2", function()
    {
      new ReadFifo8Response(0, new Buffer([0x11, 0x22])).toBuffer()[2].should.be.equal(2);
    });

    it("should write the Buffer of values at 3", function()
    {
      var res = new ReadFifo8Response(0, new Buffer([0x11, 0x22, 0x33]));
      var buf = res.toBuffer();

      buf[3].should.be.equal(0x11);
      buf[4].should.be.equal(0x22);
      buf[5].should.be.equal(0x33);
    });
  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      new ReadFifo8Response(0, new Buffer([0x11, 0x22, 0x33])).toString().should.be.a('string');
    });
  });

  describe("getValues", function()
  {
    it("should return an a values Buffer specified in the constructor", function()
    {
      new ReadFifo8Response(0, new Buffer([0x11, 0x22, 0x33])).getValues().should.be.eql(new Buffer([0x11, 0x22, 0x33]));
    });
  });

  describe("getCount", function()
  {
    it("should return a length of the values Buffer", function()
    {
      new ReadFifo8Response(0, new Buffer([0x11, 0x22, 0x33])).getCount().should.be.eql(3);
    });
  });
});
