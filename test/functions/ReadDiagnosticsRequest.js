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
  it("should throw if arguments are missing", function()
  {
    function testNoArguments()
    {
      new ReadDiagnosticsRequest();
    }

    function testNoQuantity()
    {
      new ReadDiagnosticsRequest(0x01);
    }

    testNoArguments.should.throw();
    testNoQuantity.should.throw();   
  });

  
  it("should throw if the address is invalid", function()
  {
    function testAddrLessThanZero1()
    {
      new ReadDiagnosticsRequest(-1337, 1);
    }

    function testAddrLessThanZero2()
    {
      new ReadDiagnosticsRequest(-1, 1);
    }

    function testAddrGreaterThanMax1()
    {
      new ReadDiagnosticsRequest(0x1FFFF, 1);
    }

    testAddrLessThanZero1.should.throw();
    testAddrLessThanZero2.should.throw();
    testAddrGreaterThanMax1.should.throw();
  });


  it("should throw if the quantity is invalid", function()
  {
    function testQuantityLessThanOne1()
    {
      new ReadDiagnosticsRequest(0x01, -128);
    }

    function testQuantityLessThanOne2()
    {
      new ReadDiagnosticsRequest(0x01, 0);
    }

    function testQuantityGreaterThanMax1()
    {
      new ReadDiagnosticsRequest(0x01, 126);
    }

    function testQuantityGreaterThanMax2()
    {
      new ReadDiagnosticsRequest(0x01, 0xFFFF);
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
      new ReadDiagnosticsRequest(0x01, 2).getCode().should.be.equal(0x08);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var req = ReadDiagnosticsRequest.fromOptions({
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
        ReadDiagnosticsRequest.fromBuffer(Buffer.from([]));
      }

      function test2()
      {
        ReadDiagnosticsRequest.fromBuffer(Buffer.from([0x03, 0x00]));
      }

      test1.should.throw();
      test2.should.throw();
    });

    it("should throw if the first byte is an invalid function code", function()
    {
      function test()
      {
        ReadDiagnosticsRequest.fromBuffer(Buffer.from([0x02, 0x00, 0x80]));
      }

      test.should.throw();
    });

    it("should read uint8s at 1 and 2 as address and quantity", function()
    {
      var req = ReadDiagnosticsRequest.fromBuffer(Buffer.from([0x08, 0x00, 0x12, 0x00, 0x05]));

      req.getAddress().should.be.equal(0x12);
      req.getQuantity().should.be.equal(0x05);
    });

  });

  describe("toBuffer", function()
  {
    it("should return a correct length Buffer", function()
    {
      new ReadDiagnosticsRequest(0x0001, 0x0001).toBuffer().length.should.be.equal(5);
    });

    it("should write the function code as uint8 at 0", function()
    {
      new ReadDiagnosticsRequest(0x0002, 0x0001).toBuffer()[0].should.be.equal(0x08);
    });

    it("should write the id as uint8 at 1", function()
    {
      new ReadDiagnosticsRequest(0x21, 0x01).toBuffer()[2].should.be.equal(0x21);
    });

  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      new ReadDiagnosticsRequest(0x0001, 0x0001).toString().should.be.a.String();
    });
  });

  describe("createResponse", function()
  {
    it("should return an instance of ExceptionResponse if the function code is an exception", function()
    {
      var req = new ReadDiagnosticsRequest(0x0001, 2);
      var res = req.createResponse(Buffer.from([0x88, 0x02]));

      res.should.be.an.instanceOf(ExceptionResponse);
      res.getCode().should.be.equal(0x08);
      res.getExceptionCode().should.be.equal(2);
    });

    it("should return an instance of ReadDiagnosticsResponse if the function code is not an exception", function()
    {
      var req = new ReadDiagnosticsRequest(0x01, 2);
      var res = req.createResponse(Buffer.from([0x08, 0x02, 0x01, 0x00, 0x10]));

      res.should.be.an.instanceOf(ReadDiagnosticsResponse);
      res.getCode().should.be.equal(0x08);
      res.getAddress().should.be.equal(0x201);
      res.getQuantity().should.be.equal(0x10);
    });
  });

  describe("getAddress", function()
  {
    it("should return the address specified in the constructor", function()
    {
      new ReadDiagnosticsRequest(0x23, 0x01).getAddress().should.be.equal(0x23);
    });
  });

  describe("getQuantity", function()
  {
    it("should return the quantity specified in the constructor", function()
    {
      new ReadDiagnosticsRequest(0x23, 0x01).getQuantity().should.be.equal(0x01);
    });
  });

});
