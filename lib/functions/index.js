'use strict';

exports.ExceptionResponse = require('./ExceptionResponse');
exports.ReadCoilsRequest = require('./ReadCoilsRequest');
exports.ReadCoilsResponse = require('./ReadCoilsResponse');
exports.ReadDiagnosticsRequest = require('./ReadDiagnosticsRequest');
exports.ReadDiagnosticsResponse = require('./ReadDiagnosticsResponse');
exports.ReadDiscreteInputsRequest = require('./ReadDiscreteInputsRequest');
exports.ReadDiscreteInputsResponse = require('./ReadDiscreteInputsResponse');
exports.ReadHoldingRegistersRequest = require('./ReadHoldingRegistersRequest');
exports.ReadHoldingRegistersResponse =
  require('./ReadHoldingRegistersResponse');
exports.ReadInputRegistersRequest = require('./ReadInputRegistersRequest');
exports.ReadInputRegistersResponse = require('./ReadInputRegistersResponse');

exports.ReportSlaveIdRequest = require('./ReportSlaveIdRequest');
exports.ReportSlaveIdResponse = require('./ReportSlaveIdResponse');

exports.WriteSingleCoilRequest = require('./WriteSingleCoilRequest');
exports.WriteSingleCoilResponse = require('./WriteSingleCoilResponse');
exports.WriteSingleRegisterRequest = require('./WriteSingleRegisterRequest');
exports.WriteSingleRegisterResponse = require('./WriteSingleRegisterResponse');
exports.WriteMultipleCoilsRequest = require('./WriteMultipleCoilsRequest');
exports.WriteMultipleCoilsResponse = require('./WriteMultipleCoilsResponse');
exports.WriteMultipleRegistersRequest =
  require('./WriteMultipleRegistersRequest');
exports.WriteMultipleRegistersResponse =
  require('./WriteMultipleRegistersResponse');
exports.ReadFileRecordRequest = require('./ReadFileRecordRequest');
exports.ReadFileRecordResponse = require('./ReadFileRecordResponse');
exports.WriteFileRecordRequest = require('./WriteFileRecordRequest');
exports.WriteFileRecordResponse = require('./WriteFileRecordResponse');

exports.ReadFifo8Request = require('./ReadFifo8Request');
exports.ReadFifo8Response = require('./ReadFifo8Response');

exports.WriteFifo8Request = require('./WriteFifo8Request');
exports.WriteFifo8Response = require('./WriteFifo8Response');

exports.ReadObjectRequest = require('./ReadObjectRequest');
exports.ReadObjectResponse = require('./ReadObjectResponse');

exports.WriteObjectRequest = require('./WriteObjectRequest');
exports.WriteObjectResponse = require('./WriteObjectResponse');

exports.ReadMemoryRequest = require('./ReadMemoryRequest');
exports.ReadMemoryResponse = require('./ReadMemoryResponse');

exports.WriteMemoryRequest = require('./WriteMemoryRequest');
exports.WriteMemoryResponse = require('./WriteMemoryResponse');

exports.CommandRequest = require('./CommandRequest');
exports.CommandResponse = require('./CommandResponse');

exports[0x01] = exports.ReadCoilsRequest;
exports[0x02] = exports.ReadDiscreteInputsRequest;
exports[0x03] = exports.ReadHoldingRegistersRequest;
exports[0x04] = exports.ReadInputRegistersRequest;
exports[0x05] = exports.WriteSingleCoilRequest;
exports[0x06] = exports.WriteSingleRegisterRequest;
exports[0x08] = exports.ReadDiagnosticsRequest;
exports[0x0F] = exports.WriteMultipleCoilsRequest;
exports[0x10] = exports.WriteMultipleRegistersRequest;
exports[0x11] = exports.ReportSlaveIdRequest;
exports[0x14] = exports.ReadFileRecordRequest;
exports[0x15] = exports.WriteFileRecordRequest;
exports[0x41] = exports.ReadFifo8Request;
exports[0x42] = exports.WriteFifoRequest;
exports[0x43] = exports.ReadObjectRequest;
exports[0x44] = exports.WriteObjectRequest;
exports[0x45] = exports.ReadMemoryRequest;
exports[0x46] = exports.WriteMemoryRequest;
exports[0x47] = exports.CommandRequest;
