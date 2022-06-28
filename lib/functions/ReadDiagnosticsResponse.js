/*global require, module, Buffer*/
"use strict";
var util = require('./util');
var Response = require('./Response');

module.exports = ReadDiagnosticsResponse;

/**
 * The write single register response (code 0x08).
 *
 * A binary representation of this response is 5 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - an output address (2 bytes),
 *   - a register value (2 bytes).
 *
 * @constructor
 * @extends {Response}
 * @param {number} address An address of the register.
 * Must be between 0x0000 and 0xFFFF.
 * @param {number} value A value of the register. Must be between 0 and 65535.
 * @throws {Error} If the `address` is not a number between 0x0000 and 0xFFFF.
 * @throws {Error} If the `value` is not a number between 0 and 65535.
 */
function ReadDiagnosticsResponse(address, quantity) {

    Response.call(this, 0x08);

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

util.inherits(ReadDiagnosticsResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this request are:
 *
 *   - `address` (number, optional) -
 *     An address of the register.
 *     If specified, must be a number between 0 and 0xFFFF.
 *     Defaults to 0.
 *
 *   - `value` (number, optional) -
 *     A value of the register.
 *     If specified, must be between 0 and 65535.
 *     Defaults to 0.
 *
 * @param {object} options An options object.
 * @param {number} [options.address]
 * @param {number} [options.value]
 * @returns {WriteSingleRegisterResponse} A response created from
 * the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadDiagnosticsResponse.fromOptions = function (options) {

    return new ReadDiagnosticsResponse(options.value);
};

/**
 * Creates a new response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this response.
 * @returns {WriteSingleRegisterResponse} A response created
 * from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this response.
 */
ReadDiagnosticsResponse.fromBuffer = function (buffer) {

    util.assertBufferLength(buffer, 5);
    util.assertFunctionCode(buffer[0], 0x08);

    var address = buffer.readUInt16BE(1, true),
        quantity = buffer.readUInt16BE(3, true);

    return new ReadDiagnosticsResponse(address, quantity);
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
ReadDiagnosticsResponse.prototype.toBuffer = function () {

    var buffer = Buffer.alloc(5);

    buffer[0] = 0x08;
    buffer.writeUInt16BE(this.address, 1, true);
    buffer.writeUInt16BE(this.quantity, 3, true);

    return buffer;
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
ReadDiagnosticsResponse.prototype.toString = function () {

    return util.format(
        "0x08 (RES) Diaganostics at %d",
        this.address
    );
};


/**
 * @returns {number} A starting address.
 */
ReadDiagnosticsResponse.prototype.getAddress = function () {

    return this.address;
};


/**
 * @returns {number} A quantity of registers.
 */
ReadDiagnosticsResponse.prototype.getQuantity = function () {

    return this.quantity;
};
