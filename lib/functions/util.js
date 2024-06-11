/*jshint maxparams:5*/

'use strict';

var util = require('util');

/**
 * @type {function(string, ...[*]): string}
 */
exports.format = util.format;

/**
 * @type {function(function, function)}
 */
exports.inherits = util.inherits;

/**
 * @param {number} actualCode
 * @param {number} expectedCode
 * @throws {Error}
 */
exports.assertFunctionCode = function(actualCode, expectedCode)
{
  if (actualCode !== expectedCode)
  {
    throw new Error(util.format(
      "Expected function code to be '%d', got '%d'",
      expectedCode,
      actualCode
    ));
  }
};

/**
 * @param {number} address - The EEPROM address to be translated (in hex).
 * @returns {number} - The corresponding RAM address (in hex).
 * @throws {Error} - If the address does not fall within any valid range.
 */
exports.addressTranslator = function(address)
{
  /**
   *    EE Addr	       RAM Addr
   * -----------------------------
   *   Start End	 |   Start	End
   *   0x00	 0x4F	 |   0x0A0	0x0EF - Lo Ram 
   *   0x50	 0x6F	 |   0x190	0x1AF - Hi Ram
   *   0x80	 0x9F	 |   0x1B0	0x1CF - Hi Ram
   *   0xB0	 0xDF	 |   0x130	0x15F - Hi Ram
   */
  const ranges = [
    { start: 0x00, end: 0x4F, offset: 0x0A0 }, // Low RAM
    { start: 0x50, end: 0x6F, offset: 0x140 }, // High RAM
    { start: 0x70, end: 0x7F, offset: 0x300 }, // EEPROM (no shadow)
    { start: 0x80, end: 0x9F, offset: 0x130 }, // High RAM
    { start: 0xA0, end: 0xAF, offset: 0x300 }, // EEPROM (no shadow)
    { start: 0xB0, end: 0xDF, offset: 0x080 }, // High RAM
    { start: 0xE0, end: 0xFF, offset: 0x300 }, // EEPROM (no shadow)
  ];

  for (let range of ranges) {
    if ((address >= range.start) && (address <= range.end)) {
      return address += range.offset;
    }
  }

  throw new Error(`Address 0x${address.toString(16)} is out of range.`);
};

/**
 * @param {Buffer} buffer
 * @param {number} minLength
 * @throws {Error}
 */
exports.assertBufferLength = function(buffer, minLength)
{
  if (buffer.length < minLength)
  {
    throw new Error(util.format(
      "The specified buffer must be at least '%d' bytes long.", minLength
    ));
  }
};

/**
 * @param {*} address
 * @returns {number}
 * @throws {Error}
 */
exports.prepareAddress = function(address)
{
  return prepareNumericOption(
    address, 0, 0, 65535, 'A starting address'
  );
};

/**
 * @param {*} quantity
 * @param {number} maxQuantity
 * @returns {number}
 * @throws {Error}
 */
exports.prepareQuantity = function(quantity, maxQuantity)
{
  return prepareNumericOption(
    quantity, 1, 1, maxQuantity, 'Quantity'
  );
};

/**
 * @param {*} registerValue
 * @returns {number}
 * @throws {Error}
 */
exports.prepareRegisterValue = function(registerValue)
{
  return prepareNumericOption(
    registerValue, 0, 0, 65535, 'Register value'
  );
};

exports.prepareNumericOption = prepareNumericOption;

/**
 * @param {*} value
 * @param {number} defaultValue
 * @param {number} min
 * @param {number} max
 * @param {string} label
 */
function prepareNumericOption(value, defaultValue, min, max, label)
{
  if (typeof value === 'undefined')
  {
    return defaultValue;
  }

  value = parseInt(value, 10);

  if (isNaN(value) || value < min || value > max)
  {
    throw new Error(util.format(
      "%s must be a number between %d and %d.",
      label,
      min,
      max
    ));
  }

  return value;
}
