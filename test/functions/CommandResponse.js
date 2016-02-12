/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var CommandResponse = require(LIB_DIR + '/functions/CommandResponse');

describe("CommandResponse", function()
{
  it("should throw if the specified Buffer has invalid length", function()
  {
    function testGreaterThan250()
    {
      new CommandResponse(0, new Buffer(251));
    }

    function testMax()
    {
      new CommandResponse(0, new Buffer(250));
    }

    testGreaterThan250.should.throw();
    testMax.should.not.throw();
  });

  describe("getCode", function()
  {
    it("should return a valid function code", function()
    {
      new CommandResponse(1, new Buffer([0x01, 0x04])).getCode().should.be.equal(0x47);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var res = CommandResponse.fromOptions({
        id: 1,
        values: new Buffer([0xFF, 0xFF])
      });

      res.getId().should.be.eql(1);
      res.getValues().should.be.eql(new Buffer([0xFF, 0xFF]));
    });

  });

  describe("fromBuffer", function()
  {
    it("should throw if the specified Buffer is not at least 3 bytes long", function()
    {
      function test1()
      {
        CommandResponse.fromBuffer(new Buffer([]));
      }

      function test2()
      {
        CommandResponse.fromBuffer(new Buffer([0x04, 0x00]));
      }

      test1.should.throw();
      test2.should.throw();
    });

    it("should throw if the first byte is an invalid function code", function()
    {
      function test()
      {
        CommandResponse.fromBuffer(new Buffer([0x01, 0x00]));
      }

      test.should.throw();
    });

    it("should read N bytes starting at 2 as a values Buffer", function()
    {
      CommandResponse.fromBuffer(new Buffer([0x43, 0x02, 0x11, 0x22]))
        .getValues().should.be.eql(new Buffer([0x11, 0x22]));
    });
  });

  describe("toBuffer", function()
  {
    it("should return a 3 byte long Buffer for one value", function()
    {
      new CommandResponse(255, new Buffer([0x04])).toBuffer().length.should.be.equal(3);
    });

    it("should write the function code as uint8 at 0", function()
    {
      new CommandResponse(0, new Buffer([0x04, 0x00])).toBuffer()[0].should.be.equal(0x47);
    });

    it("should write the id as uint8 at 1", function()
    {
      new CommandResponse(2, new Buffer([0x11, 0x22])).toBuffer()[1].should.be.equal(2);
    });

    it("should write the Buffer of values at 2", function()
    {
      var res = new CommandResponse(0, new Buffer([0x11, 0x22, 0x33]));
      var buf = res.toBuffer();

      buf[2].should.be.equal(0x11);
      buf[3].should.be.equal(0x22);
      buf[4].should.be.equal(0x33);
    });
  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      new CommandResponse(1, new Buffer([0x11, 0x22, 0x33])).toString().should.be.a('string');
    });
  });

  describe("getValues", function()
  {
    it("should return an a values Buffer specified in the constructor", function()
    {
      new CommandResponse(1, new Buffer([0x11, 0x22, 0x33])).getValues().should.be.eql(new Buffer([0x11, 0x22, 0x33]));
    });
  });

  describe("getCount", function()
  {
    it("should return a length of the values Buffer", function()
    {
      new CommandResponse(1, new Buffer([0x11, 0x22, 0x33])).getCount().should.be.eql(3);
    });
  });
});
