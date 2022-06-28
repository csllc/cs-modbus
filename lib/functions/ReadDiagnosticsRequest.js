/*global require, module, Buffer*/
'use strict';

var util = require('./util');
var Request = require('./Request');
var ReadDiagnosticsResponse = require('./ReadDiagnosticsResponse');

module.exports = ReadDiagnosticsRequest;

/**
 * The read diagnostics request (code 0x08).
 *
 * A binary representation of this request is 5 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - a starting address (2 bytes),
 *   - a quantity of registers (2 bytes).
 *
 * @constructor
 * @extends {Request}
 * @param {number} address A starting address. Must be between 0 and 0xFFFF.
 * @param {number} quantity A quantity of registers. Must be between 1 and 125.
 * @throws {Error} If the `address` is not a number between 0 and 0xFFFF.
 * @throws {Error} If the `quantity` is not a number between 1 and 125.
 */

function ReadDiagnosticsRequest(address, quantity) {

    Request.call(this, 0x08);

    if (!address || !quantity)
    {
        throw new Error("Missing arguments");
    }

    /**
     * A starting address. A number between 0 and 0xFFFF.
     * The particular diagnostic command to run
     *
     * @private
     * @type {number}
     */
    this.address = util.prepareAddress(address);

    /**
     * A quantity of registers. Must be between 1 and 125.
     *
     * @private
     * @type {number}
     */
    this.quantity = util.prepareQuantity(quantity, 125);
}

util.inherits(ReadDiagnosticsRequest, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are:
 *
 *   - `address` (number, optional) -
 *     A starting address. If specified, must be a number between 0 and 0xFFFF.
 *     Defaults to 0.
 *
 *   - `quantity` (number, optional) -
 *     A quantity of registers. If specified, must be a number
 *     between 1 and 125. Defaults to 1.
 *
 * @param {object} options An options object.
 * @param {number} [options.address]
 * @param {number} [options.quantity]
 * @returns {ReadHoldingRegistersRequest} A request created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadDiagnosticsRequest.fromOptions = function (options) {

    return new ReadDiagnosticsRequest(options.address, options.quantity);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {ReadHoldingRegistersRequest} A request created
 * from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
ReadDiagnosticsRequest.fromBuffer = function (buffer) {

    util.assertBufferLength(buffer, 5);
    util.assertFunctionCode(buffer[0], 0x08);

    return new ReadDiagnosticsRequest(
        buffer.readUInt16BE(1, true),
        buffer.readUInt16BE(3, true)
    );
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
ReadDiagnosticsRequest.prototype.toBuffer = function () {

    var buffer = Buffer.alloc(5);

    buffer[0] = 0x08;
    buffer.writeUInt16BE(this.address, 1, true);
    buffer.writeUInt16BE(this.quantity, 3, true);

    return buffer;
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
ReadDiagnosticsRequest.prototype.toString = function () {

    return util.format(
        "0x08 (REQ) Diagnostics at %d",
        this.address
    );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
ReadDiagnosticsRequest.prototype.createResponse = function (responseBuffer) {

    return this.createExceptionOrResponse(
        responseBuffer,
        ReadDiagnosticsResponse
    );
};


/**
 * @returns {number} A starting address.
 */
ReadDiagnosticsRequest.prototype.getAddress = function () {

    return this.address;
};


/**
 * @returns {number} A quantity of registers.
 */
ReadDiagnosticsRequest.prototype.getQuantity = function () {

    return this.quantity;
};
