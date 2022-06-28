/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var ReadFileRecordResponse = require(LIB_DIR + '/functions/ReadFileRecordResponse');

describe("ReadFileRecordResponse", function()
{
  it("should throw if any of the specified Buffers are invalid", function()
  {
    function testEmpty()
    {
      new ReadFileRecordResponse([Buffer.alloc(0)]);
    }

    function testGreaterThan240()
    {
      new ReadFileRecordResponse([Buffer.alloc(2), Buffer.alloc(4), Buffer.alloc(242)]);
    }

    function testOdd()
    {
      new ReadFileRecordResponse([Buffer.alloc(2), Buffer.alloc(101)]);
    }

    testEmpty.should.throw();
    testGreaterThan240.should.throw();
    testOdd.should.throw();
  });

  describe("getCode", function()
  {
    it("should return a valid function code", function()
    {
      new ReadFileRecordResponse([Buffer.alloc(2)]).getCode().should.be.equal(0x14);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var subResponses = [Buffer.alloc(2), Buffer.alloc(4)];

      var res = ReadFileRecordResponse.fromOptions({
        subResponses: subResponses
      });

      res.getSubResponses().should.be.eql(subResponses);
    });
  });

  describe("fromBuffer", function()
  {
    it("should throw if the specified Buffer is not at least 6 byte long", function()
    {
      function test1()
      {
        ReadFileRecordResponse.fromBuffer(Buffer.from([]));
      }

      function test2()
      {
        ReadFileRecordResponse.fromBuffer(Buffer.from([0x14, 0x02, 0x01, 0x06]));
      }

      test1.should.throw();
      test2.should.throw();
    });

    it("should throw if the first byte is an invalid function code", function()
    {
      function test()
      {
        ReadFileRecordResponse.fromBuffer(Buffer.from([0x01, 0x04, 0x03, 0x06, 0x00, 0x01]));
      }

      test.should.throw();
    });

    it("should throw if the reference type is not equal to 6", function()
    {
      function test()
      {
        ReadFileRecordResponse.fromBuffer(Buffer.from([
          0x14, 0x06,
          0x05, 0xFF, 0x0D, 0xFE, 0x00, 0x20
        ]));
      }

      test.should.throw();
    });

    it("should throw if the sub-response is not complete", function()
    {
      function test()
      {
        ReadFileRecordResponse.fromBuffer(Buffer.from([
          0x14, 0x0C,
          0x05, 0x06, 0x0D, 0xFE, 0x00, 0x20,
          0x05, 0x06, 0x33, 0xCD
        ]));
      }

      test.should.throw();
    });

    it("should the sub-responses starting at 3", function()
    {
      var buf = Buffer.from([
        0x14, 0x0C,
        0x05, 0x06, 0x0D, 0xFE, 0x00, 0x20,
        0x05, 0x06, 0x33, 0xCD, 0x00, 0x40
      ]);

      ReadFileRecordResponse.fromBuffer(buf).getSubResponses().should.be.eql([
        Buffer.from([0x0D, 0xFE, 0x00, 0x20]),
        Buffer.from([0x33, 0xCD, 0x00, 0x40])
      ]);
    });
  });

  describe("toBuffer", function()
  {
    it("should return a 6 byte long Buffer for 2 byte sub-response", function()
    {
      new ReadFileRecordResponse([Buffer.alloc(2)]).toBuffer().length.should.be.equal(6);
    });

    it("should return a 8 byte long Buffer for 4 byte sub-response", function()
    {
      new ReadFileRecordResponse([Buffer.alloc(4)]).toBuffer().length.should.be.equal(8);
    });

    it("should return a 10 byte long Buffer for two 2 byte sub-responses", function()
    {
      new ReadFileRecordResponse([Buffer.alloc(2), Buffer.alloc(2)]).toBuffer().length.should.be.equal(10);
    });

    it("should write the function code as uint8 at 0", function()
    {
      new ReadFileRecordResponse([Buffer.alloc(2)]).toBuffer()[0].should.be.equal(0x14);
    });

    it("should write the following byte count as uint8 at 1", function()
    {
      new ReadFileRecordResponse([Buffer.alloc(2), Buffer.alloc(2)]).toBuffer()[1].should.be.equal(4 * 2);
    });

    it("should write the specified sub-responses starting at 2", function()
    {
      var res = new ReadFileRecordResponse([Buffer.from([0x01, 0x02]), Buffer.from([0x03, 0x04])]);
      var buf = res.toBuffer();

      buf.should.be.eql(Buffer.from([0x14, 0x08, 0x03, 0x06, 0x01, 0x02, 0x03, 0x06, 0x03, 0x04]));
    });
  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      new ReadFileRecordResponse([Buffer.alloc(6)]).toString().should.be.a.String();
    });
  });

  describe("getSubResponses", function()
  {
    it("should return an array of Buffer sub-responses specified in the constructor", function()
    {
      var subResponses = [
        Buffer.from([0x0D, 0xFE, 0x00, 0x20]),
        Buffer.from([0x33, 0xCD, 0x00, 0x40])
      ];

      new ReadFileRecordResponse(subResponses).getSubResponses().should.be.eql(subResponses);
    });
  });

  describe("getTotalRecordDataLength", function()
  {
    it("should return a total length of the specified sub-responses", function()
    {
      var subResponses = [
        Buffer.from([0x0D, 0xFE, 0x00, 0x20]),
        Buffer.from([0x33, 0xCD, 0x00, 0x40])
      ];

      new ReadFileRecordResponse(subResponses).getTotalRecordDataLength().should.be.equal(8);
    });
  });
});
