/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var ReportSlaveIdRequest = require(LIB_DIR + '/functions/ReportSlaveIdRequest');
var ReportSlaveIdResponse = require(LIB_DIR + '/functions/ReportSlaveIdResponse');
var ExceptionResponse = require(LIB_DIR + '/functions/ExceptionResponse');

describe("ReportSlaveIdRequest", function()
{

  describe("getCode", function()
  {
    it("should return a valid function code", function()
    {
      new ReportSlaveIdRequest().getCode().should.be.equal(0x11);
    });
  });

  describe("fromOptions", function()
  {
    it("should return a valid function code", function()
    {
      ReportSlaveIdRequest.fromOptions().getCode().should.be.equal(0x11);
    });
  });

  describe("fromBuffer", function()
  {
    it("should return a valid instance", function()
    {
        ReportSlaveIdRequest.fromBuffer(Buffer.from([0x11])).getCode().should.be.equal(0x11);

    });

    it("should throw if the specified Buffer is not 1 bytes long", function()
    {
      function test1()
      {
        ReportSlaveIdRequest.fromBuffer(Buffer.from([]));
      }

      function test2()
      {
        ReportSlaveIdRequest.fromBuffer(Buffer.from([0x11, 0x00, 0x01, 0x00]));
      }

      test1.should.throw();
      test2.should.throw();
    });

    it("should throw if the first byte is an invalid function code", function()
    {
      function test()
      {
        ReportSlaveIdRequest.fromBuffer(Buffer.from([0x02]));
      }

      test.should.throw();
    });

  });

  describe("toBuffer", function()
  {
    it("should return a 1 byte Buffer", function()
    {
      new ReportSlaveIdRequest().toBuffer().length.should.be.equal(1);
    });

    it("should write the function code as uint8 at 0", function()
    {
      new ReportSlaveIdRequest().toBuffer()[0].should.be.equal(0x11);
    });

  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      new ReportSlaveIdRequest().toString().should.be.a.String();
    });
  });

  describe("createResponse", function()
  {
    it("should return an instance of ExceptionResponse if the function code is an exception", function()
    {
      var req = new ReportSlaveIdRequest();
      var res = req.createResponse(Buffer.from([0x91, 0x03]));

      res.should.be.an.instanceOf(ExceptionResponse);
      res.getCode().should.be.equal(0x11);
      res.getExceptionCode().should.be.equal(3);
    });

    it("should return an instance of ReportSlaveIdResponse if the function code is not an exception", function()
    {
      var req = new ReportSlaveIdRequest();
      var res = req.createResponse(Buffer.from([0x11, 0x05, 0x02, 0x00, 0x01, 0x01, 0x01 ]));

      res.should.be.an.instanceOf(ReportSlaveIdResponse);
      res.getCode().should.be.equal(0x11);
    });
  });

});
