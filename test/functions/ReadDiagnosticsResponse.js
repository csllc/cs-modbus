/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var ReadDiagnosticsResponse = require(LIB_DIR + '/functions/ReadDiagnosticsRequest');

describe("ReadDiagnosticsResponse", function()
{
  it("should throw if arguments are missing", function()
  {
    function testNoArguments()
    {
      new ReadDiagnosticsResponse();
    }

    function testNoQuantity()
    {
      new ReadDiagnosticsResponse(0x01);
    }

    testNoArguments.should.throw();
    testNoQuantity.should.throw();   
  });

  
  it("should throw if the address is invalid", function()
  {
    function testAddrLessThanZero1()
    {
      new ReadDiagnosticsResponse(-1337, 1);
    }

    function testAddrLessThanZero2()
    {
      new ReadDiagnosticsResponse(-1, 1);
    }

    function testAddrGreaterThanMax1()
    {
      new ReadDiagnosticsResponse(0x1FFFF, 1);
    }

    testAddrLessThanZero1.should.throw();
    testAddrLessThanZero2.should.throw();
    testAddrGreaterThanMax1.should.throw();
  });


  it("should throw if the quantity is invalid", function()
  {
    function testQuantityLessThanOne1()
    {
      new ReadDiagnosticsResponse(0x01, -128);
    }

    function testQuantityLessThanOne2()
    {
      new ReadDiagnosticsResponse(0x01, 0);
    }

    function testQuantityGreaterThanMax1()
    {
      new ReadDiagnosticsResponse(0x01, 126);
    }

    function testQuantityGreaterThanMax2()
    {
      new ReadDiagnosticsResponse(0x01, 0xFFFF);
    }

    testQuantityLessThanOne1.should.throw();
    testQuantityLessThanOne2.should.throw();
    testQuantityGreaterThanMax1.should.throw();
    testQuantityGreaterThanMax2.should.throw();
  });


  describe("getCode", function()
  {
    it("should return a valid function code", function()
    {
      new ReadDiagnosticsResponse(0x01, 2).getCode().should.be.equal(0x08);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var req = ReadDiagnosticsResponse.fromOptions({
        address: 0x01,
        quantity: 0x08
      });

      req.getAddress().should.be.equal(0x01);
      req.getQuantity().should.be.equal(0x08);
    });

  });

  describe("fromBuffer", function()
  {
    it("should throw if the specified Buffer is not at least 3 bytes long", function()
    {
      function test1()
      {
        ReadDiagnosticsResponse.fromBuffer(Buffer.from([]));
      }

      function test2()
      {
        ReadDiagnosticsResponse.fromBuffer(Buffer.from([0x03, 0x00]));
      }

      test1.should.throw();
      test2.should.throw();
    });

    it("should throw if the first byte is an invalid function code", function()
    {
      function test()
      {
        ReadDiagnosticsResponse.fromBuffer(Buffer.from([0x02, 0x00, 0x80]));
      }

      test.should.throw();
    });

    it("should read uint8s at 1 and 2 as address and quantity", function()
    {
      var req = ReadDiagnosticsResponse.fromBuffer(Buffer.from([0x08, 0x00, 0x12, 0x00, 0x05]));

      req.getAddress().should.be.equal(0x12);
      req.getQuantity().should.be.equal(0x05);
    });

  });

  describe("toBuffer", function()
  {
    it("should return a correct length Buffer", function()
    {
      new ReadDiagnosticsResponse(0x0001, 0x0001).toBuffer().length.should.be.equal(5);
    });

    it("should write the function code as uint8 at 0", function()
    {
      new ReadDiagnosticsResponse(0x0002, 0x0001).toBuffer()[0].should.be.equal(0x08);
    });

    it("should write the id as uint8 at 1", function()
    {
      new ReadDiagnosticsResponse(0x21, 0x01).toBuffer()[2].should.be.equal(0x21);
    });

  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      new ReadDiagnosticsResponse(0x0001, 0x0001).toString().should.be.a.String();
    });
  });

  describe("getAddress", function()
  {
    it("should return the address specified in the constructor", function()
    {
      new ReadDiagnosticsResponse(0x23, 0x01).getAddress().should.be.equal(0x23);
    });
  });

  describe("getQuantity", function()
  {
    it("should return the quantity specified in the constructor", function()
    {
      new ReadDiagnosticsResponse(0x23, 0x01).getQuantity().should.be.equal(0x01);
    });
  });

});
