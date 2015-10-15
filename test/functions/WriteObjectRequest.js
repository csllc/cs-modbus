/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var WriteObjectRequest = require(LIB_DIR + '/functions/WriteObjectRequest');
var WriteObjectResponse = require(LIB_DIR + '/functions/WriteObjectResponse');
var ExceptionResponse = require(LIB_DIR + '/functions/ExceptionResponse');

describe("WriteObjectRequest", function()
{
  it("should throw if the specified id is invalid", function()
  {
    function testLessThanZero1()
    {
      new WriteObjectRequest(-1337, new Buffer(2));
    }

    function testLessThanZero2()
    {
      new WriteObjectRequest(-1, new Buffer(2));
    }

    function testGreaterThanMax()
    {
      new WriteObjectRequest(256, new Buffer(2));
    }

    testLessThanZero1.should.throw();
    testLessThanZero2.should.throw();
    testGreaterThanMax.should.throw();
  });

  it("should throw if the specified Buffer is invalid", function()
  {
    function testEmpty()
    {
      new WriteObjectRequest(0, new Buffer(0));
    }

    function testTooBig()
    {
      new WriteObjectRequest(0, new Buffer(251));
    }

    function testMax()
    {
      new WriteObjectRequest(0, new Buffer(250));
    }

    testEmpty.should.throw();
    testTooBig.should.throw();
    testMax.should.not.throw();
  });


  describe("getCode", function()
  {
    it("should return a valid function code", function()
    {
      new WriteObjectRequest(0, [0x00, 0x01]).getCode().should.be.equal(0x44);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var req = WriteObjectRequest.fromOptions({
        id: 0x01,
        values: new Buffer([0x00, 0x10])
      });

      req.getId().should.be.equal(0x01);
      req.getValues().should.be.eql(new Buffer([0x00, 0x10]));
    });
  });

  describe("fromBuffer", function()
  {
    it("should throw if the specified Buffer is not at least 4 bytes long", function()
    {
      function test1()
      {
        WriteObjectRequest.fromBuffer(new Buffer([]));
      }

      function test2()
      {
        WriteObjectRequest.fromBuffer(new Buffer([0x44, 0x00, 0x01]));
      }

      test1.should.throw();
      test2.should.throw();
    });

    it("should throw if the first byte is an invalid function code", function()
    {
      function test()
      {
        WriteObjectRequest.fromBuffer(new Buffer([0x03, 0x00, 0x00, 0x00, 0x01, 0x02, 0x00, 0x01]));
      }

      test.should.throw();
    });

    it("should read uint8 at 1 as an id", function()
    {
      var frame = new Buffer([0x44, 0x12, 0x01, 0x00]);
      var req = WriteObjectRequest.fromBuffer(frame);

      req.getId().should.be.equal(0x12);
    });

    it("should read bytes starting at 3 as Buffer of length specified as uint8 at 2", function()
    {
      var frame = new Buffer([0x44, 0x12, 0x02, 0x00, 0x02]);
      var req = WriteObjectRequest.fromBuffer(frame);

      req.getValues().should.be.eql(new Buffer([0x00, 0x02]));
    });
  });

  describe("toBuffer", function()
  {
    it("should return a properly sized Buffer for 1 byte write", function()
    {
      new WriteObjectRequest(0x01, new Buffer([0x00])).toBuffer().length.should.be.equal(4);
    });

    it("should write the function code as uint8 at 0", function()
    {
      new WriteObjectRequest(0x02, new Buffer([0x00, 0x01])).toBuffer()[0].should.be.equal(0x44);
    });

    it("should write the id as uint8 at 1", function()
    {
      new WriteObjectRequest(0x12, new Buffer([0x00, 0x01])).toBuffer()[1].should.be.equal(0x12);
    });

    it("should write the count as uint8 at 2", function()
    {
      new WriteObjectRequest(0x01, new Buffer([0x01, 0x21])).toBuffer()[2].should.be.equal(2);
    });

    it("should write the values Buffer starting at 3", function()
    {
      var req = new WriteObjectRequest(0x01, new Buffer([0x13, 0x37]));
      var buf = req.toBuffer();

      buf[3].should.be.eql(0x13);
      buf[4].should.be.eql(0x37);
    });
  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      new WriteObjectRequest(0x01, new Buffer([0x00, 0x01])).toString().should.be.a('string');
    });
  });

  describe("createResponse", function()
  {
    it("should return an instance of ExceptionResponse if the function code is an exception", function()
    {
      var req = new WriteObjectRequest(0x01, [0, 1]);
      var res = req.createResponse(new Buffer([0xC4, 0x02]));

      res.should.be.an.instanceOf(ExceptionResponse);
      res.getCode().should.be.equal(0x44);
      res.getExceptionCode().should.be.equal(2);
    });

    it("should return an instance of WriteObjectResponse if the function code is not an exception", function()
    {
      var req = new WriteObjectRequest(0x01, new Buffer([0x00, 0x01]));
      var res = req.createResponse(new Buffer([0x44, 0x01]));

      res.should.be.an.instanceOf(WriteObjectResponse);
      res.getCode().should.be.equal(0x44);
      res.getStatus().should.be.equal(1);
    });
  });

  describe("getId", function()
  {
    it("should return an id specified in the constructor", function()
    {
      new WriteObjectRequest(0x23, new Buffer([0x00, 0x01])).getId().should.be.equal(0x23);
    });
  });

  describe("getValues", function()
  {
    it("should return a values Buffer specified in the constructor", function()
    {
      new WriteObjectRequest(0x12, new Buffer([0x00, 0x01])).getValues().should.be.eql(new Buffer([0x00, 0x01]));
    });
  });
});
