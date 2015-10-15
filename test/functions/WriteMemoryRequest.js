/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var WriteMemoryRequest = require(LIB_DIR + '/functions/WriteMemoryRequest');
var WriteMemoryResponse = require(LIB_DIR + '/functions/WriteMemoryResponse');
var ExceptionResponse = require(LIB_DIR + '/functions/ExceptionResponse');

describe("WriteMemoryRequest", function()
{
  it("should throw if the specified type is invalid", function()
  {
    function testLessThanZero1()
    {
      new WriteMemoryRequest(-1337, 0, 0, new Buffer(2));
    }

    function testLessThanZero2()
    {
      new WriteMemoryRequest(-1, 0, 0, new Buffer(2));
    }

    function testGreaterThanMax()
    {
      new WriteMemoryRequest(256, 0, 0, new Buffer(2));
    }

    testLessThanZero1.should.throw();
    testLessThanZero2.should.throw();
    testGreaterThanMax.should.throw();
  });

  it("should throw if the specified page is invalid", function()
  {
    function testLessThanZero1()
    {
      new WriteMemoryRequest(0, -1337, 0, new Buffer(2));
    }

    function testLessThanZero2()
    {
      new WriteMemoryRequest(0, -1, 0, new Buffer(2));
    }

    function testGreaterThanMax()
    {
      new WriteMemoryRequest(0, 256, 0, new Buffer(2));
    }

    testLessThanZero1.should.throw();
    testLessThanZero2.should.throw();
    testGreaterThanMax.should.throw();
  });

  it("should throw if the specified address is invalid", function()
  {
    function testLessThanZero1()
    {
      new WriteMemoryRequest(0, 0, -1337, new Buffer(2));
    }

    function testLessThanZero2()
    {
      new WriteMemoryRequest(0, 0, -1, new Buffer(2));
    }

    function testGreaterThanMax()
    {
      new WriteMemoryRequest(0, 0, 0x10000, new Buffer(2));
    }

    testLessThanZero1.should.throw();
    testLessThanZero2.should.throw();
    testGreaterThanMax.should.throw();
  });

  it("should throw if the specified Buffer is invalid", function()
  {
    function testEmpty()
    {
      new WriteMemoryRequest(0, 0, 0, new Buffer(0));
    }

    function testTooBig()
    {
      new WriteMemoryRequest(0, 0, 0, new Buffer(251));
    }

    function testMax()
    {
      new WriteMemoryRequest(0, 0, 0, new Buffer(250));
    }

    testEmpty.should.throw();
    testTooBig.should.throw();
    testMax.should.not.throw();
  });


  describe("getCode", function()
  {
    it("should return a valid function code", function()
    {
      new WriteMemoryRequest(0, 0, 0, [0x00, 0x01]).getCode().should.be.equal(0x46);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var req = WriteMemoryRequest.fromOptions({
        type: 0x01,
        page: 0x02,
        address: 0x1234,
        values: new Buffer([0x00, 0x10])
      });

      req.getType().should.be.equal(0x01);
      req.getPage().should.be.equal(0x02);
      req.getAddress().should.be.equal(0x1234);
      req.getCount().should.be.equal(2);
      req.getValues().should.be.eql(new Buffer([0x00, 0x10]));
    });
  });

  describe("fromBuffer", function()
  {
    it("should throw if the specified Buffer is too short", function()
    {
      function test1()
      {
        WriteMemoryRequest.fromBuffer(new Buffer([]));
      }

      function test2()
      {
        WriteMemoryRequest.fromBuffer(new Buffer([0x46, 0x00, 0x01, 0x12, 0x34, 0x01]));
      }

      test1.should.throw();
      test2.should.throw();
    });

    it("should throw if the first byte is an invalid function code", function()
    {
      function test()
      {
        WriteMemoryRequest.fromBuffer(new Buffer([0x03, 0x00, 0x00, 0x00, 0x01, 0x02, 0x00, 0x01]));
      }

      test.should.throw();
    });

    it("should read uint8 at 1 as a type", function()
    {
      var frame = new Buffer([0x46, 0x12, 0x34, 0x43, 0x21, 0x01, 0x00]);
      var req = WriteMemoryRequest.fromBuffer(frame);

      req.getType().should.be.equal(0x12);
    });

    it("should read uint8 at 2 as a page", function()
    {
      var frame = new Buffer([0x46, 0x12, 0x34, 0x43, 0x21, 0x01, 0x00]);
      var req = WriteMemoryRequest.fromBuffer(frame);

      req.getPage().should.be.equal(0x34);
    });

    it("should read uint16 at 3 as an address", function()
    {
      var frame = new Buffer([0x46, 0x12, 0x34, 0x43, 0x21, 0x01, 0x00]);
      var req = WriteMemoryRequest.fromBuffer(frame);

      req.getAddress().should.be.equal(0x4321);
    });

    it("should read uint8 at 5 as a count", function()
    {
      var frame = new Buffer([0x46, 0x12, 0x34, 0x43, 0x21, 0x01, 0x00]);
      var req = WriteMemoryRequest.fromBuffer(frame);

      req.getCount().should.be.equal(0x1);
    });

    it("should read bytes starting at 6 as Buffer of length specified as uint8 at 5", function()
    {
      var frame = new Buffer([0x46, 0x12, 0x02, 0x43, 0x21, 0x02, 0x00, 0x02]);
      var req = WriteMemoryRequest.fromBuffer(frame);

      req.getValues().should.be.eql(new Buffer([0x00, 0x02]));
    });
  });

  describe("toBuffer", function()
  {
    it("should return a properly sized Buffer for 1 byte write", function()
    {
      new WriteMemoryRequest(0x01, 0x02, 0x1234, new Buffer([0x00])).toBuffer().length.should.be.equal(7);
    });

    it("should write the function code as uint8 at 0", function()
    {
      new WriteMemoryRequest(0,0,0, new Buffer([0x00, 0x01])).toBuffer()[0].should.be.equal(0x46);
    });

    it("should write the type as uint8 at 1", function()
    {
      new WriteMemoryRequest(0x12, 0, 0, new Buffer([0x00, 0x01])).toBuffer()[1].should.be.equal(0x12);
    });

    it("should write the count as uint8 at 5", function()
    {
      new WriteMemoryRequest(0x01, 0x32, 0xF55F, new Buffer([0x01, 0x21])).toBuffer()[5].should.be.equal(2);
    });

    it("should write the values Buffer starting at 6", function()
    {
      var req = new WriteMemoryRequest(0x01,0,0, new Buffer([0x13, 0x37]));
      var buf = req.toBuffer();

      buf[6].should.be.eql(0x13);
      buf[7].should.be.eql(0x37);
    });
  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      new WriteMemoryRequest(0x01,0,0, new Buffer([0x00, 0x01])).toString().should.be.a('string');
    });
  });

  describe("createResponse", function()
  {
    it("should return an instance of ExceptionResponse if the function code is an exception", function()
    {
      var req = new WriteMemoryRequest(0x01,0,0, [0, 1]);
      var res = req.createResponse(new Buffer([0xC6, 0x02]));

      res.should.be.an.instanceOf(ExceptionResponse);
      res.getCode().should.be.equal(0x46);
      res.getExceptionCode().should.be.equal(2);
    });

    it("should return an instance of WriteMemoryResponse if the function code is not an exception", function()
    {
      var req = new WriteMemoryRequest(0x01,0,0, new Buffer([0x00, 0x01]));
      var res = req.createResponse(new Buffer([0x46, 0x01]));

      res.should.be.an.instanceOf(WriteMemoryResponse);
      res.getCode().should.be.equal(0x46);
      res.getStatus().should.be.equal(1);
    });
  });

  describe("getType", function()
  {
    it("should return a type specified in the constructor", function()
    {
      new WriteMemoryRequest(0x23,0,0, new Buffer([0x00, 0x01])).getType().should.be.equal(0x23);
    });
  });

  describe("getPage", function()
  {
    it("should return a page specified in the constructor", function()
    {
      new WriteMemoryRequest(0x23,1,2, new Buffer([0x00, 0x01])).getPage().should.be.equal(1);
    });
  });

  describe("getAddress", function()
  {
    it("should return an address specified in the constructor", function()
    {
      new WriteMemoryRequest(0x23, 0, 0xDEAD, new Buffer([0x00, 0x01])).getAddress().should.be.equal(0xDEAD);
    });
  });

  describe("getValues", function()
  {
    it("should return a values Buffer specified in the constructor", function()
    {
      new WriteMemoryRequest(0x12, 0, 0, new Buffer([0x00, 0x01])).getValues().should.be.eql(new Buffer([0x00, 0x01]));
    });
  });
});
