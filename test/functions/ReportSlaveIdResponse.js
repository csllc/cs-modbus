/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var Response = require(LIB_DIR + '/functions/ReportSlaveIdResponse');

describe("ReportSlaveIdResponse", function()
{
  it("should throw if the specified Buffer is invalid", function()
  {
    function testEmpty()
    {
      new Response(new Buffer(0));
    }

    function testTooLong()
    {
      new Response(new Buffer(8));
    }


    testEmpty.should.throw();
    testTooLong.should.throw();
  });

  it("should throw if the product code is invalid", function()
  {
    function test1()
    {
      new Response(-1,0,'1.1.1');
    }

    function test2()
    {
      new Response(256,0,'1.1.1');
    }

    test1.should.throw();
    test2.should.throw();
  });

  it("should throw if the run code is invalid", function()
  {
    function test1()
    {
      new Response(0, -1,'1.1.1');
    }

    function test2()
    {
      new Response(0, 256,'1.1.1');
    }

    test1.should.throw();
    test2.should.throw();
  });

  it("should throw if the version is invalid", function()
  {
    function test1()
    {
      new Response(0, 0,'11.1');
    }

    function test2()
    {
      new Response(0, 0,'1.1.1.1');
    }

    test1.should.throw();
    test2.should.throw();
  });

  describe("getCode", function()
  {
    it("should return a valid function code", function()
    {
      Response.fromBuffer(new Buffer([0x11, 0x05, 0x03, 0xFF,
        0x04, 0x05, 0x06])).getCode().should.be.equal(0x11);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var res = Response.fromOptions({
        product: 0x01,
        run: 0xFF,
        version: '004.005.006'
      });
      var values = res.getVersion();
      values.should.be.eql('4.5.6');
    });
  });

  describe("fromBuffer", function()
  {
    it("should throw if the specified Buffer is not at 7 bytes long", function()
    {
      function test1()
      {
        Response.fromBuffer(new Buffer([]));
      }

      function test2()
      {
        Response.fromBuffer(new Buffer([0x04, 0x02, 0x00, 0x00, 0x00, 0x00]));
      }

      test1.should.throw();
      test2.should.throw();
    });

    it("should throw if the first byte is an invalid function code", function()
    {
      function test()
      {
        Response.fromBuffer(new Buffer([0x01, 0x00]));
      }

      test.should.throw();
    });

  });

  describe("toBuffer", function()
  {

    it("should write the function code as uint8 at 0", function()
    {
      var res = Response.fromBuffer(new Buffer([0x11, 0x05, 0x01, 0xFF, 0x03, 0x04, 0x05]));
      res.toBuffer()[0].should.be.equal(0x11);
    });

  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      Response.fromBuffer(new Buffer([0x11, 0x01, 0x05, 0xFF, 0x02, 0x02, 0x02])).toString().should.be.a('string');
    });
  });

  describe("getVersion", function()
  {
    it("should return a string from Buffer specified in the constructor", function()
    {
      var values = Response.fromBuffer(new Buffer([0x11, 0x01, 0x05, 0xFF, 0x02, 0x20, 0xFF]))
        .getVersion();
      values.should.be.eql('2.32.255');
    });
  });

});
