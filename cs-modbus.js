(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Modbus = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return b64.length * 3 / 4 - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, j, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr(len * 3 / 4 - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],3:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('Invalid typed array length')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (value instanceof ArrayBuffer) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  return fromObject(value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj) {
    if (ArrayBuffer.isView(obj) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(0)
      }
      return fromArrayLike(obj)
    }

    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return fromArrayLike(obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || string instanceof ArrayBuffer) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : new Buffer(val, encoding)
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

},{"base64-js":2,"ieee754":5}],4:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],5:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],6:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],7:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],8:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],9:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":8,"_process":6,"inherits":7}],10:[function(require,module,exports){
/*jshint unused:false*/

'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;

module.exports = Connection;

/**
 * @constructor
 * @extends {events.EventEmitter}
 */
function Connection()
{
  EventEmitter.call(this);
}

util.inherits(Connection, EventEmitter);

Connection.prototype.destroy = function() {};

/**
 * @returns {boolean}
 */
Connection.prototype.isOpen = function() {};

/**
 * @param {Buffer} data
 */
Connection.prototype.write = function(data) {};

/**
 * @param {object} options
 */
Connection.prototype.set = function(options) {};

/**
 * @param {function} callback
 */
Connection.prototype.drain = function(cb) {};

},{"events":4,"util":9}],11:[function(require,module,exports){
'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var functions = require('./functions');
var Transaction = require('./Transaction');

module.exports = Master;

/**
 * @private
 * @const
 * @type {function}
 */
var SUPPRESS_ERROR_FUNCTION = function() {};

/**
 * @constructor
 * @param {Master.Options|object} options
 * @event connected Emitted when the underlying `Connection` emits the `open`
 * event.
 * @event disconnected Emitted only when the underlying `Connection` emits the
 * first `close` event after the `open` event.
 * @event error Alias to the `error` event of the underlying `Connection`.
 */
function Master(options)
{
  EventEmitter.call(this);

  /**
   * @private
   * @type {Master.Options}
   */
  this.options = options instanceof Master.Options
    ? options
    : new Master.Options(options);

  /**
   * @private
   * @type {Transport}
   */
  this.transport = this.options.transport;

  /**
   * @private
   * @type {Connection}
   */
  this.connection = this.transport.getConnection();

  /**
   * @private
   * @type {number}
   */
  this.connectionCounter = 0;

  /**
   * @private
   * @type {Array.<Transaction>}
   */
  this.transactionQueue = [];

  /**
   * @private
   * @type {number}
   */
  this.executingRequests = 0;

  /**
   * @private
   * @type {Array.<Transaction>}
   */
  this.repeatableTransactions = [];

  this.setUpConnection();
}

util.inherits(Master, EventEmitter);

/**
 * @constructor
 * @param {object} options
 * @param {Transport} options.transport
 * @param {boolean} [options.suppressTransactionErrors]
 * @param {boolean} [options.retryOnException]
 * @param {number} [options.maxConcurrentRequests]
 * @param {number} [options.defaultUnit]
 * @param {number} [options.defaultMaxRetries]
 * @param {number} [options.defaultTimeout]
 */
Master.Options = function(options)
{
  /**
   * @type {Transport}
   */
  this.transport = options.transport;

  /**
   * @type {boolean}
   */
  this.suppressTransactionErrors =
    typeof options.suppressTransactionErrors === 'boolean'
      ? options.suppressTransactionErrors
      : false;

  /**
   * @type {boolean}
   */
  this.retryOnException = typeof options.retryOnException === 'boolean'
    ? options.retryOnException
    : true;

  /**
   * @type {number}
   */
  this.maxConcurrentRequests = typeof options.maxConcurrentRequests === 'number'
    ? options.maxConcurrentRequests
    : 1;

  /**
   * @type {number}
   */
  this.defaultUnit = typeof options.defaultUnit === 'number'
    ? options.defaultUnit
    : 0;

  /**
   * @type {number}
   */
  this.defaultMaxRetries = typeof options.defaultMaxRetries === 'number'
    ? options.defaultMaxRetries
    : 3;

  /**
   * @type {number}
   */
  this.defaultTimeout = typeof options.defaultTimeout === 'number'
    ? options.defaultTimeout
    : 100;
};

Master.prototype.destroy = function()
{
  this.options = null;

  if (this.transport !== null)
  {
    this.transport.destroy();
    this.transport = null;
  }

  this.connection = null;

  if (this.transactionQueue !== null)
  {
    this.transactionQueue.forEach(function(transaction)
    {
      transaction.destroy();
    });
    this.transactionQueue = null;
  }

  if (this.repeatableTransactions !== null)
  {
    this.repeatableTransactions.forEach(function(transaction)
    {
      transaction.destroy();
    });
    this.repeatableTransactions = null;
  }
};

/**
 * @returns {Transport}
 */
Master.prototype.getTransport = function()
{
  return this.transport;
};

/**
 * @returns {Connection}
 */
Master.prototype.getConnection = function()
{
  return this.connection;
};

/**
 * @returns {boolean}
 */
Master.prototype.isConnected = function()
{
  return this.connection.isOpen();
};

/**
 * @param {Transaction|object} options
 * @returns {Transaction}
 * @throws {Error}
 */
Master.prototype.execute = function(options)
{
  var transaction = this.createTransaction(options);

  if (transaction.isRepeatable())
  {
    this.addRepeatableTransaction(transaction);
  }

  this.transactionQueue.push(transaction);
  this.executeQueuedTransactions();

  return transaction;
};

/**
 * @param {number} address
 * @param {number} quantity
 * @param {function|object} [options]
 * @param {number} [options.unit]
 * @param {number} [options.interval]
 * @param {number} [options.timeout]
 * @param {number} [options.maxRetries]
 * @param {function} [options.onResponse]
 * @param {function} [options.onError]
 * @param {function} [options.onComplete]
 * @returns {Transaction}
 * @throws {Error}
 */
Master.prototype.readCoils = function(address, quantity, options)
{
  return this.request(
    new functions.ReadCoilsRequest(address, quantity),
    options
  );
};

/**
 * @param {number} address
 * @param {number} quantity
 * @param {function|object} [options]
 * @param {number} [options.unit]
 * @param {number} [options.interval]
 * @param {number} [options.timeout]
 * @param {number} [options.maxRetries]
 * @param {function} [options.onResponse]
 * @param {function} [options.onError]
 * @param {function} [options.onComplete]
 * @returns {Transaction}
 * @throws {Error}
 */
Master.prototype.readDiscreteInputs = function(address, quantity, options)
{
  return this.request(
    new functions.ReadDiscreteInputsRequest(address, quantity),
    options
  );
};

/**
 * @param {number} address
 * @param {number} quantity
 * @param {function|object} [options]
 * @param {number} [options.unit]
 * @param {number} [options.interval]
 * @param {number} [options.timeout]
 * @param {number} [options.maxRetries]
 * @param {function} [options.onResponse]
 * @param {function} [options.onError]
 * @param {function} [options.onComplete]
 * @returns {Transaction}
 * @throws {Error}
 */
Master.prototype.readHoldingRegisters = function(address, quantity, options)
{
  return this.request(
    new functions.ReadHoldingRegistersRequest(address, quantity),
    options
  );
};

/**
 * @param {number} address
 * @param {number} quantity
 * @param {function|object} [options]
 * @param {number} [options.unit]
 * @param {number} [options.interval]
 * @param {number} [options.timeout]
 * @param {number} [options.maxRetries]
 * @param {function} [options.onResponse]
 * @param {function} [options.onError]
 * @param {function} [options.onComplete]
 * @returns {Transaction}
 * @throws {Error}
 */
Master.prototype.readInputRegisters = function(address, quantity, options)
{
  return this.request(
    new functions.ReadInputRegistersRequest(address, quantity),
    options
  );
};

/**
 * @param {Array.<ReadFileSubRequest>} subRequests
 * @param {function|object} [options]
 * @param {number} [options.unit]
 * @param {number} [options.interval]
 * @param {number} [options.timeout]
 * @param {number} [options.maxRetries]
 * @param {function} [options.onResponse]
 * @param {function} [options.onError]
 * @param {function} [options.onComplete]
 * @returns {Transaction}
 * @throws {Error}
 */
Master.prototype.readFileRecord = function(subRequests, options)
{
  return this.request(
    new functions.ReadFileRecordRequest(subRequests),
    options
  );
};

/**
 * @param {function|object} [options]
 * @param {number} [options.unit]
 * @param {number} [options.interval]
 * @param {number} [options.timeout]
 * @param {number} [options.maxRetries]
 * @param {function} [options.onResponse]
 * @param {function} [options.onError]
 * @param {function} [options.onComplete]
 * @returns {Transaction}
 * @throws {Error}
 */
Master.prototype.reportSlaveId = function(options)
{
  return this.request(
    new functions.ReportSlaveIdRequest(),
    options
  );
};

/*
 * @param {number} value the diagnostic command
 * @param {function|object} [options]
 * @param {number} [options.unit]
 * @param {number} [options.interval]
 * @param {number} [options.timeout]
 * @param {number} [options.maxRetries]
 * @param {function} [options.onResponse]
 * @param {function} [options.onError]
 * @param {function} [options.onComplete]
 * @returns {Transaction}
 * @throws {Error}
 */
Master.prototype.readDiagnostics = function(value, options)
{
  return this.request(
    new functions.ReadDiagnosticsRequest(value),
    options
  );
};


/**
 * @param {number} FIFO Id
 * @param {number} max max number of bytes
 * @param {function|object} [options]
 * @param {number} [options.unit]
 * @param {number} [options.interval]
 * @param {number} [options.timeout]
 * @param {number} [options.maxRetries]
 * @param {function} [options.onResponse]
 * @param {function} [options.onError]
 * @param {function} [options.onComplete]
 * @returns {Transaction}
 * @throws {Error}
 */
Master.prototype.readFifo8 = function(id, max, options)
{
  if( 'object' === typeof( max ))
  {
    // deal with omitted max parameter
    options = max;
    max = null;
  }

  return this.request(
    new functions.ReadFifo8Request(id, max),
    options
  );
};

/**
 * @param {number} Object Id
 * @param {function|object} [options]
 * @param {number} [options.unit]
 * @param {number} [options.interval]
 * @param {number} [options.timeout]
 * @param {number} [options.maxRetries]
 * @param {function} [options.onResponse]
 * @param {function} [options.onError]
 * @param {function} [options.onComplete]
 * @returns {Transaction}
 * @throws {Error}
 */
Master.prototype.readObject = function(id, options)
{
  return this.request(
    new functions.ReadObjectRequest(id),
    options
  );
};

/**
 * @param {number} address start address
 * @param {number} length number of bytes to read
 * @param {function|object} [options]
 * @param {number} [options.unit]
 * @param {number} [options.interval]
 * @param {number} [options.timeout]
 * @param {number} [options.maxRetries]
 * @param {function} [options.onResponse]
 * @param {function} [options.onError]
 * @param {function} [options.onComplete]
 * @returns {Transaction}
 * @throws {Error}
 */
Master.prototype.readMemory = function(
  address, length, options)
{
  if( 'object' === typeof( length ))
  {
    
    length = 1;
  }

  return this.request(
    new functions.ReadMemoryRequest( address, length),
    options
  );
};


/**
 * @param {number} address
 * @param {boolean} state
 * @param {function|object} [options]
 * @param {number} [options.unit]
 * @param {number} [options.interval]
 * @param {number} [options.timeout]
 * @param {number} [options.maxRetries]
 * @param {function} [options.onResponse]
 * @param {function} [options.onError]
 * @param {function} [options.onComplete]
 * @returns {Transaction}
 * @throws {Error}
 */
Master.prototype.writeSingleCoil = function(address, state, options)
{
  return this.request(
    new functions.WriteSingleCoilRequest(address, state),
    options
  );
};

/**
 * @param {number} address
 * @param {number} value
 * @param {function|object} [options]
 * @param {number} [options.unit]
 * @param {number} [options.interval]
 * @param {number} [options.timeout]
 * @param {number} [options.maxRetries]
 * @param {function} [options.onResponse]
 * @param {function} [options.onError]
 * @param {function} [options.onComplete]
 * @returns {Transaction}
 * @throws {Error}
 */
Master.prototype.writeSingleRegister = function(address, value, options)
{
  return this.request(
    new functions.WriteSingleRegisterRequest(address, value),
    options
  );
};

/**
 * @param {number} address
 * @param {Array.<boolean>} states
 * @param {function|object} [options]
 * @param {number} [options.unit]
 * @param {number} [options.interval]
 * @param {number} [options.timeout]
 * @param {number} [options.maxRetries]
 * @param {function} [options.onResponse]
 * @param {function} [options.onError]
 * @param {function} [options.onComplete]
 * @returns {Transaction}
 * @throws {Error}
 */
Master.prototype.writeMultipleCoils = function(address, states, options)
{
  return this.request(
    new functions.WriteMultipleCoilsRequest(address, states),
    options
  );
};

/**
 * @param {number} address
 * @param {Buffer} values
 * @param {function|object} [options]
 * @param {number} [options.unit]
 * @param {number} [options.interval]
 * @param {number} [options.timeout]
 * @param {number} [options.maxRetries]
 * @param {function} [options.onResponse]
 * @param {function} [options.onError]
 * @param {function} [options.onComplete]
 * @returns {Transaction}
 * @throws {Error}
 */
Master.prototype.writeMultipleRegisters = function(address, values, options)
{
  return this.request(
    new functions.WriteMultipleRegistersRequest(address, values),
    options
  );
};

/**
 * @param {Array.<WriteFileSubRequest>} subRequests
 * @param {function|object} [options]
 * @param {number} [options.unit]
 * @param {number} [options.interval]
 * @param {number} [options.timeout]
 * @param {number} [options.maxRetries]
 * @param {function} [options.onResponse]
 * @param {function} [options.onError]
 * @param {function} [options.onComplete]
 * @returns {Transaction}
 * @throws {Error}
 */
Master.prototype.writeFileRecord = function(subRequests, options)
{
  return this.request(
    new functions.WriteFileRecordRequest(subRequests),
    options
  );
};

/**
 * @param {number} id FIFO identifier
 * @param {Buffer} values
 * @param {function|object} [options]
 * @param {number} [options.unit]
 * @param {number} [options.interval]
 * @param {number} [options.timeout]
 * @param {number} [options.maxRetries]
 * @param {function} [options.onResponse]
 * @param {function} [options.onError]
 * @param {function} [options.onComplete]
 * @returns {Transaction}
 * @throws {Error}
 */
Master.prototype.writeFifo8 = function(id, values, options)
{
  return this.request(
    new functions.WriteFifo8Request(id, values),
    options
  );
};

/**
 * @param {number} id object identifier
 * @param {Buffer} value
 * @param {function|object} [options]
 * @param {number} [options.unit]
 * @param {number} [options.interval]
 * @param {number} [options.timeout]
 * @param {number} [options.maxRetries]
 * @param {function} [options.onResponse]
 * @param {function} [options.onError]
 * @param {function} [options.onComplete]
 * @returns {Transaction}
 * @throws {Error}
 */
Master.prototype.writeObject = function(id, value, options)
{
  return this.request(
    new functions.WriteObjectRequest(id, value),
    options
  );
};

/**
 * @param {number} address start address
 * @param {Buffer} values
 * @param {function|object} [options]
 * @param {number} [options.unit]
 * @param {number} [options.interval]
 * @param {number} [options.timeout]
 * @param {number} [options.maxRetries]
 * @param {function} [options.onResponse]
 * @param {function} [options.onError]
 * @param {function} [options.onComplete]
 * @returns {Transaction}
 * @throws {Error}
 */

Master.prototype.writeMemory = function(
  address, values, options)
{
  return this.request(
    new functions.WriteMemoryRequest(address, values),
    options
  );
};

/**
 * @param {number} id command identifier
 * @param {Buffer} values
 * @param {function|object} [options]
 * @param {number} [options.unit]
 * @param {number} [options.interval]
 * @param {number} [options.timeout]
 * @param {number} [options.maxRetries]
 * @param {function} [options.onResponse]
 * @param {function} [options.onError]
 * @param {function} [options.onComplete]
 * @returns {Transaction}
 * @throws {Error}
 */
Master.prototype.command = function(id, values, options)
{

  return this.request(
    new functions.CommandRequest(id, values),
    options
  );
};

/**
 * @private
 */
Master.prototype.setUpConnection = function()
{
  this.connection.on('error', this.emit.bind(this, 'error'));
  this.connection.on('open', this.onConnectionOpen.bind(this));
  this.connection.on('close', this.onConnectionClose.bind(this));
};

/**
 * @private
 */
Master.prototype.onConnectionOpen = function()
{
  this.connected = true;
  this.connectionCounter += 1;

  this.queueRepeatableTransactions();
  this.executeQueuedTransactions();

  this.emit('connected', this.connectionCounter);
};

/**
 * @private
 */
Master.prototype.onConnectionClose = function()
{
  if (this.connected)
  {
    this.emit('disconnected');

    this.connected = false;
  }
};

/**
 * @private
 * @param {ModbusFunction} request
 * @param {function|object} [options]
 * @returns {Transaction}
 */
Master.prototype.request = function(request, options)
{
  var optionsType = typeof options;

  if (optionsType === 'function')
  {
    options = {onComplete: options};
  }
  else if (optionsType !== 'object' || options === null)
  {
    options = {};
  }

  options.request = request;

  return this.execute(options);
};

/**
 * @private
 * @param {Transaction|object} options
 * @returns {Transaction}
 * @throws {Error}
 */
Master.prototype.createTransaction = function(options)
{
  var transaction;

  if (options instanceof Transaction)
  {
    transaction = options;
  }
  else
  {
    this.applyTransactionDefaults(options);

    transaction = Transaction.fromOptions(options);
  }

  if (this.options.suppressTransactionErrors)
  {
    transaction.on('error', SUPPRESS_ERROR_FUNCTION);
  }

  transaction.on(
    'complete',
    this.onTransactionComplete.bind(this, transaction)
  );

  return transaction;
};

/**
 * @private
 * @param {object} options
 */
Master.prototype.applyTransactionDefaults = function(options)
{
  if (typeof options.unit === 'undefined')
  {
    options.unit = this.options.defaultUnit;
  }

  if (typeof options.maxRetries === 'undefined')
  {
    options.maxRetries = this.options.defaultMaxRetries;
  }

  if (typeof options.timeout === 'undefined')
  {
    options.timeout = this.options.defaultTimeout;
  }
};

/**
 * @private
 * @param {Transaction} transaction
 */
Master.prototype.addRepeatableTransaction = function(transaction)
{
  var repeatableTransactions = this.repeatableTransactions;

  repeatableTransactions.push(transaction);

  transaction.once('cancel', function()
  {
    var transactionIndex = repeatableTransactions.indexOf(transaction);

    if (transactionIndex !== -1)
    {
      repeatableTransactions.splice(transactionIndex, 1);
    }
  });
};

/**
 * @private
 */
Master.prototype.queueRepeatableTransactions = function()
{
  for (var i = 0, l = this.repeatableTransactions.length; i < l; ++i)
  {
    this.transactionQueue.push(this.repeatableTransactions[i]);
  }
};

/**
 * @private
 */
Master.prototype.executeQueuedTransactions = function()
{
  while (this.transactionQueue.length > 0
    && this.executingRequests < this.options.maxConcurrentRequests)
  {
    var transaction = this.transactionQueue.shift();

    this.transport.sendRequest(transaction);

    this.executingRequests += 1;
  }
};

/**
 * @private
 * @param {Transaction} transaction
 * @param {Error} error
 * @param {Response} response
 */
Master.prototype.onTransactionComplete = function(transaction, error, response)
{
  this.executingRequests -= 1;

  if (!transaction.isCancelled())
  {
    if (error !== null)
    {
      this.handleError(transaction);
    }
    else if (response !== null)
    {
      this.handleResponse(transaction, response);
    }
  }

  this.executeQueuedTransactions();
};

/**
 * @private
 * @param {Transaction} transaction
 */
Master.prototype.handleError = function(transaction)
{
  if (transaction.shouldRetry())
  {
    this.transactionQueue.unshift(transaction);
  }
  else if (transaction.isRepeatable() && this.isConnected())
  {
    this.scheduleExecution(transaction);
  }
};

/**
 * @private
 * @param {Transaction} transaction
 * @param {Response} response
 */
Master.prototype.handleResponse = function(transaction, response)
{
  if (response.isException()
    && transaction.shouldRetry()
    && this.options.retryOnException)
  {
    this.transactionQueue.unshift(transaction);
  }
  else if (transaction.isRepeatable() && this.isConnected())
  {
    this.scheduleExecution(transaction);
  }
};

/**
 * @private
 * @param {Transaction} transaction
 */
Master.prototype.scheduleExecution = function(transaction)
{
  var master = this;

  transaction.scheduleExecution(function()
  {
    if (!this.isCancelled())
    {
      master.transactionQueue.push(this);
      master.executeQueuedTransactions();
    }
  });
};

},{"./Transaction":14,"./functions":64,"events":4,"util":9}],12:[function(require,module,exports){
/*jshint unused:false*/

'use strict';

module.exports = ModbusFunction;

/**
 * @constructor
 * @param {number} code
 */
function ModbusFunction(code)
{
  /**
   * @private
   * @type {number}
   */
  this.code = code;
}

/**
 * @param {object} options
 * @returns {ModbusFunction}
 * @throws {Error}
 */
ModbusFunction.fromOptions = function(options)
{
  throw new Error("Cannot call an abstract static method!");
};

/**
 * @param {Buffer} buffer
 * @returns {ModbusFunction}
 * @throws {Error}
 */
ModbusFunction.fromBuffer = function(buffer)
{
  throw new Error("Cannot call an abstract static method!");
};

/**
 * @returns {Buffer}
 */
ModbusFunction.prototype.toBuffer = function()
{
  throw new Error("Abstract method must be overridden by the child class!");
};

/**
 * @returns {string}
 */
ModbusFunction.prototype.toString = function()
{
  throw new Error("Abstract method must be overridden by the child class!");
};

/**
 * @returns {number}
 */
ModbusFunction.prototype.getCode = function()
{
  return this.code;
};

},{}],13:[function(require,module,exports){
(function (Buffer){
/**
 * Object that represents and manipulates a register
 *
 * This provides a convenient way to describe registers and convert their contents
 * to and from user-friendly interpretations.
 *
 */
'use strict';



// Constructor for Item object
function Register( options ) {

  // Save the address and make sure it's in array format
  this.addr = options.addr ;//|| null;

//  if( !Array.isArray(this.addr)) {
//    this.addr = [this.addr];
//  }

  this.length = options.length || 1;

  this.value = options.value || 0;
  this.min = options.min || 0;
  this.max = options.max || 255;
  this.fnFormat = options.format || null;
  this.fnUnformat = options.unformat || null;
  this.name = options.name || this.type + ':' + this.addr[0];
  this.units = options.units || '';

}

Register.prototype.set = function( value ) {
  if (value instanceof Buffer ) {
    this.value = value.readUInt16BE(0);
  }
  else {
    this.value = value;
  }
}


Register.prototype.getReadCommands = function() {
/*
  var list = [];
  var me = this;

  this.addr.forEach( function( a ) {
    if( me.type === 'ee') {
      list.push( new Buffer( [USB_I2C_READ, a, 0 ]));
    }
    else if( me.addr < 256 ) {
      list.push( new Buffer( [USB_I2C_READ_LO_RAM, a, 0 ]));

    }
    else {
      list.push( new Buffer( [USB_I2C_READ_HI_RAM, a % 256, 0] ));
    }
  });

  return list;
*/
};

/**
 * Returns the value of this item, formatted if possible
 *
 * @return {[type]} value
 */
Register.prototype.format = function() {

  if( this.fnFormat ) {
    return this.fnFormat( this.value );
  }
  else {
    return this.value;
  }

};

/**
 * Returns a 16-bit word formatted as hex string, 4 chars long
 *
 */
Register.prototype.valueToHex16 = function() {
  return this.zeroPad((this.value[0] * 256 + this.value[1]).toString(16), 4);
};

/**
 * Returns a 8-bit byte formatted as hex string. 2 chars long
 *
 */
Register.prototype.valueToHex8 = function() {
  return this.zeroPad(this.value[0].toString(16), 2);
};

/**
 * Returns a byte formatted as decimal string
 *
 */
Register.prototype.value8 = function() {

    return this.value & 0xFF;
};

/**
 * Returns a 16-bit word formatted as decimal string
 *
 */
Register.prototype.value16 = function() {
    return (this.value);
};

/**
 * Zero pads a number (on the left) to a specified length
 *
 * @param  {number} number the number to be padded
 * @param  {number} length number of digits to return
 * @return {string}        zero-padded number
 */
Register.prototype.zeroPad = function( number, length ) {
  var pad = new Array(length + 1).join( '0' );

  return (pad+number).slice(-pad.length);
};

/**
 * Converts a percentage value to an item's scaled value based on its min and max
 *
 * @param item an object from the memory map that has a max and min value
 * @param value the value that should be converted from a percent
 */
Register.prototype.value8FromPercent = function() {
    return Math.max(
      Math.min(
        Math.round((this.value[0] * this.max / 100)-this.min), this.max),this.min);
};

/**
 * Convert a value to a percent using the item's max and min parameters
 *
 * @param item an object from the memory map that has a max and min value
 * @param value the value that should be converted to a percent
 *
 * @returns {Number}
 */
Register.prototype.value8ToPercent = function() {
    return Math.max(
      Math.min(
        Math.round((this.value[0]-this.min) * 100 / this.max), 100),0);
};


module.exports = Register;
}).call(this,require("buffer").Buffer)
},{"buffer":3}],14:[function(require,module,exports){
(function (process){
'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Request = require('./functions/Request');
var ResponseTimeoutError = require('./errors').ResponseTimeoutError;

module.exports = Transaction;

/**
 * @constructor
 * @extends {events.EventEmitter}
 * @param {Request} request
 * @event error
 * @event response
 * @event complete
 * @event timeout
 * @event cancel
 */
function Transaction(request)
{
  EventEmitter.call(this);

  /**
   * @private
   * @type {Request}
   */
  this.request = request;

  /**
   * @private
   * @type {number}
   */
  this.unit = 0;

  /**
   * @private
   * @type {number}
   */
  this.maxRetries = 0;

  /**
   * @private
   * @type {number}
   */
  this.timeout = 0;

  /**
   * @private
   * @type {number}
   */
  this.interval = -1;

  /**
   * @private
   * @type {boolean}
   */
  this.cancelled = false;

  /**
   * @private
   * @type {Buffer|null}
   */
  this.adu = null;

  /**
   * @private
   * @type {number}
   */
  this.failures = 0;

  /**
   * @private
   * @type {number|null}
   */
  this.timeoutTimer = null;

  /**
   * @private
   * @type {number|null}
   */
  this.executionTimer = null;
}

util.inherits(Transaction, EventEmitter);

/**
 * @param {Transaction|object} options
 * @param {Request|object} options.request
 * @param {number} [options.unit]
 * @param {number} [options.interval]
 * @param {number} [options.timeout]
 * @param {number} [options.maxRetries]
 * @param {function} [options.onResponse]
 * @param {function} [options.onError]
 * @param {function} [options.onComplete]
 * @returns {Transaction}
 * @throws {Error}
 */
Transaction.fromOptions = function(options)
{
  if (options instanceof Transaction)
  {
    return options;
  }

  var request = options.request instanceof Request
    ? options.request
    : Request.fromOptions(options.request);

  var transaction = new Transaction(request);

  if (typeof options.unit !== 'undefined')
  {
    transaction.setUnit(options.unit);
  }

  if (typeof options.maxRetries !== 'undefined')
  {
    transaction.setMaxRetries(options.maxRetries);
  }

  if (typeof options.timeout !== 'undefined')
  {
    transaction.setTimeout(options.timeout);
  }

  if (typeof options.interval !== 'undefined')
  {
    transaction.setInterval(options.interval);
  }

  if (typeof options.onResponse === 'function')
  {
    transaction.on('response', options.onResponse);
  }

  if (typeof options.onError === 'function')
  {
    transaction.on('error', options.onError);
  }

  if (typeof options.onComplete === 'function')
  {
    transaction.on('complete', options.onComplete);
  }

  return transaction;
};

Transaction.prototype.destroy = function()
{
  this.removeAllListeners();

  if (this.timeoutTimer !== null)
  {
    clearTimeout(this.timeoutTimer);
    this.timeoutTimer = null;
  }

  if (this.executionTimer !== null)
  {
    clearTimeout(this.executionTimer);
    this.executionTimer = null;
  }
};

/**
 * @returns {Request}
 */
Transaction.prototype.getRequest = function()
{
  return this.request;
};

/**
 * @returns {number}
 */
Transaction.prototype.getUnit = function()
{
  return this.unit;
};

/**
 * @param {number} unit
 * @returns {Transaction}
 * @throws {Error}
 */
Transaction.prototype.setUnit = function(unit)
{
  if (typeof unit !== 'number' || unit < 0 || unit > 255)
  {
    throw new Error(util.format(
      "Invalid unit value. Expected a number between 0 and 255, got: %s",
      unit
    ));
  }

  this.unit = unit;

  return this;
};

/**
 * @returns {number}
 */
Transaction.prototype.getMaxRetries = function()
{
  return this.maxRetries;
};

/**
 * @param {number} maxRetries
 * @returns {Transaction}
 * @throws {Error}
 */
Transaction.prototype.setMaxRetries = function(maxRetries)
{
  if (typeof maxRetries !== 'number' || maxRetries < 0)
  {
    throw new Error(util.format(
      "Invalid max retries value. "
        + "Expected a number greater than or equal to 0, got: %s",
      maxRetries
    ));
  }

  this.maxRetries = maxRetries;

  return this;
};

/**
 * @returns {number}
 */
Transaction.prototype.getTimeout = function()
{
  return this.timeout;
};

/**
 * @param {number} timeout
 * @returns {Transaction}
 * @throws {Error}
 */
Transaction.prototype.setTimeout = function(timeout)
{
  if (typeof timeout !== 'number' || timeout < 1)
  {
    throw new Error(util.format(
      "Invalid timeout value. Expected a number greater than 0, got: %s",
      timeout
    ));
  }

  this.timeout = timeout;

  return this;
};

/**
 * @returns {number}
 */
Transaction.prototype.getInterval = function()
{
  return this.interval;
};

/**
 * @param {number} interval
 * @returns {Transaction}
 * @throws {Error}
 */
Transaction.prototype.setInterval = function(interval)
{
  if (typeof interval !== 'number' || interval < -1)
  {
    throw new Error(util.format(
      "Invalid interval value. "
        + "Expected a number greater than or equal to -1, got: %s",
      interval
    ));
  }

  this.interval = interval;

  return this;
};

/**
 * @returns {boolean}
 */
Transaction.prototype.isRepeatable = function()
{
  return this.interval !== -1;
};

/**
 * @param {Response} response
 */
Transaction.prototype.handleResponse = function(response)
{
  this.stopTimeout();

  if (response.isException())
  {
    this.failures += 1;
  }
  else
  {
    this.failures = 0;
  }

  var transaction = this;

  process.nextTick(function()
  {
    if (!transaction.isCancelled())
    {
      transaction.emit('response', response);
    }

    transaction.emit('complete', null, response);
  });
};

/**
 * @param {Error} error
 */
Transaction.prototype.handleError = function(error)
{
  this.stopTimeout();

  this.failures += 1;

  var transaction = this;

  process.nextTick(function()
  {
    if (!transaction.isCancelled())
    {
      transaction.emit('error', error);
    }

    transaction.emit('complete', error, null);
  });
};

/**
 * @param {function} onTimeout
 */
Transaction.prototype.start = function(onTimeout)
{
  this.timeoutTimer = setTimeout(
    this.handleTimeout.bind(this, onTimeout),
    this.timeout
  );
};

/**
 * @param {function} cb
 */
Transaction.prototype.scheduleExecution = function(cb)
{
  if (this.interval === 0)
  {
    cb.call(this);
  }
  else if (this.interval > 0)
  {
    this.executionTimer = setTimeout(cb.bind(this), this.interval);
  }
};

/**
 * @returns {boolean}
 */
Transaction.prototype.shouldRetry = function()
{
  return this.failures <= this.maxRetries;
};

Transaction.prototype.cancel = function()
{
  if (this.cancelled)
  {
    return;
  }

  this.cancelled = true;

  this.emit('cancel');
};

/**
 * @returns {boolean}
 */
Transaction.prototype.isCancelled = function()
{
  return this.cancelled;
};

/**
 * @returns {Buffer|null}
 */
Transaction.prototype.getAdu = function()
{
  return this.adu;
};

/**
 * @param {Buffer} adu
 * @throws {Error} If the ADU was already set.
 */
Transaction.prototype.setAdu = function(adu)
{
  if (this.adu !== null)
  {
    throw new Error("ADU for this transaction was already set.");
  }

  this.adu = adu;
};

/**
 * @private
 */
Transaction.prototype.stopTimeout = function()
{
  if (this.timeoutTimer !== null)
  {
    clearTimeout(this.timeoutTimer);
    this.timeoutTimer = null;
  }
};

/**
 * @private
 * @param {function} cb
 */
Transaction.prototype.handleTimeout = function(cb)
{
  this.timeoutTimer = null;

  cb();

  if (!this.isCancelled())
  {
    this.emit('timeout');
  }

  this.handleError(new ResponseTimeoutError());
};

}).call(this,require('_process'))
},{"./errors":22,"./functions/Request":46,"_process":6,"events":4,"util":9}],15:[function(require,module,exports){
/*jshint unused:false*/

'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;

module.exports = Transport;

/**
 * @constructor
 * @extends {events.EventEmitter}
 * @param {Connection} connection
 */
function Transport(connection)
{
  EventEmitter.call(this);

  /**
   * @protected
   * @type {Connection}
   */
  this.connection = connection;
}

util.inherits(Transport, EventEmitter);

/**
 * @returns {Connection}
 */
Transport.prototype.getConnection = function()
{
  return this.connection;
};

Transport.prototype.destroy = function() {};

/**
 * @param {Transaction} transaction
 */
Transport.prototype.sendRequest = function(transaction) {};

},{"events":4,"util":9}],16:[function(require,module,exports){
/**
 * Implements a connection class using a Bluetooth Low Energy (BLE)
 * physical interface
 * 
 */
'use strict';

var util = require('util');
var Connection = require('../Connection');

module.exports = BleConnection;

/**
 * @constructor
 * @extends {Connection}
 * @param {BleConnection.Options|object} options
 * @event open Alias to the `listening` event of the underlying `dgram.Socket`.
 * @event close Alias to the `close` event of the underlying `dgram.Socket`.
 * @event error Emitted when the underlying `dgram.Socket` emits the `error`
 * event or its `send()` method throws.
 * @event write Emitted before writing any data to the underlying
 * `dgram.Socket` (even if the socket is closed).
 * @event data Alias to the `message` event of the underlying `dgram.Socket`.
 */
function BleConnection( device )
{
  Connection.call(this);

  /**
   * @readonly
   * @type {BleConnection.Options}
   */
  //this.options = options instanceof BleConnection.Options
  //  ? options
  //  : new BleConnection.Options(options);

  /**
   * @private
   * @type {dgram.Socket}
   */
  this.socket = this.setUpSocket( device );

  // if the socket is already connected when we get initialized...
  //if( this.socket.isConnected()) {
  //  this.emit( 'open' );
  //}
}

util.inherits(BleConnection, Connection);

/**
 * @constructor
 * @param {object} options
 * @param {dgram.Socket} options.socket
 * @param {string} [options.host]
 * @param {number} [options.port]
 */
BleConnection.Options = function(options)
{
  /**
   * @type {dgram.Socket}
   */
  this.socket = options.device;

  /**
   * @type {string}
   */
  //this.host = typeof options.host === 'string' ? options.host : '127.0.0.1';

  /**
   * @type {number}
   */
  //this.port = typeof options.port === 'number' ? options.port : 502;
};

BleConnection.prototype.destroy = function()
{
  this.removeAllListeners();

  this.options = null;

  if (this.socket !== null)
  {
    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
  }
};

/**
 * @returns {boolean} Returns `true` if the underlying `dgram.Socket` is bound,
 * i.e. the `bind()` method was called and the `listening` event was emitted.
 */
BleConnection.prototype.isOpen = function()
{
  return this.socket.isConnected();
};

/**
 * @param {Buffer} data
 */
BleConnection.prototype.write = function(data)
{
  this.emit('write', data);

  try
  {
    this.socket.sendUart( data );
  }
  catch (err)
  {
    this.emit('error', err);
  }
};

/**
 * @private
 * @returns {dgram.Socket}
 */
BleConnection.prototype.setUpSocket = function( device )
{
  var me = this;

  //device.on('connected', this.emit.bind(this, 'open'));
  device.on('connected', function() {
    device.enableUart()
    .then( function() { me.emit( 'open'); });
  });

  device.on('disconnected', this.emit.bind(this, 'close'));
  device.on('error', this.emit.bind(this, 'error'));
  device.on('data', this.emit.bind(this, 'data'));

  return device;
};

},{"../Connection":10,"util":9}],17:[function(require,module,exports){
'use strict';

var util = require('util');
var Connection = require('../Connection');

module.exports = NoConnection;

/**
 * @constructor
 * @extends {Connection}
 */
function NoConnection()
{
  Connection.call(this);
}

util.inherits(NoConnection, Connection);

NoConnection.prototype.destroy = function() {};

/**
 * @returns {boolean}
 */
NoConnection.prototype.isOpen = function() {
  return true;
};

/**
 * @param {Buffer} data
 */
NoConnection.prototype.write = function(data)
{
  try {
    this.emit('write', data);
  } catch (e){
    this.emit('error', e);
  }
};

},{"../Connection":10,"util":9}],18:[function(require,module,exports){
'use strict';

var util = require('util');
var Connection = require('../Connection');

module.exports = SerialConnection;

/**
 * @constructor
 * @extends {Connection}
 * @param {serialport.SerialPort} serialPort
 * @event open Alias to the `open` event of the underlying `SerialPort`.
 * @event close Alias to the `close` event of the underlying `SerialPort`.
 * @event error Emitted when the underlying `SerialPort` emits the `error`
 * event or its `write()` method throws.
 * @event write Emitted before writing any data to the underlying
 * `SerialPort` (even if the serial port is closed).
 * @event data Alias to the `data` event of the underlying `SerialPort`.
 */
function SerialConnection(serialPort)
{
  Connection.call(this);

  /**
   * @private
   * @type {serialport.SerialPort}
   */
  this.serialPort = this.setUpSerialPort(serialPort);
}

util.inherits(SerialConnection, Connection);

SerialConnection.prototype.destroy = function()
{
  this.removeAllListeners();

  if (this.serialPort !== null)
  {
    this.serialPort.removeAllListeners();
    this.serialPort.close();
    this.serialPort = null;
  }
};

/**
 * @returns {boolean}
 */
SerialConnection.prototype.isOpen = function()
{
  // That's how SerialPort.write() checks whether the port is open.
  // There's no dedicated public method.
  return !!this.serialPort.fd;
};

/**
 * Access to node-serialport set method
 *
 * Can be used by transports to twiddle things like RTS, etc
 * @param {object} options per node-serialport docs, like {rts: true}
 */
SerialConnection.prototype.set = function(options)
{
  this.serialPort.set(options);
}

/**
 * Access to node-serialport drain method
 *
 * provide a callback when transmit buffer is empty
 * @param {function} callback
 */
SerialConnection.prototype.drain = function(cb)
{
  this.serialPort.drain(cb);
}

/**
 * @param {Buffer} data
 */
SerialConnection.prototype.write = function(data)
{
  this.emit('write', data);

  try
  {
    this.serialPort.write(data);
  }
  catch (err)
  {
    this.emit('error', err);
  }
};

/**
 * @private
 * @param {serialport.SerialPort} serialPort
 * @returns {serialport.SerialPort}
 */
SerialConnection.prototype.setUpSerialPort = function(serialPort)
{
  serialPort.on('open', this.emit.bind(this, 'open'));
  serialPort.on('close', this.emit.bind(this, 'close'));
  serialPort.on('error', this.emit.bind(this, 'error'));
  serialPort.on('data', this.emit.bind(this, 'data'));

  return serialPort;
};

},{"../Connection":10,"util":9}],19:[function(require,module,exports){
'use strict';

var util = require('util');
var net = require('net');
var Connection = require('../Connection');

module.exports = TcpConnection;

/**
 * @constructor
 * @extends {Connection}
 * @param {TcpConnection.Options|object} [options]
 * @event open Alias to the `connect` event of the underlying `net.Socket`.
 * @event close Alias to the `close` event of the underlying `net.Socket`.
 * @event error Emitted when the underlying `net.Socket` emits the `error`
 * event or its `write()` method throws.
 * @event write Emitted before writing any data to the underlying
 * `net.Socket` (even if the connection is closed).
 * @event data Alias to the `data` event of the underlying `net.Socket`.
 */
function TcpConnection(options)
{
  Connection.call(this);

  /**
   * @private
   * @type {TcpConnection.Options}
   */
  this.options = options instanceof TcpConnection.Options
    ? options
    : new TcpConnection.Options(options);

  /**
   * @private
   * @type {net.Socket}
   */
  this.socket = this.setUpSocket();

  /**
   * @private
   * @type {boolean}
   */
  this.connected = false;

  /**
   * @private
   * @type {boolean}
   */
  this.connecting = false;

  /**
   * @private
   * @type {boolean}
   */
  this.shouldReconnect = this.options.autoReconnect;

  /**
   * @private
   * @type {number|null}
   */
  this.reconnectTimer = null;

  /**
   * @private
   * @type {number|null}
   */
  this.minConnectTimeTimer = null;

  /**
   * @private
   * @type {number}
   */
  this.connectionAttempts = 0;

  /**
   * @private
   * @type {number}
   */
  this.lastDataEventTime = 0;

  /**
   * @private
   * @type {number|null}
   */
  this.noActivityTimeTimer = null;

  if (this.options.autoConnect)
  {
    this.connect();
  }
}

util.inherits(TcpConnection, Connection);

/**
 * @constructor
 * @param {object} [options]
 * @param {net.Socket} [options.socket]
 * @param {string} [options.host]
 * @param {number} [options.port]
 * @param {boolean} [options.autoConnect]
 * @param {boolean} [options.autoReconnect]
 * @param {number} [options.minConnectTime]
 * @param {number} [options.maxReconnectTime]
 * @param {number} [options.noActivityTime]
 */
TcpConnection.Options = function(options)
{
  if (options === null || typeof options !== 'object')
  {
    options = {};
  }

  /**
   * @type {net.Socket}
   */
  this.socket = options.socket instanceof net.Socket
    ? options.socket
    : new net.Socket();

  /**
   * @type {string}
   */
  this.host = typeof options.host === 'string' ? options.host : '127.0.0.1';

  /**
   * @type {number}
   */
  this.port = typeof options.port === 'number' ? options.port : 502;

  /**
   * @type {boolean}
   */
  this.autoConnect = typeof options.autoConnect === 'boolean'
    ? options.autoConnect
    : true;

  /**
   * @type {boolean}
   */
  this.autoReconnect = typeof options.autoReconnect === 'boolean'
    ? options.autoReconnect
    : true;

  /**
   * @type {number}
   */
  this.minConnectTime = typeof options.minConnectTime === 'number'
    ? options.minConnectTime
    : 2500;

  /**
   * @type {number}
   */
  this.maxReconnectTime = typeof options.maxReconnectTime === 'number'
    ? options.maxReconnectTime
    : 5000;

  /**
   * @type {number}
   */
  this.noActivityTime = typeof options.noActivityTime === 'number'
    ? options.noActivityTime
    : -1;
};

TcpConnection.prototype.destroy = function()
{
  this.removeAllListeners();

  this.options = null;

  if (this.socket !== null)
  {
    this.socket.removeAllListeners();
    this.socket.destroy();
    this.socket = null;
  }

  if (this.reconnectTimer !== null)
  {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  if (this.minConnectTimeTimer !== null)
  {
    clearTimeout(this.minConnectTimeTimer);
    this.minConnectTimeTimer = null;
  }

  if (this.noActivityTimeTimer !== null)
  {
    clearInterval(this.noActivityTimeTimer);
    this.noActivityTimeTimer = null;
  }
};

/**
 * @returns {boolean}
 */
TcpConnection.prototype.isOpen = function()
{
  return this.connected;
};

TcpConnection.prototype.connect = function()
{
  if (this.connected || this.connecting)
  {
    return;
  }

  clearTimeout(this.reconnectTimer);
  this.reconnectTimer = null;

  this.connecting = true;
  this.shouldReconnect = this.options.autoReconnect;
  this.connectionAttempts += 1;

  this.socket.connect(this.options.port, this.options.host);
};

TcpConnection.prototype.close = function()
{
  this.doClose(false);
};

/**
 * @param {Buffer} data
 */
TcpConnection.prototype.write = function(data)
{
  this.emit('write', data);

  if (!this.connected)
  {
    return;
  }

  try
  {
    this.socket.write(data);
  }
  catch (err)
  {
    this.emit('error', err);
  }
};

/**
 * @private
 * @param {boolean} shouldReconnect
 */
TcpConnection.prototype.doClose = function(shouldReconnect)
{
  this.shouldReconnect = shouldReconnect;

  if (this.reconnectTimer !== null)
  {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  this.socket.destroy();
};

/**
 * @private
 * @returns {net.Socket}
 */
TcpConnection.prototype.setUpSocket = function()
{
  this.onSocketConnect = this.onSocketConnect.bind(this);
  this.onSocketClose = this.onSocketClose.bind(this);
  this.onSocketReadable = this.onSocketReadable.bind(this);

  var socket = this.options.socket;

  socket.setNoDelay(true);
  socket.on('connect', this.onSocketConnect);
  socket.on('close', this.onSocketClose);
  socket.on('error', this.emit.bind(this, 'error'));
  socket.on('readable', this.onSocketReadable);

  return socket;
};

/**
 * @private
 */
TcpConnection.prototype.onSocketConnect = function()
{
  this.connecting = false;
  this.connected = true;

  clearTimeout(this.minConnectTimeTimer);

  var connection = this;

  this.minConnectTimeTimer = setTimeout(
    function()
    {
      connection.connectionAttempts = 0;
      connection.minConnectTimeTimer = null;

      connection.setUpNoActivityTimer();
    },
    this.options.minConnectTime
  );

  this.emit('open');
};

/**
 * @private
 */
TcpConnection.prototype.onSocketClose = function()
{
  clearTimeout(this.minConnectTimeTimer);
  this.minConnectTimeTimer = null;

  if (this.noActivityTimeTimer !== null)
  {
    clearInterval(this.noActivityTimeTimer);
    this.noActivityTimeTimer = null;
  }

  this.connecting = false;
  this.connected = false;

  this.handleReconnect();

  this.emit('close');
};

/**
 * @private
 */
TcpConnection.prototype.onSocketReadable = function()
{
  var data = this.socket.read();

  if (data !== null)
  {
    this.lastDataEventTime = Date.now();

    this.emit('data', data);
  }
};

/**
 * @private
 */
TcpConnection.prototype.handleReconnect = function()
{
  if (!this.shouldReconnect)
  {
    return;
  }

  var reconnectTime = 250 * this.connectionAttempts;

  if (reconnectTime > this.options.maxReconnectTime)
  {
    reconnectTime = this.options.maxReconnectTime;
  }

  this.reconnectTimer = setTimeout(this.connect.bind(this), reconnectTime);
};

/**
 * @private
 */
TcpConnection.prototype.setUpNoActivityTimer = function()
{
  var noActivityTime = this.options.noActivityTime;

  if (noActivityTime <= 0 || this.noActivityTimeTimer !== null)
  {
    return;
  }

  this.noActivityTimeTimer = setInterval(
    this.checkActivity.bind(this),
    noActivityTime
  );
};

/**
 * @private
 */
TcpConnection.prototype.checkActivity = function()
{
  var lastActivityTime = Date.now() - this.lastDataEventTime;

  if (lastActivityTime > this.options.noActivityTime)
  {
    this.connected = false;

    this.doClose(true);
  }
};

},{"../Connection":10,"net":1,"util":9}],20:[function(require,module,exports){
'use strict';

var util = require('util');
var Connection = require('../Connection');

module.exports = UdpConnection;

/**
 * @constructor
 * @extends {Connection}
 * @param {UdpConnection.Options|object} options
 * @event open Alias to the `listening` event of the underlying `dgram.Socket`.
 * @event close Alias to the `close` event of the underlying `dgram.Socket`.
 * @event error Emitted when the underlying `dgram.Socket` emits the `error`
 * event or its `send()` method throws.
 * @event write Emitted before writing any data to the underlying
 * `dgram.Socket` (even if the socket is closed).
 * @event data Alias to the `message` event of the underlying `dgram.Socket`.
 */
function UdpConnection(options)
{
  Connection.call(this);

  /**
   * @readonly
   * @type {UdpConnection.Options}
   */
  this.options = options instanceof UdpConnection.Options
    ? options
    : new UdpConnection.Options(options);

  /**
   * @private
   * @type {dgram.Socket}
   */
  this.socket = this.setUpSocket();
}

util.inherits(UdpConnection, Connection);

/**
 * @constructor
 * @param {object} options
 * @param {dgram.Socket} options.socket
 * @param {string} [options.host]
 * @param {number} [options.port]
 */
UdpConnection.Options = function(options)
{
  /**
   * @type {dgram.Socket}
   */
  this.socket = options.socket;

  /**
   * @type {string}
   */
  this.host = typeof options.host === 'string' ? options.host : '127.0.0.1';

  /**
   * @type {number}
   */
  this.port = typeof options.port === 'number' ? options.port : 502;
};

UdpConnection.prototype.destroy = function()
{
  this.removeAllListeners();

  this.options = null;

  if (this.socket !== null)
  {
    this.socket.removeAllListeners();
    this.socket.close();
    this.socket = null;
  }
};

/**
 * @returns {boolean} Returns `true` if the underlying `dgram.Socket` is bound,
 * i.e. the `bind()` method was called and the `listening` event was emitted.
 */
UdpConnection.prototype.isOpen = function()
{
  try
  {
    this.socket.address();

    return true;
  }
  catch (err)
  {
    return false;
  }
};

/**
 * @param {Buffer} data
 */
UdpConnection.prototype.write = function(data)
{
  this.emit('write', data);

  try
  {
    this.socket.send(
      data, 0, data.length, this.options.port, this.options.host
    );
  }
  catch (err)
  {
    this.emit('error', err);
  }
};

/**
 * @private
 * @returns {dgram.Socket}
 */
UdpConnection.prototype.setUpSocket = function()
{
  var socket = this.options.socket;

  socket.on('listening', this.emit.bind(this, 'open'));
  socket.on('close', this.emit.bind(this, 'close'));
  socket.on('error', this.emit.bind(this, 'error'));
  socket.on('message', this.emit.bind(this, 'data'));

  return socket;
};

},{"../Connection":10,"util":9}],21:[function(require,module,exports){
'use strict';

var util = require('util');
var Connection = require('../Connection');

module.exports = WebsocketConnection;

/**
 * @constructor
 * @extends {Connection}
 * @param {WebsocketConnection.Options|object} options
 * @event open Alias to the `connect` event of the underlying `Socket`.
 * @event close Alias to the `disconnect` event of the underlying `Socket`.
 * @event error Emitted when the underlying `Socket` emits the `error`
 * event or throws.
 * @event write Emitted before writing any data to the underlying
 * `Socket` (even if the socket is closed).
 * @event data Alias to the `message` event of the underlying `Socket`.
 */
function WebsocketConnection(socket)
{
  Connection.call(this);

  /**
   * @readonly
   * @type {WebsocketConnection.Options}
   */
/*
  this.options = options instanceof WebsocketConnection.Options
    ? options
    : new WebsocketConnection.Options(options);
console.log( this.options);
*/
  /**
   * @private
   * @type {dgram.Socket}
   */
  this.socket = this.setUpSocket(socket);

  //this.socket.connect(this.url);
}

util.inherits(WebsocketConnection, Connection);

/**
 * @constructor
 * @param {object} options
 * @param {Socket} options.socket
 * @param {string} [options.url]
 */
WebsocketConnection.Options = function(options)
{
  /**
   * @type {Socket}
   */
  this.socket = options.socket;

  /**
   * @type {string}
   */
  //this.url = typeof options.url === 'string' ?
  //  options.url : 'http://127.0.0.1:8080';

};

WebsocketConnection.prototype.destroy = function()
{
  this.removeAllListeners();

  this.options = null;

  if (this.socket !== null)
  {
    this.socket.removeAllListeners();
    this.socket.close();
    this.socket = null;
  }
};

/**
 * @returns {boolean} Returns `true` if the underlying `Socket` is connected,
 *
 */
WebsocketConnection.prototype.isOpen = function()
{
  try{
    return (this.socket.connected ? true: false);
  }
  catch(e) {
    return false;
  }
};

/**
 * @param {Buffer} data
 */
WebsocketConnection.prototype.write = function(data)
{
  this.emit('write', data);

  try
  {
    this.socket.emit(
      'data',
      data );
  }
  catch (err)
  {
    this.emit('error', err);
  }
};

/**
 * @private
 * @returns {dgram.Socket}
 */
WebsocketConnection.prototype.setUpSocket = function(socket)
{
  //var socket = this.options.socket;

  socket.on('connect', this.emit.bind(this, 'open'));
  socket.on('disconnect', this.emit.bind(this, 'close'));
  socket.on('error', this.emit.bind(this, 'error'));
  socket.on('data', this.emit.bind(this, 'data'));

  return socket;
};

},{"../Connection":10,"util":9}],22:[function(require,module,exports){
'use strict';

var inherits = require('util').inherits;

/**
 * @constructor
 * @extends {Error}
 * @param {string} [message]
 */
exports.ResponseTimeoutError = createError(
  'ResponseTimeoutError',
  'No response was received from the slave in the specified time.'
);

/**
 * @constructor
 * @extends {Error}
 * @param {string} [message]
 */
exports.InvalidChecksumError = createError(
  'InvalidChecksumError',
  'Response received from the slave had an invalid checksum.'
);

/**
 * @constructor
 * @extends {Error}
 * @param {string} [message]
 */
exports.InvalidResponseDataError = createError(
  'InvalidResponseDataError',
  'Response data received from the slave was invalid.'
);

/**
 * @constructor
 * @extends {Error}
 * @param {string} [message]
 */
exports.IncompleteResponseFrameError = createError(
  'IncompleteResponseFrameError',
  'Response frame received from the slave was incomplete.'
);

/**
 * @private
 * @param {string} name
 * @param {string} message
 * @returns {function(new:ModbusError)}
 */
function createError(name, message)
{
  /**
   * @constructor
   * @extends {Error}
   * @param {string} [newMessage]
   */
  function ModbusError(newMessage)
  {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);

    this.name = name;
    this.message = newMessage || message;
  }
  
  inherits(ModbusError, Error);
  
  return ModbusError;
}

},{"util":9}],23:[function(require,module,exports){
(function (Buffer){
'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Request = require('./Request');
var CommandResponse = require('./CommandResponse');

// The code for this message
var theFunctionCode = 0x47;

module.exports = CommandRequest;

/**
 * The Command request (code 0x47).
 *
 * The response to this request returns a binary object
 * read from the slave device.
 *
 * A binary representation of this request is at least
 * two bytes in
 * length and consists of:
 *
 *   - a function code (1 byte),
 *   - an command identifier (1 byte),
 *   - (optional) additional values
 *
 * @constructor
 * @extends {Request}
 * @param {integer} id Identifies the command to be executed
 * @param {Buffer}  values Additional bytes of data to send
 *
 * @throws {Error} If any of the specified sub-requests are invalid.
 */
function CommandRequest( id, values )
{
  Request.call(this, theFunctionCode);

  this.id = util.prepareNumericOption( id, 0, 0, 255, 'Command id');

  this.values = values || new Buffer(0);
}

util.inherits(CommandRequest, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are:
 *   - id: command id
 *
 * @param {object} options An options object.
 * @param {number} [options.id] Identifies the command
 * @param {buffer} [options.data] [optional additional data]
 *
 * @returns {CommandRequest} A request created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
CommandRequest.fromOptions = function(options)
{
  options.data = options.data || new Buffer(0);

  return new CommandRequest(options.id, options.data);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {CommandRequest} A request created from its binary
 * representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
CommandRequest.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 2);
  util.assertFunctionCode(buffer[0], theFunctionCode);

  var id = buffer[1];
  var byteCount = buffer.length - 2;
  var values = new Buffer(byteCount);

  buffer.copy(values, 0, 3, 3 + byteCount);

  return new CommandRequest(id, values);
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
CommandRequest.prototype.toBuffer = function()
{

  var builder = new buffers.BufferBuilder();

  builder
    .pushByte(theFunctionCode)
    .pushByte(this.id)
    .pushBuffer(this.values);

  return builder.toBuffer();
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
CommandRequest.prototype.toString = function()
{
  return util.format(
    "0x47 (REQ) Command %d",
    this.id
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
CommandRequest.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    CommandResponse
  );
};

/**
 * @returns {number} Object id
 */
CommandRequest.prototype.getId = function()
{
  return this.id;
};

/**
 * @returns {Buffer} Values of the registers
 */
CommandRequest.prototype.getValues = function()
{
  return this.values;
}
/*jshint unused:false*/


}).call(this,require("buffer").Buffer)
},{"./CommandResponse":24,"./Request":46,"./util":65,"buffer":3,"h5.buffers":75}],24:[function(require,module,exports){
(function (Buffer){
'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Response = require('./Response');

module.exports = CommandResponse;

/**
 * The read holding registers response (code 0x47).
 *
 * A binary representation of this response varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a command ID (1 byte)
 *   - optional values (`N` bytes).
 *
 * @constructor
 * @extends {Response}
 * @param {number} ID of the command
 * @param {Buffer} values bytes containing the object
 * @throws {Error} If the length of the `values` buffer is not
 * acceptable.
 */
function CommandResponse( id, values )
{
  Response.call(this, 0x47);

  if (values.length < 0 || values.length > 250)
  {
    throw new Error(util.format(
      "The length of the `values` buffer must be a number "
        + "between 0 and 250, got: %d",
      values.length
    ));
  }

  if (id < 0 || id > 255)
  {
    throw new Error(util.format(
      "Invalid Command ID (must be 0 to 255) "
        + "got: %d",
      id
    ));
  }

  this.id = id;

  /**
   * Values of the registers. A buffer of length between 2 and 250.
   *
   * @private
   * @type {Buffer}
   */
  this.values = values;
}

util.inherits(CommandResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `id` (number, required) - command ID
 *   - `values` (Buffer, required) -
 *     Values of the registers. Must be a buffer of length
 *     between 0 and 250.
 *
 * @param {object} options An options object.
 * @param {number} options.status a status code
 * @param {Buffer} options.values
 * @returns {CommandResponse} A response
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
CommandResponse.fromOptions = function(options)
{
  return new CommandResponse(options.id, options.values);
};

/**
 * Creates a new response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the response.
 * @returns {CommandResponse} A response
 * created from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of the response message.
 */
CommandResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 2);
  util.assertFunctionCode(buffer[0], 0x47);

  var id = buffer[1];
  var byteCount = buffer.length - 2;
  var values = new Buffer(byteCount);

  buffer.copy(values, 0, 2, byteCount + 2);

  return new CommandResponse(id, values);
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
CommandResponse.prototype.toBuffer = function()
{
  return new buffers.BufferBuilder()
    .pushByte(0x47)
    .pushByte(this.id)
    .pushBuffer(this.values)
    .toBuffer();
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
CommandResponse.prototype.toString = function()
{
  return util.format(
    "0x47 (RES) Command %d: ",
    this.id,
    this.values
  );
};

/**
 * @returns {number} Command ID
 */
CommandResponse.prototype.getId = function()
{
  return this.id;
};

/**
 * @returns {Buffer} Values of the data values.
 */
CommandResponse.prototype.getValues = function()
{
  return this.values;
};

/**
 * @returns {number} A number of the data values.
 */
CommandResponse.prototype.getCount = function()
{
  return this.values.length;
};

}).call(this,require("buffer").Buffer)
},{"./Response":47,"./util":65,"buffer":3,"h5.buffers":75}],25:[function(require,module,exports){
(function (Buffer){
'use strict';

var util = require('./util');
var Response = require('./Response');

module.exports = ExceptionResponse;

/**
 * @private
 * @const
 * @type {object.<number, string>}
 */
var codeToMessageMap = {
  0x01: 'Illegal Function Code: The function code received in the query is not '
    + 'an allowable action for the server (or slave).',
  0x02: 'Illegal Data Address: The data address received in the query is not '
    + 'an allowable address for the server (or slave).',
  0x03: 'Illegal Data Value: A value contained in the query data field is not '
    + 'an allowable value for server (or slave).',
  0x04: 'Slave Device Failure: An unrecoverable error occurred while the '
    + 'server (or slave) was attempting to perform the requested action.',
  0x05: 'Acknowledge: The server (or slave) has accepted the request and is '
    + 'processing it, but a long duration of time will be required to do so.',
  0x06: 'Slave Device Busy: The server (or slave) is engaged in processing '
    + 'a long–duration program command.',
  0x07: 'Negative Acknowledge: The server (or slave) cannot perform the '
    + 'program function received in the query.',
  0x08: 'Memory Parity Error: The server (or slave) attempted to read record '
    + 'file, but detected a parity error in the memory.',
  0x0A: 'Gateway Path Unavailable: Gateway was unable to allocate an internal '
    + 'communication path from the input port to the output port for '
    + 'processing the request.',
  0x0B: 'Gateway Target Device Failed To Respond: No response was obtained '
    + 'from the target device.'
};

/**
 * The exception response (code above 0x80).
 *
 * A binary representation of this response is 2 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - an exception code (1 byte).
 *
 * @constructor
 * @extends {Response}
 * @param {number} functionCode A code of the function that resulted in
 * the exception.
 * @param {number} exceptionCode A code of the exception.
 */
function ExceptionResponse(functionCode, exceptionCode)
{
  Response.call(this, functionCode);

  /**
   * A code of the exception.
   *
   * @private
   * @type {number}
   */
  this.exceptionCode = exceptionCode;
}

util.inherits(ExceptionResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `functionCode` (number, required) -
 *     A code of the function that resulted in an exception.
 *
 *   - `exceptionCode` (number, required) -
 *     A code of the exception.
 *
 * @param {object} options An options object.
 * @param {number} options.functionCode
 * @param {number} options.exceptionCode
 * @returns {ExceptionResponse} A response created from
 * the specified `options`.
 */
ExceptionResponse.fromOptions = function(options)
{
  return new ExceptionResponse(options.functionCode, options.exceptionCode);
};

/**
 * Creates a new response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the response.
 * @returns {ExceptionResponse} A response created from its
 * binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this response.
 */
ExceptionResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 2);

  if (buffer[0] <= 0x80)
  {
    throw new Error(util.format(
      "Expected the function code to be above 128, got [%d]",
      buffer[0]
    ));
  }

  return new ExceptionResponse(buffer[0] - 0x80, buffer[1]);
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
ExceptionResponse.prototype.toBuffer = function()
{
  return new Buffer([this.getCode() + 0x80, this.exceptionCode]);
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
ExceptionResponse.prototype.toString = function ()
{
  var functionCode = '0x';

  if (this.exceptionCode < 0xF)
  {
    functionCode += '0';
  }

  functionCode += this.exceptionCode.toString(16);

  var message = 'Exception (' + this.exceptionCode + ')';

  if (this.exceptionCode in codeToMessageMap)
  {
    message += ': ' + codeToMessageMap[this.exceptionCode];
  }

  return functionCode + ' (RES) ' + message;
};

/**
 * @returns {number} A code of the exception.
 */
ExceptionResponse.prototype.getExceptionCode = function()
{
  return this.exceptionCode;
};

/**
 * @returns {boolean}
 */
ExceptionResponse.prototype.isException = function()
{
  return true;
};

}).call(this,require("buffer").Buffer)
},{"./Response":47,"./util":65,"buffer":3}],26:[function(require,module,exports){
(function (Buffer){
'use strict';

var util = require('./util');
var Request = require('./Request');
var ReadCoilsResponse = require('./ReadCoilsResponse');

module.exports = ReadCoilsRequest;

/**
 * The read coils request (code 0x01).
 *
 * A binary representation of this request is 5 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - a starting address (2 bytes),
 *   - a quantity of coils (2 bytes).
 *
 * @constructor
 * @extends {Request}
 * @param {number} address A starting address. Must be between 0 and 0xFFFF.
 * @param {number} quantity A quantity of coils. Must be between 1 and 2000.
 * @throws {Error} If the `address` is not a number between 0 and 0xFFFF.
 * @throws {Error} If the `quantity` is not a number between 1 and 2000.
 */
function ReadCoilsRequest(address, quantity)
{
  Request.call(this, 0x01);

  /**
   * A starting address. A number between 0 and 0xFFFF.
   *
   * @private
   * @type {number}
   */
  this.address = util.prepareAddress(address);

  /**
   * A quantity of coils. A number between 1 and 2000.
   *
   * @private
   * @type {number}
   */
  this.quantity = util.prepareQuantity(quantity, 2000);
}

util.inherits(ReadCoilsRequest, Request);

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
 *     A quantity of coils. If specified, must be a number between 1 and 2000.
 *     Defaults to 1.
 *
 * @param {object} options An options object.
 * @param {number} [options.address]
 * @param {number} [options.quantity]
 * @returns {ReadCoilsRequest} A response created from
 * the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadCoilsRequest.fromOptions = function(options)
{
  return new ReadCoilsRequest(options.address, options.quantity);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the request.
 * @returns {ReadCoilsRequest} A request created from
 * its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
ReadCoilsRequest.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 5);
  util.assertFunctionCode(buffer[0], 0x01);

  return new ReadCoilsRequest(
    buffer.readUInt16BE(1, true),
    buffer.readUInt16BE(3, true)
  );
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
ReadCoilsRequest.prototype.toBuffer = function()
{
  var buffer = new Buffer(5);

  buffer[0] = 0x01;
  buffer.writeUInt16BE(this.address, 1, true);
  buffer.writeUInt16BE(this.quantity, 3, true);

  return buffer;
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
ReadCoilsRequest.prototype.toString = function()
{
  return util.format(
    "0x01 (REQ) Read %d coils starting from address %d",
    this.quantity,
    this.address
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
ReadCoilsRequest.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(responseBuffer, ReadCoilsResponse);
};

/**
 * @returns {number} A starting address.
 */
ReadCoilsRequest.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @returns {number} A quantity of coils.
 */
ReadCoilsRequest.prototype.getQuantity = function()
{
  return this.quantity;
};

}).call(this,require("buffer").Buffer)
},{"./ReadCoilsResponse":27,"./Request":46,"./util":65,"buffer":3}],27:[function(require,module,exports){
'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Response = require('./Response');

module.exports = ReadCoilsResponse;

/**
 * The read coils response (code 0x01).
 *
 * A binary representation of this response varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a byte count `N` (1 byte),
 *   - states of the coils (`N` bytes).
 *
 * @constructor
 * @extends {Response}
 * @param {Array.<boolean>} states States of the coils.
 * An array of 1 to 2000 truthy or falsy elements.
 * @throws {Error} If the length of the `states` array is not
 * between 1 and 2000.
 */
function ReadCoilsResponse(states)
{
  Response.call(this, 0x01);

  if (states.length < 1 || states.length > 2000)
  {
    throw new Error(util.format(
      "The length of the `states` array must be between 1 and 2000, got %d.",
      states.length
    ));
  }

  /**
   * States of the coils. An array of 1 to 2000 truthy or falsy elements.
   *
   * @private
   * @type {Array.<boolean>}
   */
  this.states = states;
}

util.inherits(ReadCoilsResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `states` (array, required) -
 *     An array of coil states. Must have between 1 and 2000 elements.
 *
 * @param {object} options An options object.
 * @param {Array.<boolean>} options.states
 * @returns {ReadCoilsResponse} A response created from
 * the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadCoilsResponse.fromOptions = function(options)
{
  return new ReadCoilsResponse(options.states);
};

/**
 * Creates a new response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this response.
 * @returns {ReadCoilsResponse} A response created from
 * its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this response.
 */
ReadCoilsResponse.fromBuffer = function(buffer)
{
  util.assertFunctionCode(buffer[0], 0x01);

  return new ReadCoilsResponse(
    new buffers.BufferReader(buffer).readBits(2, buffer[1] * 8)
  );
};

/**
 * Returns a binary representation of the read coils response.
 *
 * @returns {Buffer} A binary representation of the response.
 */
ReadCoilsResponse.prototype.toBuffer = function()
{
  return new buffers.BufferBuilder()
    .pushByte(0x01)
    .pushByte(Math.ceil(this.states.length / 8))
    .pushBits(this.states)
    .toBuffer();
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
ReadCoilsResponse.prototype.toString = function()
{
  return util.format(
    "0x01 (RES) %d coils:",
    this.states.length,
    this.states.map(Number)
  );
};

/**
 * @returns {Array.<boolean>} States of the coils.
 */
ReadCoilsResponse.prototype.getStates = function()
{
  return this.states;
};

/**
 * @returns {number}
 */
ReadCoilsResponse.prototype.getCount = function()
{
  return this.states.length;
};

/**
 * @param {number} offset
 * @returns {boolean}
 * @throws {Error} If the specified offset is out of bounds.
 */
ReadCoilsResponse.prototype.isOn = function(offset)
{
  if (offset >= this.states.length || offset < 0)
  {
    throw new Error("Offset out of bounds: " + offset);
  }

  return !!this.states[offset];
};

/**
 * @param {number} offset
 * @returns {boolean}
 * @throws {Error} If the specified offset is out of bounds.
 */
ReadCoilsResponse.prototype.isOff = function(offset)
{
  if (offset >= this.states.length || offset < 0)
  {
    throw new Error("Offset out of bounds: " + offset);
  }

  return !this.states[offset];
};

},{"./Response":47,"./util":65,"h5.buffers":75}],28:[function(require,module,exports){
(function (Buffer){
/*global require, module, ReadDiagnosticsRequest, Buffer*/

var util = require('./util');
var Request = require('./Request');
//var ReadHoldingRegistersResponse = require('./ReadHoldingRegistersResponse');
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

function ReadDiagnosticsRequest(value) {
    "use strict";
    Request.call(this, 0x08);

    /**
     * A starting address. A number between 0 and 0xFFFF. <-- this is old
     * The particular diagnostic command to run
     *
     * @private
     * @type {number}
     */
    this.address = util.prepareAddress(value);

    /**
     * This is always zero
     *
     * @private
     * @type {number}
     */
    this.quantity = util.prepareAddress(0);
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
    "use strict";
    return new ReadDiagnosticsRequest(options.value);
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
    "use strict";
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
    "use strict";
    var buffer = new Buffer(5);

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
    "use strict";
    return util.format(
        "0x08 (REQ) Diagnostics at %d",
        this.value
    );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
ReadDiagnosticsRequest.prototype.createResponse = function (responseBuffer) {
    "use strict";
    return this.createExceptionOrResponse(
        responseBuffer,
        ReadDiagnosticsResponse
    );
};

/**
 * @returns {number} A starting address.
 */
ReadDiagnosticsRequest.prototype.getValue = function () {
    "use strict";
    return this.value;
};
}).call(this,require("buffer").Buffer)
},{"./ReadDiagnosticsResponse":29,"./Request":46,"./util":65,"buffer":3}],29:[function(require,module,exports){
(function (Buffer){
/*global require, module, ReadDiagnosticsResponse, Buffer*/

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
//function WriteSingleRegisterResponse(address, value)
function ReadDiagnosticsResponse(value) {
    "use strict";
    Response.call(this, 0x08);

  /**
   * An address of the register. A number between 0x0000 and 0xFFFF.
   *
   * @private
   * @type {number}
   */
//  this.address = util.prepareAddress(address);
    this.address = util.prepareAddress(value);

  /**
   * A value of the register. A number between 0 and 65535.
   *
   * @private
   * @type {number}
   */
//  this.value = util.prepareRegisterValue(value);
    this.value = util.prepareRegisterValue(0);
}

//util.inherits(WriteSingleRegisterResponse, Response);
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
//WriteSingleRegisterResponse.fromOptions = function(options)
ReadDiagnosticsResponse.fromOptions = function (options) {
    "use strict";
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
    "use strict";
    util.assertBufferLength(buffer, 5);
    util.assertFunctionCode(buffer[0], 0x08);

    var address = buffer.readUInt16BE(1, true),
        value = buffer.readUInt16BE(3, true);

    return new ReadDiagnosticsResponse(address, value);
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
ReadDiagnosticsResponse.prototype.toBuffer = function () {
    "use strict";
    var buffer = new Buffer(5);

    buffer[0] = 0x08;
    buffer.writeUInt16BE(this.address, 1, true);
    buffer.writeUInt16BE(this.value, 3, true);

    return buffer;
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
ReadDiagnosticsResponse.prototype.toString = function () {
    "use strict";
    return util.format(
        "0x08 (RES) Diaganostics at %d",
        this.value
    );
};

/**
 * @returns {number} A value of the register.
 */
ReadDiagnosticsResponse.prototype.getValue = function () {
    "use strict";
    return this.value;
};
}).call(this,require("buffer").Buffer)
},{"./Response":47,"./util":65,"buffer":3}],30:[function(require,module,exports){
(function (Buffer){
'use strict';

var util = require('./util');
var Request = require('./Request');
var ReadDiscreteInputsResponse = require('./ReadDiscreteInputsResponse');

module.exports = ReadDiscreteInputsRequest;

/**
 * The read discrete inputs request (code 0x02).
 *
 * A binary representation of this request is 5 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - a starting address (2 bytes),
 *   - a quantity of inputs (2 bytes).
 *
 * @constructor
 * @extends {Request}
 * @param {number} address A starting address. Must be between 0 and 0xFFFF.
 * @param {number} quantity A quantity of inputs. Must be between 1 and 2000.
 * @throws {Error} If the `address` is not a number between 0 and 0xFFFF.
 * @throws {Error} If the `quantity` is not a number between 1 and 2000.
 */
function ReadDiscreteInputsRequest(address, quantity)
{
  Request.call(this, 0x02);

  /**
   * A starting address. A number between 0 and 0xFFFF.
   *
   * @private
   * @type {number}
   */
  this.address = util.prepareAddress(address);

  /**
   * A quantity of inputs. A number between 1 and 2000.
   *
   * @private
   * @type {number}
   */
  this.quantity = util.prepareQuantity(quantity, 2000);
}

util.inherits(ReadDiscreteInputsRequest, Request);

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
 *     A quantity of inputs. If specified, must be a number between 1 and 2000.
 *     Defaults to 1.
 *
 * @param {object} options An options object.
 * @param {number} [options.address]
 * @param {number} [options.quantity]
 * @returns {ReadDiscreteInputsRequest} A response created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadDiscreteInputsRequest.fromOptions = function(options)
{
  return new ReadDiscreteInputsRequest(options.address, options.quantity);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {ReadDiscreteInputsRequest} A request created
 * from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
ReadDiscreteInputsRequest.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 5);
  util.assertFunctionCode(buffer[0], 0x02);

  return new ReadDiscreteInputsRequest(
    buffer.readUInt16BE(1, true),
    buffer.readUInt16BE(3, true)
  );
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
ReadDiscreteInputsRequest.prototype.toBuffer = function()
{
  var buffer = new Buffer(5);

  buffer[0] = 0x02;
  buffer.writeUInt16BE(this.address, 1, true);
  buffer.writeUInt16BE(this.quantity, 3, true);

  return buffer;
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
ReadDiscreteInputsRequest.prototype.toString = function()
{
  return util.format(
    "0x02 (REQ) Read %d inputs starting from address %d",
    this.quantity,
    this.address
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
ReadDiscreteInputsRequest.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    ReadDiscreteInputsResponse
  );
};

/**
 * @returns {number} A starting address.
 */
ReadDiscreteInputsRequest.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @returns {number} A quantity of inputs.
 */
ReadDiscreteInputsRequest.prototype.getQuantity = function()
{
  return this.quantity;
};

}).call(this,require("buffer").Buffer)
},{"./ReadDiscreteInputsResponse":31,"./Request":46,"./util":65,"buffer":3}],31:[function(require,module,exports){
'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Response = require('./Response');

module.exports = ReadDiscreteInputsResponse;

/**
 * The read discrete inputs response (code 0x02).
 *
 * A binary representation of the this response varies in length
 * and consists of:
 *
 *   - a function code (1 byte),
 *   - a byte count `N` (1 byte),
 *   - input statuses (`N` bytes).
 *
 * @constructor
 * @extends {Response}
 * @param {Array.<boolean>} states States of the inputs.
 * An array of 1 to 2000 truthy or falsy elements.
 * @throws {Error} If the length of the `statuses` array is not
 * between 1 and 2000.
 */
function ReadDiscreteInputsResponse(states)
{
  Response.call(this, 0x02);

  if (states.length < 1 || states.length > 2000)
  {
    throw new Error(util.format(
      "The length of the `statuses` array must be between 1 and 2000, got %d.",
      states.length
    ));
  }

  /**
   * States of the inputs. An array of 1 to 2000 truthy or falsy elements.
   *
   * @private
   * @type {Array.<boolean>}
   */
  this.states = states;
}

util.inherits(ReadDiscreteInputsResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `states` (array, required) -
 *     An array of input states. Must have between 1 and 2000 elements.
 *
 * @param {object} options An options object.
 * @param {Array.<boolean>} options.states
 * @returns {ReadDiscreteInputsResponse} A response created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadDiscreteInputsResponse.fromOptions = function(options)
{
  return new ReadDiscreteInputsResponse(options.states);
};

/**
 * Creates a new response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this response.
 * @returns {ReadDiscreteInputsResponse} A response created
 * from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this response.
 */
ReadDiscreteInputsResponse.fromBuffer = function(buffer)
{
  util.assertFunctionCode(buffer[0], 0x02);

  return new ReadDiscreteInputsResponse(
    new buffers.BufferReader(buffer).readBits(2, buffer[1] * 8)
  );
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
ReadDiscreteInputsResponse.prototype.toBuffer = function()
{
  return new buffers.BufferBuilder()
    .pushByte(0x02)
    .pushByte(Math.ceil(this.states.length / 8))
    .pushBits(this.states)
    .toBuffer();
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
ReadDiscreteInputsResponse.prototype.toString = function()
{
  return util.format(
    "0x02 (RES) %d discrete inputs:",
    this.states.length,
    this.states.map(Number)
  );
};

/**
 * @returns {Array.<boolean>} States of the inputs.
 */
ReadDiscreteInputsResponse.prototype.getStates = function()
{
  return this.states;
};

/**
 * @returns {number}
 */
ReadDiscreteInputsResponse.prototype.getCount = function()
{
  return this.states.length;
};

/**
 * @param {number} offset
 * @returns {boolean}
 * @throws {Error} If the specified offset is out of bounds.
 */
ReadDiscreteInputsResponse.prototype.isOn = function(offset)
{
  if (offset >= this.states.length || offset < 0)
  {
    throw new Error("Offset out of bounds: " + offset);
  }

  return !!this.states[offset];
};

/**
 * @param {number} offset
 * @returns {boolean}
 * @throws {Error} If the specified offset is out of bounds.
 */
ReadDiscreteInputsResponse.prototype.isOff = function(offset)
{
  if (offset >= this.states.length || offset < 0)
  {
    throw new Error("Offset out of bounds: " + offset);
  }

  return !this.states[offset];
};

},{"./Response":47,"./util":65,"h5.buffers":75}],32:[function(require,module,exports){
'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Request = require('./Request');
var ReadFifo8Response = require('./ReadFifo8Response');

// The code for this message
var theFunctionCode = 0x41;
var maxLimit = 250;

module.exports = ReadFifo8Request;

/**
 * The read FIFO8 request (code 0x41).
 *
 * The response to this request returns bytes pulled (and removed from)
 * from the head of the
 * specified FIFO (circular) buffer in the slave device.
 *
 * The maximum number of bytes to read is limited by the size of
 * the MODBUS packet. If the 'max' parameter is omitted, the response will
 * include as many bytes as possible.  A request with a zero byte max
 * effectively queries the status of the queue without removing any bytes.
 *
 * A binary representation of this request is three bytes in
 * length and consists of:
 *
 *   - a function code (1 byte),
 *   - a FIFO identifier (1 byte),
 *   - Maximum bytes to return
 *
 * @constructor
 * @extends {Request}
 * @param {integer} id Identifies the FIFO to be read
 * @param {integer} max Max number of bytes to be read (optional)
 *
 * @throws {Error} If any of the specified sub-requests are invalid.
 */
function ReadFifo8Request( id, max )
{
  Request.call(this, theFunctionCode);

  if('undefined' == typeof( max )) {
    max = maxLimit;
  }

  this.id = util.prepareNumericOption( id, 0, 0, 255, 'FIFO8 id');
  this.max = util.prepareNumericOption( max, 0, 0, maxLimit, 'Max bytes');

}

util.inherits(ReadFifo8Request, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are:
 *   - id: FIFO to read from
 *   - max: max number of bytes to read
 *
 * @param {object} options An options object.
 * @param {number} [options.id] Identifies the FIFO to be read
 * @param {number} [options.max] Max number of bytes to be read
 *
 * @returns {ReadFifo8Request} A request created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadFifo8Request.fromOptions = function(options)
{
  options.max = options.max || maxLimit;

  return new ReadFifo8Request(options.id, options.max);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {ReadFifo8Request} A request created from its binary
 * representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
ReadFifo8Request.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 3);
  util.assertFunctionCode(buffer[0], theFunctionCode);

  var reader = new buffers.BufferReader(buffer);

  reader.skip(2);

  return new ReadFifo8Request(buffer[1], buffer[2]);
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
ReadFifo8Request.prototype.toBuffer = function()
{
  var builder = new buffers.BufferBuilder();

  builder
    .pushByte(theFunctionCode)
    .pushByte(this.id)
    .pushByte(this.max);

  return builder.toBuffer();
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
ReadFifo8Request.prototype.toString = function()
{
  return util.format(
    "0x41 (REQ) Read up to %d bytes from FIFO %d",
    this.max,
    this.id
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
ReadFifo8Request.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    ReadFifo8Response
  );
};

/**
 * @returns {number} FIFO id
 */
ReadFifo8Request.prototype.getId = function()
{
  return this.id;
};

/**
 * @returns {number} max bytes to read
 */
ReadFifo8Request.prototype.getMax = function()
{
  return this.max;
};
/*jshint unused:false*/


},{"./ReadFifo8Response":33,"./Request":46,"./util":65,"h5.buffers":75}],33:[function(require,module,exports){
(function (Buffer){
'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Response = require('./Response');

module.exports = ReadFifo8Response;

/**
 * The read FIFO8 response (code 0x41).
 *
 * A binary representation of this response varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a FIFO status (1 byte),
 *   - a count of bytes which follow
 *   - values of the registers (`N` bytes).
 *
 * @constructor
 * @extends {Response}
 * @param {number} status A status indicator
 * @param {Buffer} values data bytes
 * @throws {Error} If the length of the `values` buffer is not
 * between 2 and 250.
 */
function ReadFifo8Response(status, values)
{
  Response.call(this, 0x41);

  if (values.length < 0 || values.length > 250)
  {
    throw new Error(util.format(
      "The length of the `values` buffer must be a number "
        + "between 0 and 250, got: %d",
      values.length
    ));

  }

  this.values = values;

  this.status = status;

}

util.inherits(ReadFifo8Response, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `status` (number, required) - FIFO status byte
 *   - `values` (Buffer, required) -
 *     Values of the registers. Must be a buffer of length
 *     between 0 and 250.
 *
 * @param {object} options An options object.
 * @param {number} options.status a status code
 * @param {Buffer} options.values
 * @returns {ReadFifo8Response} A response
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadFifo8Response.fromOptions = function(options)
{
  return new ReadFifo8Response(options.status, options.values);
};

/**
 * Creates a new response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the response.
 * @returns {ReadFifo8Response} A response
 * created from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of the response message.
 */
ReadFifo8Response.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 3);
  util.assertFunctionCode(buffer[0], 0x41);

  var status = {
    more: ( buffer[1] & 0x01) > 0,
    overflow: ( buffer[1] & 0x02) > 0
  };
  var byteCount = buffer[2];
  var values = new Buffer(byteCount);

  buffer.copy(values, 0, 3, byteCount + 3);

  return new ReadFifo8Response(status, values);
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
ReadFifo8Response.prototype.toBuffer = function()
{
  var status = 0;
  if( this.status.more )
    status |= 1;

  if( this.status.overflow )
    status |= 2;

  return new buffers.BufferBuilder()
    .pushByte(0x41)
    .pushByte(status)
    .pushByte(this.values.length)
    .pushBuffer(this.values)
    .toBuffer();
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
ReadFifo8Response.prototype.toString = function()
{
  var status = '';

  if( this.status.more )
    status = status + 'more ';

  if( this.status.overflow )
    status = status + 'overflow';

  return util.format(
    "0x41 (RES) Status: %s, %d bytes: ",
    status,
    this.values.length,
    this.values
  );
};

/**
 * @returns {Buffer} Values of the data values.
 */
ReadFifo8Response.prototype.getValues = function()
{
  return this.values;
};

/**
 * @returns {number} A number of the data values.
 */
ReadFifo8Response.prototype.getCount = function()
{
  return this.values.length;
};

/**
 * @returns {number} Status byte for the buffer
 */
ReadFifo8Response.prototype.getStatus = function()
{
  return this.status;
};
}).call(this,require("buffer").Buffer)
},{"./Response":47,"./util":65,"buffer":3,"h5.buffers":75}],34:[function(require,module,exports){
'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Request = require('./Request');
var ReadFileRecordResponse = require('./ReadFileRecordResponse');

module.exports = ReadFileRecordRequest;

/**
 * The read file record request (code 0x14).
 *
 * A binary representation of this request varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a byte count (1 byte),
 *   - a list of sub-requests, where each sub-request consists of:
 *     - a reference type (1 byte),
 *     - a file number (2 bytes),
 *     - a record number (2 bytes),
 *     - a record length (2 bytes).
 *
 * @constructor
 * @extends {Request}
 * @param {Array.<ReadFileSubRequest>} subRequests An array of sub-requests.
 * @throws {Error} If any of the specified sub-requests are invalid.
 */
function ReadFileRecordRequest(subRequests)
{
  Request.call(this, 0x14);

  /**
   * An array of sub-requests.
   *
   * @private
   * @type {Array.<ReadFileSubRequest>}
   */
  this.subRequests = subRequests.map(function(subRequest)
  {
    subRequest.fileNumber = util.prepareNumericOption(
      subRequest.fileNumber, 1, 0x0001, 0xFFFF, 'File number'
    );
    subRequest.recordNumber = util.prepareNumericOption(
      subRequest.recordNumber, 0, 0x0000, 0x270F, 'Record number'
    );
    subRequest.recordLength = util.prepareNumericOption(
      subRequest.recordLength, 1, 1, 120, 'Record length'
    );

    return subRequest;
  });
}

util.inherits(ReadFileRecordRequest, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are:
 *
 *   - `subRequests` (array, required) -
 *     An array of sub-requests. Sub-request is an object with the following
 *     properties:
 *
 *       - `fileNumber` (number, required) - a file to read.
 *         Must be a number between 0x0001 and 0xFFFF.
 *
 *       - `recordNumber` (number, optional) - a starting record number.
 *         If specified, must be a number between 0x0000 and 0x270F.
 *         Defaults to 0.
 *
 *       - `recordLength` (number, optional) - a number of records to read.
 *         If specified must be a number between 1 and 120.
 *         Defaults to 1.
 *
 * @param {object} options An options object.
 * @param {Array.<ReadFileSubRequest>} options.subRequests
 * @returns {ReadFileRecordRequest} A request created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadFileRecordRequest.fromOptions = function(options)
{
  return new ReadFileRecordRequest(options.subRequests);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {ReadFileRecordRequest} A request created from its binary
 * representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
ReadFileRecordRequest.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 9);
  util.assertFunctionCode(buffer[0], 0x14);

  var reader = new buffers.BufferReader(buffer);

  reader.skip(2);

  var subRequests = [];

  while (reader.length > 0)
  {
    var referenceType = reader.shiftByte();

    if (referenceType !== 6)
    {
      throw new Error(util.format(
        "Invalid reference type. Expected 6, got: %d", referenceType
      ));
    }

    subRequests.push({
      fileNumber: reader.shiftUInt16(),
      recordNumber: reader.shiftUInt16(),
      recordLength: reader.shiftUInt16()
    });
  }

  return new ReadFileRecordRequest(subRequests);
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
ReadFileRecordRequest.prototype.toBuffer = function()
{
  var builder = new buffers.BufferBuilder();
  var subRequestCount = this.subRequests.length;

  builder
    .pushByte(0x14)
    .pushByte(7 * subRequestCount);

  for (var i = 0; i < subRequestCount; ++i)
  {
    var subRequest = this.subRequests[i];

    builder
      .pushByte(6)
      .pushUInt16(subRequest.fileNumber)
      .pushUInt16(subRequest.recordNumber)
      .pushUInt16(subRequest.recordLength);
  }

  return builder.toBuffer();
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
ReadFileRecordRequest.prototype.toString = function()
{
  return util.format(
    "0x14 (REQ) Read %d records from %d files",
    this.subRequests.reduce(function(p, c) { return p + c.recordLength; }, 0),
    this.subRequests.length
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
ReadFileRecordRequest.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    ReadFileRecordResponse
  );
};

/**
 * @returns {Array.<ReadFileSubRequest>} An array of sub-requests.
 */
ReadFileRecordRequest.prototype.getSubRequests = function()
{
  return this.subRequests;
};

/*jshint unused:false*/

/**
 * @typedef {{fileNumber: number, recordNumber: number, recordLength: number}}
 */
var ReadFileSubRequest;

},{"./ReadFileRecordResponse":35,"./Request":46,"./util":65,"h5.buffers":75}],35:[function(require,module,exports){
'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Response = require('./Response');

module.exports = ReadFileRecordResponse;

/**
 * The read input registers response (code 0x14).
 *
 * A binary representation of this response varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a response data length (1 byte),
 *   - a list of sub-responses, where each sub-response consists of:
 *     - a file response length (1 byte),
 *     - a reference type (1 byte),
 *     - a record data (variable number of bytes).
 *
 * @constructor
 * @extends {Response}
 * @param {Array.<Buffer>} subResponses An array of sub-responses.
 */
function ReadFileRecordResponse(subResponses)
{
  Response.call(this, 0x14);

  /**
   * An array of sub-responses.
   *
   * @private
   * @type {Array.<Buffer>}
   */
  this.subResponses = subResponses.map(function(subResponse)
  {
    if (subResponse.length < 2
      || subResponse.length > 240
      || subResponse.length % 2 !== 0)
    {
      throw new Error(util.format(
        "Invalid length of the sub-response. "
          + "Expected an even number between 2 and 240 bytes, got: %d",
        subResponse.length
      ));
    }

    return subResponse;
  });
}

util.inherits(ReadFileRecordResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `subResponses` (array, required) -
 *     An array of record data Buffers.
 *
 * @param {object} options An options object.
 * @param {Array.<Buffer>} options.subResponses
 * @returns {ReadFileRecordResponse} A response created
 * from the specified `options`.
 */
ReadFileRecordResponse.fromOptions = function(options)
{
  return new ReadFileRecordResponse(options.subResponses);
};

/**
 * Creates a response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the response.
 * @returns {ReadFileRecordResponse} Read input
 * registers response.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of the read input registers response.
 */
ReadFileRecordResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 6);
  util.assertFunctionCode(buffer[0], 0x14);

  var reader = new buffers.BufferReader(buffer);

  reader.skip(2);

  var subResponses = [];

  while (reader.length > 0)
  {
    var fileResponseLength = reader.shiftByte();
    var referenceType = reader.shiftByte();

    if (referenceType !== 6)
    {
      throw new Error(util.format(
        "Invalid reference type. Expected 6, got: %d", referenceType
      ));
    }

    subResponses.push(reader.shiftBuffer(fileResponseLength - 1));
  }

  return new ReadFileRecordResponse(subResponses);
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
ReadFileRecordResponse.prototype.toBuffer = function()
{
  var builder = new buffers.BufferBuilder();

  builder.pushByte(0x14);

  var subResponseCount = this.subResponses.length;
  var subResponsesLength = this.getTotalRecordDataLength();

  builder.pushByte(2 * subResponseCount + subResponsesLength);

  for (var i = 0; i < subResponseCount; ++i)
  {
    var subResponse = this.subResponses[i];

    builder
      .pushByte(subResponse.length + 1)
      .pushByte(6)
      .pushBuffer(subResponse);
  }

  return builder.toBuffer();
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
ReadFileRecordResponse.prototype.toString = function()
{
  return util.format(
    "0x14 (RES) %d records from %d files",
    this.getTotalRecordDataLength() / 2,
    this.subResponses.length
  );
};

/**
 * @returns {Buffer} An array of sub-responses.
 */
ReadFileRecordResponse.prototype.getSubResponses = function()
{
  return this.subResponses;
};

/**
 * @returns {number} A total record data byte length of the all sub-responses.
 */
ReadFileRecordResponse.prototype.getTotalRecordDataLength = function()
{
  return this.subResponses.reduce(function(p, c) { return p + c.length; }, 0);
};

},{"./Response":47,"./util":65,"h5.buffers":75}],36:[function(require,module,exports){
(function (Buffer){
'use strict';

var util = require('./util');
var Request = require('./Request');
var ReadHoldingRegistersResponse = require('./ReadHoldingRegistersResponse');

module.exports = ReadHoldingRegistersRequest;

/**
 * The read holding registers request (code 0x03).
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
function ReadHoldingRegistersRequest(address, quantity)
{
  Request.call(this, 0x03);

  /**
   * A starting address. A number between 0 and 0xFFFF.
   *
   * @private
   * @type {number}
   */
  this.address = util.prepareAddress(address);

  /**
   * A quantity of registers. A number between 1 and 125.
   *
   * @private
   * @type {number}
   */
  this.quantity = util.prepareQuantity(quantity, 125);
}

util.inherits(ReadHoldingRegistersRequest, Request);

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
ReadHoldingRegistersRequest.fromOptions = function(options)
{
  return new ReadHoldingRegistersRequest(options.address, options.quantity);
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
ReadHoldingRegistersRequest.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 5);
  util.assertFunctionCode(buffer[0], 0x03);

  return new ReadHoldingRegistersRequest(
    buffer.readUInt16BE(1, true),
    buffer.readUInt16BE(3, true)
  );
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
ReadHoldingRegistersRequest.prototype.toBuffer = function()
{
  var buffer = new Buffer(5);

  buffer[0] = 0x03;
  buffer.writeUInt16BE(this.address, 1, true);
  buffer.writeUInt16BE(this.quantity, 3, true);

  return buffer;
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
ReadHoldingRegistersRequest.prototype.toString = function()
{
  return util.format(
    "0x03 (REQ) Read %d holding registers starting from address %d",
    this.quantity,
    this.address
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
ReadHoldingRegistersRequest.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer, ReadHoldingRegistersResponse
  );
};

/**
 * @returns {number} A starting address.
 */
ReadHoldingRegistersRequest.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @returns {number} A quantity of registers.
 */
ReadHoldingRegistersRequest.prototype.getQuantity = function()
{
  return this.quantity;
};

}).call(this,require("buffer").Buffer)
},{"./ReadHoldingRegistersResponse":37,"./Request":46,"./util":65,"buffer":3}],37:[function(require,module,exports){
(function (Buffer){
'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Response = require('./Response');

module.exports = ReadHoldingRegistersResponse;

/**
 * The read holding registers response (code 0x03).
 *
 * A binary representation of this response varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a byte count `N` (1 byte),
 *   - values of the registers (`N` bytes).
 *
 * @constructor
 * @extends {Response}
 * @param {Buffer} values Values of the registers.
 * A buffer of even length between 2 and 250.
 * @throws {Error} If the length of the `values` buffer is not
 * between 2 and 250.
 */
function ReadHoldingRegistersResponse(values)
{
  Response.call(this, 0x03);

  if (values.length % 2 !== 0 || values.length < 2 || values.length > 250)
  {
    throw new Error(util.format(
      "The length of the `values` buffer must be an even number "
        + "between 2 and 250, got: %d",
      values.length
    ));
  }

  /**
   * Values of the registers. A buffer of even length between 2 and 250.
   *
   * @private
   * @type {Buffer}
   */
  this.values = values;
}

util.inherits(ReadHoldingRegistersResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `values` (Buffer, required) -
 *     Values of the registers. Must be a buffer of even length
 *     between 2 and 250.
 *
 * @param {object} options An options object.
 * @param {Buffer} options.values
 * @returns {ReadHoldingRegistersResponse} A response
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadHoldingRegistersResponse.fromOptions = function(options)
{
  return new ReadHoldingRegistersResponse(options.values);
};

/**
 * Creates a new response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the response.
 * @returns {ReadHoldingRegistersResponse} A response
 * created from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of the read holding registers response.
 */
ReadHoldingRegistersResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 4);
  util.assertFunctionCode(buffer[0], 0x03);

  var byteCount = buffer[1];
  var values = new Buffer(byteCount);

  buffer.copy(values, 0, 2, byteCount + 2);

  return new ReadHoldingRegistersResponse(values);
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
ReadHoldingRegistersResponse.prototype.toBuffer = function()
{
  return new buffers.BufferBuilder()
    .pushByte(0x03)
    .pushByte(this.values.length)
    .pushBuffer(this.values)
    .toBuffer();
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
ReadHoldingRegistersResponse.prototype.toString = function()
{
  return util.format(
    "0x03 (RES) %d holding registers:",
    this.values.length / 2,
    this.values
  );
};

/**
 * @returns {Buffer} Values of the registers.
 */
ReadHoldingRegistersResponse.prototype.getValues = function()
{
  return this.values;
};

/**
 * @returns {number} A number of the register values.
 */
ReadHoldingRegistersResponse.prototype.getCount = function()
{
  return this.values.length / 2;
};

}).call(this,require("buffer").Buffer)
},{"./Response":47,"./util":65,"buffer":3,"h5.buffers":75}],38:[function(require,module,exports){
(function (Buffer){
'use strict';

var util = require('./util');
var Request = require('./Request');
var ReadInputRegistersResponse = require('./ReadInputRegistersResponse');

module.exports = ReadInputRegistersRequest;

/**
 * The read input registers request (code 0x04).
 *
 * A binary representation of this request is 5 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - a starting address (2 bytes),
 *   - a quantity of registers (2 bytes).
 *
 * @constructor
 * @extends {Request}
 * @param {number} address A starting address.
 * Must be between 0x0000 and 0xFFFF.
 * @param {number} quantity A quantity of input registers.
 * Must be between 1 and 125.
 * @throws {Error} If the `address` is not a number between 0x0000 and 0xFFFF.
 * @throws {Error} If the `quantity` is not a number between 1 and 125.
 */
function ReadInputRegistersRequest(address, quantity)
{
  Request.call(this, 0x04);

  /**
   * A starting address. A number between 0x0000 and 0xFFFF.
   *
   * @private
   * @type {number}
   */
  this.address = util.prepareAddress(address);

  /**
   * A quantity of input registers. A number between 1 and 125.
   *
   * @private
   * @type {number}
   */
  this.quantity = util.prepareQuantity(quantity, 125);
}

util.inherits(ReadInputRegistersRequest, Request);

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
 *     A quantity of inputs. If specified, must be a number between 1 and 125.
 *     Defaults to 1.
 *
 * @param {object} options An options object.
 * @param {number} [options.address]
 * @param {number} [options.quantity]
 * @returns {ReadInputRegistersRequest} A request created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadInputRegistersRequest.fromOptions = function(options)
{
  return new ReadInputRegistersRequest(options.address, options.quantity);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {ReadInputRegistersRequest} A request created
 * from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
ReadInputRegistersRequest.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 5);
  util.assertFunctionCode(buffer[0], 0x04);

  return new ReadInputRegistersRequest(
    buffer.readUInt16BE(1, true),
    buffer.readUInt16BE(3, true)
  );
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
ReadInputRegistersRequest.prototype.toBuffer = function()
{
  var buffer = new Buffer(5);

  buffer[0] = 0x04;
  buffer.writeUInt16BE(this.address, 1, true);
  buffer.writeUInt16BE(this.quantity, 3, true);

  return buffer;
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
ReadInputRegistersRequest.prototype.toString = function()
{
  return util.format(
    "0x04 (REQ) Read %d input registers starting from address %d",
    this.quantity,
    this.address
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
ReadInputRegistersRequest.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    ReadInputRegistersResponse
  );
};

/**
 * @returns {number} A starting address.
 */
ReadInputRegistersRequest.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @returns {number} A quantity of input registers.
 */
ReadInputRegistersRequest.prototype.getQuantity = function()
{
  return this.quantity;
};

}).call(this,require("buffer").Buffer)
},{"./ReadInputRegistersResponse":39,"./Request":46,"./util":65,"buffer":3}],39:[function(require,module,exports){
(function (Buffer){
'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Response = require('./Response');

module.exports = ReadInputRegistersResponse;

/**
 * The read input registers response (code 0x04).
 *
 * A binary representation of this response varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a byte count (`N`; 1 byte),
 *   - values of the registers (`N` bytes).
 *
 * @constructor
 * @extends {Response}
 * @param {Buffer} values Values of the registers. A buffer of even length
 * between 2 and 250.
 * @throws {Error} If the `values` is not a Buffer of even length
 * between 2 and 250.
 */
function ReadInputRegistersResponse(values)
{
  Response.call(this, 0x04);

  if (values.length % 2 !== 0 || values.length < 2 || values.length > 250)
  {
    throw new Error(util.format(
      "The length of the `values` Buffer must be an even number " +
        "between 2 and 250, got '%d'",
      values.length
    ));
  }

  /**
   * Values of the registers. A buffer of even length between 2 and 250.
   *
   * @private
   * @type {Buffer}
   */
  this.values = values;
}

util.inherits(ReadInputRegistersResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `values` (Buffer, required) -
 *     Values of the registers. Must be a buffer of even length
 *     between 2 and 250.
 *
 * @param {object} options An options object.
 * @returns {ReadInputRegistersResponse} A response created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadInputRegistersResponse.fromOptions = function(options)
{
  return new ReadInputRegistersResponse(options.values);
};

/**
 * Creates a response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the response.
 * @returns {ReadInputRegistersResponse} Read input
 * registers response.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of the read input registers response.
 */
ReadInputRegistersResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 4);
  util.assertFunctionCode(buffer[0], 0x04);

  var byteCount = buffer[1];
  var values = new Buffer(byteCount);

  buffer.copy(values, 0, 2, byteCount + 2);

  return new ReadInputRegistersResponse(values);
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
ReadInputRegistersResponse.prototype.toBuffer = function()
{
  return new buffers.BufferBuilder()
    .pushByte(0x04)
    .pushByte(this.values.length)
    .pushBuffer(this.values)
    .toBuffer();
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
ReadInputRegistersResponse.prototype.toString = function()
{
  return util.format(
    "0x04 (RES) %d input registers:",
    this.values.length / 2,
    this.values
  );
};

/**
 * @returns {Buffer} Values of the registers.
 */
ReadInputRegistersResponse.prototype.getValues = function()
{
  return this.values;
};

/**
 * @returns {number} A number of the register values.
 */
ReadInputRegistersResponse.prototype.getCount = function()
{
  return this.values.length / 2;
};

}).call(this,require("buffer").Buffer)
},{"./Response":47,"./util":65,"buffer":3,"h5.buffers":75}],40:[function(require,module,exports){
(function (Buffer){
'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Request = require('./Request');
var ReadMemoryResponse = require('./ReadMemoryResponse');

module.exports = ReadMemoryRequest;

/**
 * The read memory request (code 0x45).
 *
 * The response to this request returns a set of bytes
 * read from the slave device.
 *
 * A binary representation of this request is 4 bytes in
 * length and consists of:
 *
 *   - a function code (1 byte),
 *   - start address (2 bytes)
 *   - count of bytes to read (1 byte),
 *
 * @constructor
 * @extends {Request}
 * @param {integer} [address] starting address for read operation
 * @param {integer} [count] number of bytes to read
 *
 *
 * @throws {Error} If any of the specified sub-requests are invalid.
 */
function ReadMemoryRequest( address, count )
{
  Request.call(this, 0x45);

  this.address = util.prepareAddress( address );
  this.count = util.prepareNumericOption( count, 250, 1, 250, 'Count');

}

util.inherits(ReadMemoryRequest, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are as follows:
 *
 * @param {object} options An options object.
 * @param {number} [options.address] starting address for read operation
 * @param {number} [options.count] number of bytes to read
 *
 * @returns {ReadMemoryRequest} A request created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadMemoryRequest.fromOptions = function(options)
{
  return new ReadMemoryRequest( options.address, options.count );
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {ReadMemoryRequest} A request created from its binary
 * representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
ReadMemoryRequest.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 4);
  util.assertFunctionCode(buffer[0], 0x45);

  //var reader = new buffers.BufferReader(buffer);

  //reader.skip(2);

  return new ReadMemoryRequest(
    buffer.readUInt16BE(1, true),
    buffer[3]
    );
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
ReadMemoryRequest.prototype.toBuffer = function()
{
  var buffer = new Buffer(4);

  buffer[0] = 0x45;
  buffer.writeUInt16BE(this.address, 1, true);
  buffer[3] = this.count; 

  return buffer;
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
ReadMemoryRequest.prototype.toString = function()
{
  return util.format(
    "0x45 (REQ) Read Memory address %d, count %d",
    this.address, this.count
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
ReadMemoryRequest.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    ReadMemoryResponse
  );
};


/**
 * @returns {number} memory address
 */
ReadMemoryRequest.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @returns {number} memory count
 */
ReadMemoryRequest.prototype.getCount = function()
{
  return this.count;
};

/*jshint unused:false*/


}).call(this,require("buffer").Buffer)
},{"./ReadMemoryResponse":41,"./Request":46,"./util":65,"buffer":3,"h5.buffers":75}],41:[function(require,module,exports){
(function (Buffer){
'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Response = require('./Response');

module.exports = ReadMemoryResponse;

/**
 * The read memory response (code 0x45).
 *
 * A binary representation of this response varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - memory data (`N` bytes).
 *
 * @constructor
 * @extends {Response}
 * @param {Buffer} values bytes containing the object
 * @throws {Error} If the length of the `values` buffer is not
 * acceptable.
 */
function ReadMemoryResponse( values )
{
  Response.call(this, 0x45);

  if (values.length < 0 || values.length > 250)
  {
    throw new Error(util.format(
      "The length of the `values` buffer must be a number "
        + "between 0 and 250, got: %d",
      values.length
    ));
  }

  this.values = values;
}

util.inherits(ReadMemoryResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `values` (Buffer, required) -
 *     Values of the registers. Must be a buffer of length
 *     between 0 and 250.
 *
 * @param {object} options An options object.
 * @param {number} options.status a status code
 * @param {Buffer} options.values
 * @returns {ReadMemoryResponse} A response
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadMemoryResponse.fromOptions = function(options)
{
  return new ReadMemoryResponse(options.values);
};

/**
 * Creates a new response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the response.
 * @returns {ReadMemoryResponse} A response
 * created from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of the response message.
 */
ReadMemoryResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 2);
  util.assertFunctionCode(buffer[0], 0x45);

  var byteCount = buffer.length -1;
  var values = new Buffer( byteCount );

  buffer.copy(values, 0, 1, byteCount+1);

  return new ReadMemoryResponse(values);
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
ReadMemoryResponse.prototype.toBuffer = function()
{
  return new buffers.BufferBuilder()
    .pushByte(0x45)
    .pushBuffer(this.values)
    .toBuffer();
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
ReadMemoryResponse.prototype.toString = function()
{
  return util.format(
    "0x45 (RES) %d bytes: ",
    this.values.length,
    this.values
  );
};

/**
 * @returns {Buffer} Values of the data values.
 */
ReadMemoryResponse.prototype.getValues = function()
{
  return this.values;
};

/**
 * @returns {number} A number of the data values.
 */
ReadMemoryResponse.prototype.getCount = function()
{
  return this.values.length;
};

}).call(this,require("buffer").Buffer)
},{"./Response":47,"./util":65,"buffer":3,"h5.buffers":75}],42:[function(require,module,exports){
'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Request = require('./Request');
var ReadObjectResponse = require('./ReadObjectResponse');

// The code for this message
var theFunctionCode = 0x43;

module.exports = ReadObjectRequest;

/**
 * The read Object request (code 0x43).
 *
 * The response to this request returns a binary object
 * read from the slave device.
 *
 * A binary representation of this request is two bytes in
 * length and consists of:
 *
 *   - a function code (1 byte),
 *   - an object identifier (1 byte),
 *
 * @constructor
 * @extends {Request}
 * @param {integer} id Identifies the FIFO to be read
 *
 * @throws {Error} If any of the specified sub-requests are invalid.
 */
function ReadObjectRequest( id )
{
  Request.call(this, theFunctionCode);

  this.id = util.prepareNumericOption( id, 0, 0, 255, 'Object id');
}

util.inherits(ReadObjectRequest, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are:
 *   - id: object to read from
 *
 * @param {object} options An options object.
 * @param {number} [options.id] Identifies the object to be read
 *
 * @returns {ReadObjectRequest} A request created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadObjectRequest.fromOptions = function(options)
{
  return new ReadObjectRequest(options.id);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {ReadObjectRequest} A request created from its binary
 * representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
ReadObjectRequest.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 2);
  util.assertFunctionCode(buffer[0], theFunctionCode);

  var reader = new buffers.BufferReader(buffer);

  reader.skip(2);

  return new ReadObjectRequest(buffer[1]);
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
ReadObjectRequest.prototype.toBuffer = function()
{
  var builder = new buffers.BufferBuilder();

  builder
    .pushByte(theFunctionCode)
    .pushByte(this.id);

  return builder.toBuffer();
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
ReadObjectRequest.prototype.toString = function()
{
  return util.format(
    "0x43 (REQ) Read Object %d",
    this.id
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
ReadObjectRequest.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    ReadObjectResponse
  );
};

/**
 * @returns {number} Object id
 */
ReadObjectRequest.prototype.getId = function()
{
  return this.id;
};


/*jshint unused:false*/


},{"./ReadObjectResponse":43,"./Request":46,"./util":65,"h5.buffers":75}],43:[function(require,module,exports){
(function (Buffer){
'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Response = require('./Response');

module.exports = ReadObjectResponse;

/**
 * The read holding registers response (code 0x43).
 *
 * A binary representation of this response varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a count of bytes which follow
 *   - object data (`N` bytes).
 *
 * @constructor
 * @extends {Response}
 * @param {Buffer} values bytes containing the object
 * @throws {Error} If the length of the `values` buffer is not
 * acceptable.
 */
function ReadObjectResponse( values )
{
  Response.call(this, 0x43);

  if (values.length < 0 || values.length > 250)
  {
    throw new Error(util.format(
      "The length of the `values` buffer must be a number "
        + "between 0 and 250, got: %d",
      values.length
    ));
  }

  /**
   * Values of the registers. A buffer of even length between 2 and 250.
   *
   * @private
   * @type {Buffer}
   */
  this.values = values;
}

util.inherits(ReadObjectResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `values` (Buffer, required) -
 *     Values of the registers. Must be a buffer of length
 *     between 0 and 250.
 *
 * @param {object} options An options object.
 * @param {number} options.status a status code
 * @param {Buffer} options.values
 * @returns {ReadObjectResponse} A response
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadObjectResponse.fromOptions = function(options)
{
  return new ReadObjectResponse(options.values);
};

/**
 * Creates a new response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the response.
 * @returns {ReadObjectResponse} A response
 * created from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of the response message.
 */
ReadObjectResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 2);
  util.assertFunctionCode(buffer[0], 0x43);

  var byteCount = buffer[1];
  var values = new Buffer(byteCount);

  buffer.copy(values, 0, 2, byteCount + 2);

  return new ReadObjectResponse(values);
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
ReadObjectResponse.prototype.toBuffer = function()
{
  return new buffers.BufferBuilder()
    .pushByte(0x43)
    .pushByte(this.values.length)
    .pushBuffer(this.values)
    .toBuffer();
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
ReadObjectResponse.prototype.toString = function()
{
  return util.format(
    "0x43 (RES) %d bytes: ",
    this.values.length,
    this.values
  );
};

/**
 * @returns {Buffer} Values of the data values.
 */
ReadObjectResponse.prototype.getValues = function()
{
  return this.values;
};

/**
 * @returns {number} A number of the data values.
 */
ReadObjectResponse.prototype.getCount = function()
{
  return this.values.length;
};

}).call(this,require("buffer").Buffer)
},{"./Response":47,"./util":65,"buffer":3,"h5.buffers":75}],44:[function(require,module,exports){
(function (Buffer){
'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Request = require('./Request');
var ReportSlaveIdResponse = require('./ReportSlaveIdResponse');

module.exports = ReportSlaveIdRequest;

/**
 * The Report Slave ID request (code 0x11).
 *
 * A binary representation of this request is 1 byte long and consists of:
 *
 *   - a function code (1 byte),
 *
 * @constructor
 * @extends {Request}
 * @throws {Error} If any of the specified sub-requests are invalid.
 */
function ReportSlaveIdRequest()
{
  Request.call(this, 0x11);

}

util.inherits(ReportSlaveIdRequest, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are:
 *
 *
 * @param {object} options An options object.
 * @returns {ReportSlaveIdRequest} A request created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReportSlaveIdRequest.fromOptions = function(options)
{
  return new ReportSlaveIdRequest(options);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {ReportSlaveIdRequest} A request created from its binary
 * representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
ReportSlaveIdRequest.fromBuffer = function(buffer)
{
  if( buffer.length !== 1)
  {
    throw new Error(util.format(
      "The specified buffer must be at 1 bytes long, was %d.", buffer.length
    ));
  }
  util.assertFunctionCode(buffer[0], 0x11);

  return new ReportSlaveIdRequest();
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
ReportSlaveIdRequest.prototype.toBuffer = function()
{
  var buffer = new Buffer([0x11]);

  return buffer;
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
ReportSlaveIdRequest.prototype.toString = function()
{
  return util.format(
    '0x11 (REQ) Report Slave ID' );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
ReportSlaveIdRequest.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    ReportSlaveIdResponse
  );
};


/*jshint unused:false*/


}).call(this,require("buffer").Buffer)
},{"./ReportSlaveIdResponse":45,"./Request":46,"./util":65,"buffer":3,"h5.buffers":75}],45:[function(require,module,exports){
(function (Buffer){
'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Response = require('./Response');

module.exports = ReportSlaveIdResponse;

/**
 * The Slave ID response (code 0x11).
 *
 * A binary representation of this response is fixed length and consists of:
 *
 *   - a function code (1 byte),
 *   - a byte count `N` (1 byte),
 *   - a product ID (1 byte).
 *   - A run indicator (1 byte)
 *   - Software version (3 bytes)
 *   - optional additional data values (n bytes)
 *
 * @constructor
 * @extends {Response}
 * @param {byte} product Product ID
 * @param {byte} run The device's run indicator
 * @param {string} Software version (x.y.z) where x,y,and z are 0-255 inclusive
 * @param {buffer} Additional data bytes
 * @throws {Error} If the parameters are not valid
 */
function ReportSlaveIdResponse(product, run, version, values )
{
  Response.call(this, 0x11);

  if( product < 0 || product > 255 )
  {
    throw new Error(util.format(
      "Invalid Product ID, got: %d",
      product
    ));
  }

  if( run < 0 || run > 255 )
  {
    throw new Error(util.format(
      "Invalid Run Indicator, got: %d",
      run
    ));
  }

  var token = version.split('.');

  if( token.length !== 3 )
  {
    throw new Error(util.format(
      "Invalid Version, got: %s",
      version
    ));
  }

  /**
   * Values of the registers. A buffer of even length between 2 and 250.
   *
   * @private
   * @type {Buffer}
   */
  this.product = product;
  this.run = run;
  this.version = [
    parseInt(token[0],10),
    parseInt(token[1],10),
    parseInt(token[2],10)
    ];

  this.values = values || new Buffer(0);

}

util.inherits(ReportSlaveIdResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `product` (byte, required)
 *   - `run` (byte, required)
 *   - `version` (string, required)
 *   - `values` (buffer, optional)
 *
 * @param {object} options An options object.
 * @param {integer} options.product
 * @param {run} options.run
 * @param {version} options.version
 * @param {values} options.values
 * @returns {ReportSlaveIdResponse} A response
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReportSlaveIdResponse.fromOptions = function(options)
{
  options.values = options.values || new Buffer(0);

  return new ReportSlaveIdResponse(
    options.product,
    options.run,
    options.version);
};

/**
 * Creates a new response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the response.
 * @returns {ReportSlaveIdResponse} A response
 * created from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of the read holding registers response.
 */
ReportSlaveIdResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 7);
  util.assertFunctionCode(buffer[0], 0x11);

  //var byteCount = buffer[1];
  var version = util.format(
    "%d.%d.%d",
    buffer[4],
    buffer[5],
    buffer[6]
    );

  var numValues = buffer.length - 7;
  var values = new Buffer( numValues );
  if( numValues > 0 ) {
    buffer.copy( values, 0, 7);
  }
  return new ReportSlaveIdResponse(buffer[2], buffer[3], version, values );
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
ReportSlaveIdResponse.prototype.toBuffer = function()
{
  return new buffers.BufferBuilder()
    .pushByte(0x11)
    .pushByte(this.product)
    .pushByte(this.run)
    .pushByte(this.version[0])
    .pushByte(this.version[1])
    .pushByte(this.version[2])
    .pushBuffer(this.values)
    .toBuffer();
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
ReportSlaveIdResponse.prototype.toString = function()
{
  var serial = '';

  if( 4 === this.values.length ) {
    serial = this.values.readUInt32BE(0).toString(10);
  }

  return util.format(
    "0x11 (RES) Prod: %d, Run: %d, Ver: %s Serial: %s",
    this.product,
    this.run,
    this.getVersion(),
    serial
  );
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
ReportSlaveIdResponse.prototype.getVersion = function()
{
  return util.format(
    "%d.%d.%d",
    this.version[0],
    this.version[1],
    this.version[2]
    );
};

/**
 * Returns the values buffer
 *
 * @returns {buffer} data values
 */
ReportSlaveIdResponse.prototype.getValues = function()
{
  return this.values;
};
}).call(this,require("buffer").Buffer)
},{"./Response":47,"./util":65,"buffer":3,"h5.buffers":75}],46:[function(require,module,exports){
/*jshint unused:false*/

'use strict';

var inherits = require('util').inherits;
var ModbusFunction = require('../ModbusFunction');
var ExceptionResponse = require('./ExceptionResponse');

module.exports = Request;

/**
 * @constructor
 * @extends {ModbusFunction}
 * @param {number} code
 */
function Request(code)
{
  ModbusFunction.call(this, code);
}

inherits(Request, ModbusFunction);

/**
 * @param {object} options
 * @param {number} options.code
 * @returns {Request}
 */
Request.fromOptions = function(options)
{
  var functions = require('./index');

  if (!functions.hasOwnProperty(options.code))
  {
    throw new Error("Unknown request for function code: " + options.code);
  }

  return functions[options.code].fromOptions(options);
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 */
Request.prototype.createResponse = function(responseBuffer)
{
  throw new Error("Abstract method must be overridden by the child class!");
};

/**
 * @protected
 * @param {Buffer} responseBuffer
 * @param {function(new:functions.Response)} Response
 * @returns {Response}
 */
Request.prototype.createExceptionOrResponse = function(responseBuffer, Response)
{
  if (responseBuffer[0] > 0x80)
  {
    return ExceptionResponse.fromBuffer(responseBuffer);
  }

  return Response.fromBuffer(responseBuffer);
};

},{"../ModbusFunction":12,"./ExceptionResponse":25,"./index":64,"util":9}],47:[function(require,module,exports){
'use strict';

var inherits = require('util').inherits;
var ModbusFunction = require('../ModbusFunction');

module.exports = Response;

/**
 * @constructor
 * @extends {ModbusFunction}
 * @param {number} code
 */
function Response(code)
{
  ModbusFunction.call(this, code);
}

inherits(Response, ModbusFunction);

/**
 * @returns {boolean}
 */
Response.prototype.isException = function()
{
  return false;
};

},{"../ModbusFunction":12,"util":9}],48:[function(require,module,exports){
(function (Buffer){
'use strict';

var util = require('./util');
var Request = require('./Request');
var WriteFifo8Response =
  require('./WriteFifo8Response');

module.exports = WriteFifo8Request;

/**
 * The write 8-bit FIFO request (code 0x42).
 *
 * A binary representation of this request varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a FIFO Id (1 byte),
 *   - a byte count (`N`; 1 byte),
 *   - values to be written (`N` bytes).
 *
 * @constructor
 * @extends {Request}
 * @param {number} id the FIFO ID
 * @param {Buffer} values Values to be written to the FIFO
 * @throws {Error} If the `id` is not a number between 0 and 0xFF.
 * @throws {Error} If the `values` is not between 1 and 250 bytes
 */
function WriteFifo8Request(id, values)
{
  Request.call(this, 0x42);

  if( values.length < 1 || values.length > 250)
  {
    throw new Error(util.format(
      "The length of the `values` Buffer must be  "
        + "between 1 and 250, got: %d",
      values.length
    ));
  }

  /**
   * A starting address. A number between 0 and 0xFFFF.
   *
   * @private
   * @type {number}
   */
  this.id = util.prepareNumericOption(id, 0, 0, 255, 'id');

  /**
   * Values of the registers. A buffer of length between 1 and 250.
   *
   * @private
   * @type {Buffer}
   */
  this.values = values;
}

util.inherits(WriteFifo8Request, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are:
 *
 *   - `id` (number, optional) -
 *     The object ID. If specified, must be a number between 0 and 0xFF.
 *     Defaults to 0.
 *
 *   - `values` (Buffer, required) -
 *     Values of the registers. Must be a buffer of length
 *     between 1 and 250.
 *
 * @param {object} options An options object.
 * @param {number} [options.id]
 * @param {Buffer} options.values
 * @returns {WriteFifo8Request} A request
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteFifo8Request.fromOptions = function(options)
{
  return new WriteFifo8Request(options.id, options.values);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {WriteFifo8Request} A request
 * created from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
WriteFifo8Request.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 4);
  util.assertFunctionCode(buffer[0], 0x42);

  var id = buffer[1];
  var byteCount = buffer[2];
  var values = new Buffer(byteCount);

  buffer.copy(values, 0, 3, 3 + byteCount);

  return new WriteFifo8Request(id, values);
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
WriteFifo8Request.prototype.toBuffer = function()
{
  var buffer = new Buffer(3 + this.values.length);

  buffer[0] = 0x42;
  buffer[1] = this.id;
  buffer[2] = this.values.length;
  this.values.copy(buffer, 3);

  return buffer;
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
WriteFifo8Request.prototype.toString = function()
{
  return util.format(
    "0x42 (REQ) Write %d bytes to FIFO %d :",
    this.values.length,
    this.id,
    this.values
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
WriteFifo8Request.prototype.createResponse =
  function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    WriteFifo8Response
  );
};

/**
 * @returns {number} The FIFO ID.
 */
WriteFifo8Request.prototype.getId = function()
{
  return this.id;
};

/**
 * @returns {Buffer} Values of the registers
 */
WriteFifo8Request.prototype.getValues = function()
{
  return this.values;
};

}).call(this,require("buffer").Buffer)
},{"./Request":46,"./WriteFifo8Response":49,"./util":65,"buffer":3}],49:[function(require,module,exports){
(function (Buffer){
'use strict';

var util = require('./util');
var Response = require('./Response');

module.exports = WriteFifo8Response;

/**
 * The write 8-bit FIFO response (code 0x42).
 *
 * A binary representation of this response is 2 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - a quantity of bytes (1 byte),
 *
 * @constructor
 * @extends {Response}
 * @param {number} quantity A quantity of bytes written.
 * @throws {Error} If the `quantity` is not a number between 0 and 250.
 */
function WriteFifo8Response(quantity)
{
  Response.call(this, 0x42);

  /**
   * A quantity of bytes written
   *
   * @private
   * @type {number}
   */
  this.quantity = util.prepareNumericOption(quantity, 0, 0, 250, 'Quantity');
}

util.inherits(WriteFifo8Response, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `quantity` (number) -
 *     A quantity of bytes written.
 *
 * @param {object} options An options object.
 * @param {number} [options.quantity]
 * @returns {WriteFifo8Response} A response
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteFifo8Response.fromOptions = function(options)
{
  return new WriteFifo8Response(options.quantity);
};

/**
 * Creates a response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the response.
 * @returns {WriteFifo8Response} Read input
 * registers response.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of the read input registers response.
 */
WriteFifo8Response.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 2);
  util.assertFunctionCode(buffer[0], 0x42);

  return new WriteFifo8Response( buffer[1] );
};

/**
 * Returns a binary representation of the read input registers response.
 *
 * @returns {Buffer} A binary representation of the response.
 */
WriteFifo8Response.prototype.toBuffer = function()
{
  var buffer = new Buffer(2);

  buffer[0] = 0x42;
  buffer[1] = this.quantity;

  return buffer;
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
WriteFifo8Response.prototype.toString = function()
{
  return util.format(
    "0x42 (RES) Wrote %d bytes",
    this.quantity
  );
};

/**
 * @returns {number} A quantity of bytes written.
 */
WriteFifo8Response.prototype.getQuantity = function()
{
  return this.quantity;
};

}).call(this,require("buffer").Buffer)
},{"./Response":47,"./util":65,"buffer":3}],50:[function(require,module,exports){
'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Request = require('./Request');
var WriteFileRecordResponse = require('./WriteFileRecordResponse');

module.exports = WriteFileRecordRequest;

/**
 * The write file record request (code 0x15).
 *
 * A binary representation of this request varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a request data length (1 byte),
 *   - a list of sub-requests, where each sub-request consists of:
 *     - a reference type (1 byte),
 *     - a file number (2 bytes),
 *     - a record number (2 bytes),
 *     - a record length (`N`; 2 bytes),
 *     - a record data (`N` bytes).
 *
 * @constructor
 * @extends {Request}
 * @param {Array.<WriteFileSubRequest>} subRequests An array of sub-requests.
 * @throws {Error} If any of the specified sub-requests are invalid.
 */
function WriteFileRecordRequest(subRequests)
{
  Request.call(this, 0x15);

  /**
   * An array of sub-requests.
   *
   * @private
   * @type {Array.<WriteFileSubRequest>}
   */
  this.subRequests = subRequests.map(function(subRequest)
  {
    subRequest.fileNumber = util.prepareNumericOption(
      subRequest.fileNumber, 1, 0x0001, 0xFFFF, 'File number'
    );
    subRequest.recordNumber = util.prepareNumericOption(
      subRequest.recordNumber, 0, 0x0000, 0x270F, 'Record number'
    );

    var recordDataLength = subRequest.recordData.length;

    if (recordDataLength === 0
      || recordDataLength > 240
      || recordDataLength % 2 !== 0)
    {
      throw new Error(util.format(
        "Invalid record data length. "
          + "Expected an even number of bytes between 2 and 240, got: %d",
        recordDataLength
      ));
    }

    return subRequest;
  });
}

util.inherits(WriteFileRecordRequest, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are:
 *
 *   - `subRequests` (array, required) -
 *     An array of sub-requests. Sub-request is an object with the following
 *     properties:
 *
 *       - `fileNumber` (number, required) - a file to read.
 *         Must be a number between 0x0001 and 0xFFFF.
 *
 *       - `recordNumber` (number, optional) - a starting record number.
 *         If specified, must be a number between 0x0000 and 0x270F.
 *         Defaults to 0.
 *
 *       - `recordData` (Buffer, required) - a record data to write.
 *         Must be of an even length between 2 and 240 bytes.
 *
 * @param {object} options An options object.
 * @param {Array.<WriteFileSubRequest>} options.subRequests
 * @returns {WriteFileRecordRequest} A request created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteFileRecordRequest.fromOptions = function(options)
{
  return new WriteFileRecordRequest(options.subRequests);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {WriteFileRecordRequest} A request created from its binary
 * representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
WriteFileRecordRequest.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 11);
  util.assertFunctionCode(buffer[0], 0x15);

  var reader = new buffers.BufferReader(buffer);

  reader.skip(2);

  var subRequests = [];

  while (reader.length > 0)
  {
    var referenceType = reader.shiftByte();

    if (referenceType !== 6)
    {
      throw new Error(util.format(
        "Invalid reference type. Expected 6, got: %d", referenceType
      ));
    }

    subRequests.push({
      fileNumber: reader.shiftUInt16(),
      recordNumber: reader.shiftUInt16(),
      recordData: reader.shiftBuffer(reader.shiftUInt16() * 2)
    });
  }

  return new WriteFileRecordRequest(subRequests);
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
WriteFileRecordRequest.prototype.toBuffer = function()
{
  var builder = new buffers.BufferBuilder();
  var subRequestCount = this.subRequests.length;

  builder
    .pushByte(0x15)
    .pushByte(7 * subRequestCount + this.getTotalRecordDataLength());

  for (var i = 0; i < subRequestCount; ++i)
  {
    var subRequest = this.subRequests[i];

    builder
      .pushByte(6)
      .pushUInt16(subRequest.fileNumber)
      .pushUInt16(subRequest.recordNumber)
      .pushUInt16(subRequest.recordData.length / 2)
      .pushBuffer(subRequest.recordData);
  }

  return builder.toBuffer();
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
WriteFileRecordRequest.prototype.toString = function()
{
  return util.format(
    "0x15 (REQ) Write %d records to %d files",
    this.getTotalRecordDataLength() / 2,
    this.subRequests.length
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
WriteFileRecordRequest.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    WriteFileRecordResponse
  );
};

/**
 * @returns {Array.<WriteFileSubRequest>} An array of sub-requests.
 */
WriteFileRecordRequest.prototype.getSubRequests = function()
{
  return this.subRequests;
};

/**
 * @returns {number} A total record data byte length of the all sub-requests.
 */
WriteFileRecordRequest.prototype.getTotalRecordDataLength = function()
{
  return this.subRequests.reduce(
    function(p, c) { return p + c.recordData.length; },
    0
  );
};

/*jshint unused:false*/

/**
 * @typedef {{fileNumber: number, recordNumber: number, recordData: Buffer}}
 */
var WriteFileSubRequest;

},{"./Request":46,"./WriteFileRecordResponse":51,"./util":65,"h5.buffers":75}],51:[function(require,module,exports){
'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Response = require('./Response');

module.exports = WriteFileRecordResponse;

/**
 * The write file record response (code 0x15).
 *
 * A binary representation of this response varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a response data length (1 byte),
 *   - a list of sub-responses, where each sub-response consists of:
 *     - a reference type (1 byte),
 *     - a file number (2 bytes),
 *     - a record number (2 bytes),
 *     - a record length (`N`; 2 bytes),
 *     - a record data (`N` bytes).
 *
 * @constructor
 * @extends {Response}
 * @param {Array.<WriteFileSubResponse>} subResponses An array of sub-responses.
 * @throws {Error} If any of the specified sub-responses are invalid.
 */
function WriteFileRecordResponse(subResponses)
{
  Response.call(this, 0x15);

  /**
   * An array of sub-responses.
   *
   * @private
   * @type {Array.<WriteFileSubResponse>}
   */
  this.subResponses = subResponses.map(function(subResponse)
  {
    subResponse.fileNumber = util.prepareNumericOption(
      subResponse.fileNumber, 1, 0x0001, 0xFFFF, 'File number'
    );
    subResponse.recordNumber = util.prepareNumericOption(
      subResponse.recordNumber, 0, 0x0000, 0x270F, 'Record number'
    );

    var recordDataLength = subResponse.recordData.length;

    if (recordDataLength === 0
      || recordDataLength > 240
      || recordDataLength % 2 !== 0)
    {
      throw new Error(util.format(
        "Invalid record data length. "
          + "Expected an even number of bytes between 2 and 240, got: %d",
        recordDataLength
      ));
    }

    return subResponse;
  });
}

util.inherits(WriteFileRecordResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `subResponses` (array, required) -
 *     An array of sub-responses. Sub-response is an object with the following
 *     properties:
 *
 *       - `fileNumber` (number, required) - a file to read.
 *         Must be a number between 0x0001 and 0xFFFF.
 *
 *       - `recordNumber` (number, optional) - a starting record number.
 *         If specified, must be a number between 0x0000 and 0x270F.
 *         Defaults to 0.
 *
 *       - `recordData` (Buffer, required) - a written record data.
 *         Must be of an even length between 2 and 240 bytes.
 *
 * @param {object} options An options object.
 * @param {Array.<WriteFileSubResponse>} options.subResponses
 * @returns {WriteFileRecordResponse} A response created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteFileRecordResponse.fromOptions = function(options)
{
  return new WriteFileRecordResponse(options.subResponses);
};

/**
 * Creates a new response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this response.
 * @returns {WriteFileRecordResponse} A response created from its binary
 * representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this response.
 */
WriteFileRecordResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 11);
  util.assertFunctionCode(buffer[0], 0x15);

  var reader = new buffers.BufferReader(buffer);

  reader.skip(2);

  var subResponses = [];

  while (reader.length > 0)
  {
    var referenceType = reader.shiftByte();

    if (referenceType !== 6)
    {
      throw new Error(util.format(
        "Invalid reference type. Expected 6, got: %d", referenceType
      ));
    }

    subResponses.push({
      fileNumber: reader.shiftUInt16(),
      recordNumber: reader.shiftUInt16(),
      recordData: reader.shiftBuffer(reader.shiftUInt16() * 2)
    });
  }

  return new WriteFileRecordResponse(subResponses);
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
WriteFileRecordResponse.prototype.toBuffer = function()
{
  var builder = new buffers.BufferBuilder();
  var subResponseCount = this.subResponses.length;

  builder
    .pushByte(0x15)
    .pushByte(7 * subResponseCount + this.getTotalRecordDataLength());

  for (var i = 0; i < subResponseCount; ++i)
  {
    var subResponse = this.subResponses[i];

    builder
      .pushByte(6)
      .pushUInt16(subResponse.fileNumber)
      .pushUInt16(subResponse.recordNumber)
      .pushUInt16(subResponse.recordData.length / 2)
      .pushBuffer(subResponse.recordData);
  }

  return builder.toBuffer();
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
WriteFileRecordResponse.prototype.toString = function()
{
  return util.format(
    "0x15 (RES) %d records were written to %d files",
    this.getTotalRecordDataLength() / 2,
    this.subResponses.length
  );
};

/**
 * @returns {Array.<WriteFileSubResponse>} An array of sub-responses.
 */
WriteFileRecordResponse.prototype.getSubResponses = function()
{
  return this.subResponses;
};

/**
 * @returns {number} A total record data byte length of the all sub-responses.
 */
WriteFileRecordResponse.prototype.getTotalRecordDataLength = function()
{
  return this.subResponses.reduce(
    function(p, c) { return p + c.recordData.length; },
    0
  );
};

/*jshint unused:false*/

/**
 * @typedef {{fileNumber: number, recordNumber: number, recordData: Buffer}}
 */
var WriteFileSubResponse;

},{"./Response":47,"./util":65,"h5.buffers":75}],52:[function(require,module,exports){
(function (Buffer){
'use strict';

var util = require('./util');
var Request = require('./Request');
var WriteMemoryResponse =
  require('./WriteMemoryResponse');

module.exports = WriteMemoryRequest;

/**
 * The write memory request (code 0x46).
 *
 * A binary representation of this request varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a starting address (2 bytes, big endian),
 *   - values to be written (`N` bytes).
 *
 * @constructor
 * @extends {Request}
 * @param {number} the starting address to write
 * @param {Buffer} values the data to write
 * @throws {Error} If the `address` is not a number between 0 and 0xFFFF.
 * @throws {Error} If the `values` is not between 1 and 250 bytes
 */
function WriteMemoryRequest(address, values)
{
  Request.call(this, 0x46);

  if( values.length < 1 || values.length > 250)
  {
    throw new Error(util.format(
      "The length of the `values` Buffer must be  "
        + "between 1 and 250, got: %d",
      values.length
    ));
  }

  /**
   * A starting address. A number between 0 and 0xFFFF.
   *
   * @private
   * @type {number}
   */
  this.address = util.prepareAddress(address);

  /**
   * Values of the registers. A buffer of variable length.
   *
   * @private
   * @type {Buffer}
   */
  this.values = values;
}

util.inherits(WriteMemoryRequest, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are:
 *
 *   - `address` (number, optional) -
 *     The starting address. If specified, must be a number
 *     between 0 and 0xFFFF.
 *     Defaults to 0.
 *
 *   - `values` (Buffer, required) -
 *     Values of the registers. Must be a buffer of length
 *     between 1 and 253.
 *
 * @param {object} options An options object.
 * @param {number} [options.type]
 * @param {number} [options.page]
 * @param {number} [options.address]
 * @param {Buffer} options.values
 * @returns {WriteMemoryRequest} A request
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteMemoryRequest.fromOptions = function(options)
{
  return new WriteMemoryRequest(
    options.address, options.values);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {WriteMemoryRequest} A request
 * created from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
WriteMemoryRequest.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 4);
  util.assertFunctionCode(buffer[0], 0x46);

  var address = buffer.readUInt16BE(1, true);

  var byteCount = buffer.length -3;
  var values = new Buffer( byteCount );

  buffer.copy(values, 0, 3, byteCount + 3);

  return new WriteMemoryRequest(address, values);
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
WriteMemoryRequest.prototype.toBuffer = function()
{
  var buffer = new Buffer(3 + this.values.length);

  buffer[0] = 0x46;
  buffer.writeUInt16BE(this.address, 1, true);

  this.values.copy(buffer, 3);

  return buffer;
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
WriteMemoryRequest.prototype.toString = function()
{
  return util.format(
    "0x46 (REQ) Write %d bytes to Memory at address %d:",
    this.values.length,
    this.address,
    this.values
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
WriteMemoryRequest.prototype.createResponse =
  function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    WriteMemoryResponse
  );
};


/**
 * @returns {number} The memory address.
 */
WriteMemoryRequest.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @returns {number} The byte count.
 */
WriteMemoryRequest.prototype.getCount = function()
{
  return this.values.length;
};

/**
 * @returns {Buffer} Values of the registers
 */
WriteMemoryRequest.prototype.getValues = function()
{
  return this.values;
};

}).call(this,require("buffer").Buffer)
},{"./Request":46,"./WriteMemoryResponse":53,"./util":65,"buffer":3}],53:[function(require,module,exports){
(function (Buffer){
'use strict';

var util = require('./util');
var Response = require('./Response');

module.exports = WriteMemoryResponse;

/**
 * The write memory response (code 0x46).
 *
 * A binary representation of this response is 2 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - a response status (1 byte),
 *
 * @constructor
 * @extends {Response}
 * @param {number} status A success indicator (0=success)
 * @throws {Error} If the `quantity` is not a number between 0 and 250.
 */
function WriteMemoryResponse(quantity)
{
  Response.call(this, 0x46);

  /**
   * Response status
   *
   * @private
   * @type {number}
   */
  this.status = util.prepareNumericOption(quantity, 0, 0, 250, 'Code');
}

util.inherits(WriteMemoryResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `status` (number) -
 *     result status
 *
 * @param {object} options An options object.
 * @param {number} [options.status]
 * @returns {WriteMemoryResponse} A response
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteMemoryResponse.fromOptions = function(options)
{
  return new WriteMemoryResponse(options.status);
};

/**
 * Creates a response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the response.
 * @returns {WriteMemoryResponse} Read input
 * registers response.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of the read input registers response.
 */
WriteMemoryResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 2);
  util.assertFunctionCode(buffer[0], 0x46);

  return new WriteMemoryResponse( buffer[1] );
};

/**
 * Returns a binary representation of the read input registers response.
 *
 * @returns {Buffer} A binary representation of the response.
 */
WriteMemoryResponse.prototype.toBuffer = function()
{
  var buffer = new Buffer(2);

  buffer[0] = 0x46;
  buffer[1] = this.status;

  return buffer;
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
WriteMemoryResponse.prototype.toString = function()
{
  return util.format(
    "0x46 (RES) Result status %d",
    this.status
  );
};

/**
 * @returns {number} A quantity of bytes written.
 */
WriteMemoryResponse.prototype.getStatus = function()
{
  return this.status;
};

}).call(this,require("buffer").Buffer)
},{"./Response":47,"./util":65,"buffer":3}],54:[function(require,module,exports){
'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Request = require('./Request');
var WriteMultipleCoilsResponse = require('./WriteMultipleCoilsResponse');

module.exports = WriteMultipleCoilsRequest;

/**
 * The write multiple coils request (code 0x0F).
 *
 * A binary representation of this request varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a starting address (2 bytes),
 *   - a quantity of outputs (2 bytes),
 *   - a byte count (`N`; 1 byte),
 *   - states of the coils (`N` bytes).
 *
 * @constructor
 * @extends {Request}
 * @param {number} address A starting address. A number between 0 and 0xFFFF.
 * @param {Array.<boolean>} states States of the coils. An array of 1 and 1968
 * truthy or falsy values.
 * @throws {Error} If the `address` is not a number between 0 and 0xFFFF.
 * @throws {Error} If the `states` is not an array of length between 1 and 1968.
 */
function WriteMultipleCoilsRequest(address, states)
{
  Request.call(this, 0x0F);

  if (states.length < 1 || states.length > 1968)
  {
    throw new Error(util.format(
      "The length of the statuses array must be between 1 and 1968, got: %d",
      states.length
    ));
  }

  /**
   * A starting address. A number between 0 and 0xFFFF.
   *
   * @private
   * @type {number}
   */
  this.address = util.prepareAddress(address);

  /**
   * States of the coils. An array of 1 and 1968 truthy or falsy values.
   *
   * @private
   * @type {Array.<boolean>}
   */
  this.states = states;
}

util.inherits(WriteMultipleCoilsRequest, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are:
 *
 *   - `address` (number, required) -
 *     A starting address. Must be a number between 0 and 0xFFFF.
 *
 *   - `states` (array, required) -
 *     States of the coils. Must be an array of 1 to 1968
 *     truthy or falsy values.
 *
 * @param {object} options An options object.
 * @param {number} options.address
 * @param {Array.<boolean>} options.states
 * @returns {WriteMultipleCoilsRequest} A response created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteMultipleCoilsRequest.fromOptions = function(options)
{
  return new WriteMultipleCoilsRequest(options.address, options.states);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {WriteMultipleCoilsRequest} A request created
 * from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
WriteMultipleCoilsRequest.fromBuffer = function(buffer)
{
  var reader = new buffers.BufferReader(buffer);

  util.assertFunctionCode(reader.shiftByte(), 0x0F);

  var address = reader.shiftUInt16();
  var quantity = reader.shiftUInt16();

  reader.skip(1);

  var states = reader.shiftBits(quantity);

  return new WriteMultipleCoilsRequest(address, states);
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
WriteMultipleCoilsRequest.prototype.toBuffer = function()
{
  return new buffers.BufferBuilder()
    .pushByte(0x0F)
    .pushUInt16(this.address)
    .pushUInt16(this.states.length)
    .pushByte(Math.ceil(this.states.length / 8))
    .pushBits(this.states)
    .toBuffer();
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
WriteMultipleCoilsRequest.prototype.toString = function()
{
  return util.format(
    "0x0F (REQ) Set %d coils starting from address %d to:",
    this.states.length,
    this.address,
    this.states.map(Number)
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
WriteMultipleCoilsRequest.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    WriteMultipleCoilsResponse
  );
};

/**
 * @returns {number} A starting address.
 */
WriteMultipleCoilsRequest.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @returns {Array.<boolean>} States of the coils.
 */
WriteMultipleCoilsRequest.prototype.getStates = function()
{
  return this.states;
};

},{"./Request":46,"./WriteMultipleCoilsResponse":55,"./util":65,"h5.buffers":75}],55:[function(require,module,exports){
(function (Buffer){
'use strict';

var util = require('./util');
var Response = require('./Response');

module.exports = WriteMultipleCoilsResponse;

/**
 * The write multiple coils response (code 0x0F).
 *
 * A binary representation of this response is 5 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - a starting address (2 bytes),
 *   - a quantity of outputs set (2 bytes).
 *
 * @constructor
 * @extends {Response}
 * @param {number} address A starting address.
 * Must be between 0x0000 and 0xFFFF.
 * @param {number} quantity A quantity of outputs set.
 * Must be between 1 and 1968.
 * @throws {Error} If the `address` is not a number between 0x0000 and 0xFFFF.
 * @throws {Error} If the `quantity` is not a number between 1 and 1968.
 */
function WriteMultipleCoilsResponse(address, quantity)
{
  Response.call(this, 0x0F);

  /**
   * A starting address. A number between 0 and 0xFFFF.
   *
   * @private
   * @type {number}
   */
  this.address = util.prepareAddress(address);

  /**
   * A quantity of outputs written. A number between 1 and 1968.
   *
   * @private
   * @type {number}
   */
  this.quantity = util.prepareQuantity(quantity, 1968);
}

util.inherits(WriteMultipleCoilsResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this request are:
 *
 *   - `address` (number, optional) -
 *     A starting address. If specified, must be a number between 0 and 0xFFFF.
 *     Defaults to 0.
 *
 *   - `quantity` (number, optional) -
 *     A quantity of coils set.
 *     If specified, must be a number between 1 and 1968.
 *     Defaults to 1.
 *
 * @param {object} options An options object.
 * @param {number} [options.address]
 * @param {number} [options.quantity]
 * @returns {WriteMultipleCoilsResponse} A response created from
 * the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteMultipleCoilsResponse.fromOptions = function(options)
{
  return new WriteMultipleCoilsResponse(options.address, options.quantity);
};

/**
 * Creates a new response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this response.
 * @returns {WriteMultipleCoilsResponse} A response created
 * from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this response.
 */
WriteMultipleCoilsResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 5);
  util.assertFunctionCode(buffer[0], 0x0F);

  var address = buffer.readUInt16BE(1, true);
  var quantity = buffer.readUInt16BE(3, true);

  return new WriteMultipleCoilsResponse(address, quantity);
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
WriteMultipleCoilsResponse.prototype.toBuffer = function()
{
  var buffer = new Buffer(5);

  buffer[0] = 0x0F;
  buffer.writeUInt16BE(this.address, 1, true);
  buffer.writeUInt16BE(this.quantity, 3, true);

  return buffer;
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
WriteMultipleCoilsResponse.prototype.toString = function()
{
  return util.format(
    "0x0F (RES) %d coils starting from address %d were set",
    this.quantity,
    this.address
  );
};

/**
 * @returns {number} A starting address.
 */
WriteMultipleCoilsResponse.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @returns {number} A quantity of outputs written.
 */
WriteMultipleCoilsResponse.prototype.getQuantity = function()
{
  return this.quantity;
};

}).call(this,require("buffer").Buffer)
},{"./Response":47,"./util":65,"buffer":3}],56:[function(require,module,exports){
(function (Buffer){
'use strict';

var util = require('./util');
var Request = require('./Request');
var WriteMultipleRegistersResponse =
  require('./WriteMultipleRegistersResponse');

module.exports = WriteMultipleRegistersRequest;

/**
 * The write multiple registers request (code 0x10).
 *
 * A binary representation of this request varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a starting address (2 bytes),
 *   - a quantity of registers (2 bytes),
 *   - a byte count (`N`; 1 byte),
 *   - values of the registers (`N` bytes).
 *
 * @constructor
 * @extends {Request}
 * @param {number} address A starting address. A number between 0 and 0xFFFF.
 * @param {Buffer} values Values of the registers.
 * A buffer of even length between 2 and 246.
 * @throws {Error} If the `address` is not a number between 0 and 0xFFFF.
 * @throws {Error} If the `values` is not a Buffer of even length
 * between 2 and 246.
 */
function WriteMultipleRegistersRequest(address, values)
{
  Request.call(this, 0x10);

  if (values.length % 2 !== 0 || values.length < 2 || values.length > 246)
  {
    throw new Error(util.format(
      "The length of the `values` Buffer must be an even number "
        + "between 2 and 246, got: %d",
      values.length
    ));
  }

  /**
   * A starting address. A number between 0 and 0xFFFF.
   *
   * @private
   * @type {number}
   */
  this.address = util.prepareAddress(address);

  /**
   * Values of the registers. A buffer of even length between 2 and 246.
   *
   * @private
   * @type {Buffer}
   */
  this.values = values;
}

util.inherits(WriteMultipleRegistersRequest, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are:
 *
 *   - `address` (number, optional) -
 *     A starting address. If specified, must be a number between 0 and 0xFFFF.
 *     Defaults to 0.
 *
 *   - `values` (Buffer, required) -
 *     Values of the registers. Must be a buffer of even length
 *     between 2 and 246.
 *
 * @param {object} options An options object.
 * @param {number} [options.address]
 * @param {Buffer} options.values
 * @returns {WriteMultipleRegistersRequest} A response
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteMultipleRegistersRequest.fromOptions = function(options)
{
  return new WriteMultipleRegistersRequest(options.address, options.values);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {WriteMultipleRegistersRequest} A request
 * created from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
WriteMultipleRegistersRequest.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 8);
  util.assertFunctionCode(buffer[0], 0x10);

  var address = buffer.readUInt16BE(1, true);
  var byteCount = buffer[5];
  var values = new Buffer(byteCount);

  buffer.copy(values, 0, 6, 6 + byteCount);

  return new WriteMultipleRegistersRequest(address, values);
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
WriteMultipleRegistersRequest.prototype.toBuffer = function()
{
  var buffer = new Buffer(6 + this.values.length);

  buffer[0] = 0x10;
  buffer.writeUInt16BE(this.address, 1, true);
  buffer.writeUInt16BE(this.values.length / 2, 3, true);
  buffer[5] = this.values.length;
  this.values.copy(buffer, 6);

  return buffer;
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
WriteMultipleRegistersRequest.prototype.toString = function()
{
  return util.format(
    "0x10 (REQ) Set %d registers starting from address %d to:",
    this.values.length / 2,
    this.address,
    this.values
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
WriteMultipleRegistersRequest.prototype.createResponse =
  function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    WriteMultipleRegistersResponse
  );
};

/**
 * @returns {number} A starting address.
 */
WriteMultipleRegistersRequest.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @returns {Buffer} Values of the registers
 */
WriteMultipleRegistersRequest.prototype.getValues = function()
{
  return this.values;
};

}).call(this,require("buffer").Buffer)
},{"./Request":46,"./WriteMultipleRegistersResponse":57,"./util":65,"buffer":3}],57:[function(require,module,exports){
(function (Buffer){
'use strict';

var util = require('./util');
var Response = require('./Response');

module.exports = WriteMultipleRegistersResponse;

/**
 * The write multiple registers response (code 0x10).
 *
 * A binary representation of this response is 5 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - a starting address (2 bytes),
 *   - a quantity of registers written (2 bytes).
 *
 * @constructor
 * @extends {Response}
 * @param {number} address A starting address. A number between 0 and 0xFFFF.
 * @param {number} quantity A quantity of registers written.
 * A number between 1 and 123.
 * @throws {Error} If the `address` is not a number between 0 and 0xFFFF.
 * @throws {Error} If the `quantity` is not a number between 1 and 123.
 */
function WriteMultipleRegistersResponse(address, quantity)
{
  Response.call(this, 0x10);

  /**
   * A starting address. A number between 0 and 0xFFFF.
   *
   * @private
   * @type {number}
   */
  this.address = util.prepareAddress(address);

  /**
   * A quantity of registers written. A number between 1 and 123.
   *
   * @private
   * @type {number}
   */
  this.quantity = util.prepareQuantity(quantity, 123);
}

util.inherits(WriteMultipleRegistersResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `address` (number, optional) -
 *     A starting address. If specified, must be a number between 0 and 0xFFFF.
 *     Defaults to 0.
 *
 *   - `quantity` (number, optional) -
 *     A quantity of registers written. If specified, must be a number
 *     between 1 and 123. Defaults to 1.
 *
 * @param {object} options An options object.
 * @param {number} [options.address]
 * @param {number} [options.quantity]
 * @returns {WriteMultipleRegistersResponse} A response
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteMultipleRegistersResponse.fromOptions = function(options)
{
  return new WriteMultipleRegistersResponse(options.address, options.quantity);
};

/**
 * Creates a response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the response.
 * @returns {WriteMultipleRegistersResponse} Read input
 * registers response.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of the read input registers response.
 */
WriteMultipleRegistersResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 5);
  util.assertFunctionCode(buffer[0], 0x10);

  return new WriteMultipleRegistersResponse(
    buffer.readUInt16BE(1, true),
    buffer.readUInt16BE(3, true)
  );
};

/**
 * Returns a binary representation of the read input registers response.
 *
 * @returns {Buffer} A binary representation of the response.
 */
WriteMultipleRegistersResponse.prototype.toBuffer = function()
{
  var buffer = new Buffer(5);

  buffer[0] = 0x10;
  buffer.writeUInt16BE(this.address, 1, true);
  buffer.writeUInt16BE(this.quantity, 3, true);

  return buffer;
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
WriteMultipleRegistersResponse.prototype.toString = function()
{
  return util.format(
    "0x10 (RES) %d registers starting from address %d were written",
    this.quantity,
    this.address
  );
};

/**
 * @returns {number} A starting address.
 */
WriteMultipleRegistersResponse.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @returns {number} A quantity of registers written.
 */
WriteMultipleRegistersResponse.prototype.getQuantity = function()
{
  return this.quantity;
};

}).call(this,require("buffer").Buffer)
},{"./Response":47,"./util":65,"buffer":3}],58:[function(require,module,exports){
(function (Buffer){
'use strict';

var util = require('./util');
var Request = require('./Request');
var WriteObjectResponse =
  require('./WriteObjectResponse');

module.exports = WriteObjectRequest;

/**
 * The write object request (code 0x44).
 *
 * A binary representation of this request varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - an object id (1 byte),
 *   - a byte count (`N`; 1 byte),
 *   - values of the registers (`N` bytes).
 *
 * @constructor
 * @extends {Request}
 * @param {number} id the object ID
 * @param {Buffer} values the object data
 * @throws {Error} If the `id` is not a number between 0 and 0xFF.
 * @throws {Error} If the `values` is not between 1 and 250 bytes
 */
function WriteObjectRequest(id, values)
{
  Request.call(this, 0x44);

  if( values.length < 1 || values.length > 250)
  {
    throw new Error(util.format(
      "The length of the `values` Buffer must be  "
        + "between 1 and 250, got: %d",
      values.length
    ));
  }

  /**
   * A starting address. A number between 0 and 0xFFFF.
   *
   * @private
   * @type {number}
   */
  this.id = util.prepareNumericOption(id, 0, 0, 255, 'id');

  /**
   * Values of the registers. A buffer of length between 1 and 250.
   *
   * @private
   * @type {Buffer}
   */
  this.values = values;
}

util.inherits(WriteObjectRequest, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are:
 *
 *   - `id` (number, optional) -
 *     The object ID. If specified, must be a number between 0 and 0xFF.
 *     Defaults to 0.
 *
 *   - `values` (Buffer, required) -
 *     Values of the registers. Must be a buffer of length
 *     between 1 and 250.
 *
 * @param {object} options An options object.
 * @param {number} [options.id]
 * @param {Buffer} options.values
 * @returns {WriteObjectRequest} A request
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteObjectRequest.fromOptions = function(options)
{
  return new WriteObjectRequest(options.id, options.values);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {WriteObjectRequest} A request
 * created from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
WriteObjectRequest.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 4);
  util.assertFunctionCode(buffer[0], 0x44);

  var id = buffer[1];
  var byteCount = buffer[2];
  var values = new Buffer(byteCount);

  buffer.copy(values, 0, 3, 3 + byteCount);

  return new WriteObjectRequest(id, values);
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
WriteObjectRequest.prototype.toBuffer = function()
{
  var buffer = new Buffer(3 + this.values.length);

  buffer[0] = 0x44;
  buffer[1] = this.id;
  buffer[2] = this.values.length;
  this.values.copy(buffer, 3);

  return buffer;
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
WriteObjectRequest.prototype.toString = function()
{
  return util.format(
    "0x44 (REQ) Write %d bytes to Object %d :",
    this.values.length,
    this.id,
    this.values
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
WriteObjectRequest.prototype.createResponse =
  function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    WriteObjectResponse
  );
};

/**
 * @returns {number} The Object ID.
 */
WriteObjectRequest.prototype.getId = function()
{
  return this.id;
};

/**
 * @returns {Buffer} object data
 */
WriteObjectRequest.prototype.getValues = function()
{
  return this.values;
};

}).call(this,require("buffer").Buffer)
},{"./Request":46,"./WriteObjectResponse":59,"./util":65,"buffer":3}],59:[function(require,module,exports){
(function (Buffer){
'use strict';

var util = require('./util');
var Response = require('./Response');

module.exports = WriteObjectResponse;

/**
 * The write Object response (code 0x44).
 *
 * A binary representation of this response is 2 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - a response status (1 byte),
 *
 * @constructor
 * @extends {Response}
 * @param {number} status A success indicator (0=success)
 * @throws {Error} If the `quantity` is not a number between 0 and 250.
 */
function WriteObjectResponse(quantity)
{
  Response.call(this, 0x44);

  /**
   * the response status
   *
   * @private
   * @type {number}
   */
  this.status = util.prepareNumericOption(quantity, 0, 0, 250, 'Code');
}

util.inherits(WriteObjectResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `status` (number) -
 *     result status
 *
 * @param {object} options An options object.
 * @param {number} [options.status]
 * @returns {WriteObjectResponse} A response
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteObjectResponse.fromOptions = function(options)
{
  return new WriteObjectResponse(options.status);
};

/**
 * Creates a response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the response.
 * @returns {WriteObjectResponse} Read input
 * registers response.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of the read input registers response.
 */
WriteObjectResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 2);
  util.assertFunctionCode(buffer[0], 0x44);

  return new WriteObjectResponse( buffer[1] );
};

/**
 * Returns a binary representation of the read input registers response.
 *
 * @returns {Buffer} A binary representation of the response.
 */
WriteObjectResponse.prototype.toBuffer = function()
{
  var buffer = new Buffer(2);

  buffer[0] = 0x44;
  buffer[1] = this.status;

  return buffer;
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
WriteObjectResponse.prototype.toString = function()
{
  return util.format(
    "0x44 (RES) Result status %d",
    this.status
  );
};

/**
 * @returns {number} A quantity of bytes written.
 */
WriteObjectResponse.prototype.getStatus = function()
{
  return this.status;
};

}).call(this,require("buffer").Buffer)
},{"./Response":47,"./util":65,"buffer":3}],60:[function(require,module,exports){
(function (Buffer){
'use strict';

var util = require('./util');
var Request = require('./Request');
var WriteSingleCoilResponse = require('./WriteSingleCoilResponse');

module.exports = WriteSingleCoilRequest;

/**
 * The write single coil request (code 0x05).
 *
 * A binary representation of this request is 5 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - an output address (2 bytes),
 *   - an output value (2 bytes).
 *
 * An output value of 0xFF00 requests the output to be ON.
 * A value of 0x0000 requests it to be OFF.
 *
 * @constructor
 * @extends {Request}
 * @param {number} address An output address. A number between 0 and 0xFFFF.
 * @param {boolean} state A state of the coil. `TRUE` - coil is ON;
 * `FALSE` - coil is OFF.
 * @throws {Error} If the `address` is not a number between 0 and 0xFFFF.
 */
function WriteSingleCoilRequest(address, state)
{
  Request.call(this, 0x05);

  /**
   * An output address. A number between 0 and 0xFFFF.
   *
   * @private
   * @type {number}
   */
  this.address = util.prepareAddress(address);

  /**
   * A state of the coil. `TRUE` - coil is ON; `FALSE` - coil is OFF.
   *
   * @private
   * @type {boolean}
   */
  this.state = !!state;
}

util.inherits(WriteSingleCoilRequest, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are:
 *
 *   - `address` (number, optional) -
 *     An output address. If specified, must be a number between 0 and 0xFFFF.
 *     Defaults to 0.
 *
 *   - `state` (boolean, optional) -
 *     A state of the coil. `TRUE` - coil is ON; `FALSE` - coil is OFF.
 *     Defaults to `FALSE`.
 *
 * @param {object} options An options object.
 * @param {number} [options.address]
 * @param {boolean} [options.state]
 * @returns {WriteSingleCoilRequest} A response created from
 * the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteSingleCoilRequest.fromOptions = function(options)
{
  return new WriteSingleCoilRequest(options.address, options.state);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {WriteSingleCoilRequest} A request created from
 * its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
WriteSingleCoilRequest.fromBuffer = function(buffer)
{
  util.assertFunctionCode(buffer[0], 0x05);

  return new WriteSingleCoilRequest(
    buffer.readUInt16BE(1),
    buffer.readUInt16BE(3) === 0xFF00
  );
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
WriteSingleCoilRequest.prototype.toBuffer = function()
{
  var buffer = new Buffer(5);

  buffer[0] = 0x05;
  buffer.writeUInt16BE(this.address, 1, true);
  buffer.writeUInt16BE(this.state ? 0xFF00 : 0x0000, 3, true);

  return buffer;
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
WriteSingleCoilRequest.prototype.toString = function()
{
  return util.format(
    "0x05 (REQ) Set the coil at address %d to be %s",
    this.address,
    this.state ? 'ON' : 'OFF'
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
WriteSingleCoilRequest.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    WriteSingleCoilResponse
  );
};

/**
 * @returns {number} An output address.
 */
WriteSingleCoilRequest.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @returns {boolean} A state of the coil.
 */
WriteSingleCoilRequest.prototype.getState = function()
{
  return this.state;
};

}).call(this,require("buffer").Buffer)
},{"./Request":46,"./WriteSingleCoilResponse":61,"./util":65,"buffer":3}],61:[function(require,module,exports){
(function (Buffer){
'use strict';

var util = require('./util');
var Response = require('./Response');

module.exports = WriteSingleCoilResponse;

/**
 * The write single coil response (code 0x05).
 *
 * A binary representation of this response is 5 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - an output address (2 bytes),
 *   - an output value (2 bytes).
 *
 * An output value of 0xFF00 means that the output is ON.
 * A value of 0x0000 means that it is OFF.
 *
 * @constructor
 * @extends {Response}
 * @param {number} address An address of the output.
 * Must be between 0x0000 and 0xFFFF.
 * @param {boolean} state A state of the output. `TRUE` - the coil is ON;
 * `FALSE` - the coil is OFF.
 * @throws {Error} If the `address` is not a number between 0x0000 and 0xFFFF.
 */
function WriteSingleCoilResponse(address, state)
{
  Response.call(this, 0x05);

  /**
   * An address of the output. A number between 0x0000 and 0xFFFF.
   *
   * @private
   * @type {number}
   */
  this.address = util.prepareAddress(address);

  /**
   * A state of the output. `TRUE` - the coil is ON; `FALSE` - the coil is OFF.
   *
   * @private
   * @type {boolean}
   */
  this.state = !!state;
}

util.inherits(WriteSingleCoilResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this request are:
 *
 *   - `address` (number, optional) -
 *     An output address. If specified, must be a number between 0 and 0xFFFF.
 *     Defaults to 0.
 *
 *   - `state` (boolean, required) -
 *     A state of the output.
 *     `TRUE` - the coil is ON; `FALSE` - the coil is OFF.
 *
 * @param {object} options An options object.
 * @param {number} [options.address]
 * @param {boolean} [options.state]
 * @returns {WriteSingleCoilResponse} A response created from
 * the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteSingleCoilResponse.fromOptions = function(options)
{
  return new WriteSingleCoilResponse(options.address, options.state);
};

/**
 * Creates a new response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this response.
 * @returns {WriteSingleCoilResponse} A response created from
 * its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this response.
 */
WriteSingleCoilResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 5);
  util.assertFunctionCode(buffer[0], 0x05);

  var address = buffer.readUInt16BE(1, true);
  var state = buffer.readUInt16BE(3, true) === 0xFF00;

  return new WriteSingleCoilResponse(address, state);
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
WriteSingleCoilResponse.prototype.toBuffer = function()
{
  var buffer = new Buffer(5);

  buffer[0] = 0x05;
  buffer.writeUInt16BE(this.address, 1, true);
  buffer.writeUInt16BE(this.state ? 0xFF00 : 0x0000, 3, true);

  return buffer;
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
WriteSingleCoilResponse.prototype.toString = function()
{
  return util.format(
    "0x05 (RES) Coil at address %d was turned %s",
    this.address,
    this.state ? 'ON': 'OFF'
  );
};

/**
 * @returns {number} An address of the output.
 */
WriteSingleCoilResponse.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @returns {boolean} A state of the output.
 */
WriteSingleCoilResponse.prototype.getState = function()
{
  return this.state;
};

}).call(this,require("buffer").Buffer)
},{"./Response":47,"./util":65,"buffer":3}],62:[function(require,module,exports){
(function (Buffer){
'use strict';

var util = require('./util');
var Request = require('./Request');
var WriteSingleRegisterResponse = require('./WriteSingleRegisterResponse');

module.exports = WriteSingleRegisterRequest;

/**
 * The write single register request (code 0x06).
 *
 * A binary representation of this request is 5 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - a register address (2 bytes),
 *   - a register value (2 bytes).
 *
 * @constructor
 * @extends {Request}
 * @param {number} address A register address. A number between 0 and 0xFFFF.
 * @param {number} value A value of the register. A number between 0 and 65535.
 * @throws {Error} If the `address` is not a number between 0 and 0xFFFF.
 * @throws {Error} If the `value` is not a number between 0 and 65535.
 */
function WriteSingleRegisterRequest(address, value)
{
  Request.call(this, 0x06);

  /**
   * A register address. A number between 0 and 0xFFFF.
   *
   * @private
   * @type {number}
   */
  this.address = util.prepareAddress(address);

  /**
   * A value of the register. A number between 0 and 65535.
   *
   * @private
   * @type {number}
   */
  this.value = util.prepareRegisterValue(value);
}

util.inherits(WriteSingleRegisterRequest, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are:
 *
 *   - `address` (number, optional) -
 *     A register address. If specified, must be a number between 0 and 0xFFFF.
 *     Defaults to 0.
 *
 *   - `value` (number, optional) -
 *     A value of the register. If specified, must be a number
 *     between 0 and 65535. Defaults to 0.
 *
 * @param {object} options An options object.
 * @param {number} [options.address]
 * @param {number} [options.value]
 * @returns {WriteSingleRegisterRequest} A response created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteSingleRegisterRequest.fromOptions = function(options)
{
  return new WriteSingleRegisterRequest(options.address, options.value);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {WriteSingleRegisterRequest} A request created
 * from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
WriteSingleRegisterRequest.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 5);
  util.assertFunctionCode(buffer[0], 0x06);

  return new WriteSingleRegisterRequest(
    buffer.readUInt16BE(1, true),
    buffer.readUInt16BE(3, true)
  );
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
WriteSingleRegisterRequest.prototype.toBuffer = function()
{
  var buffer = new Buffer(5);

  buffer[0] = 0x06;
  buffer.writeUInt16BE(this.address, 1, true);
  buffer.writeUInt16BE(this.value, 3, true);

  return buffer;
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
WriteSingleRegisterRequest.prototype.toString = function()
{
  return util.format(
    "0x06 (REQ) Set the register at address %d to: %d",
    this.address,
    this.value
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
WriteSingleRegisterRequest.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    WriteSingleRegisterResponse
  );
};

/**
 * @returns {number} A register address.
 */
WriteSingleRegisterRequest.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @returns {number} A value of the register.
 */
WriteSingleRegisterRequest.prototype.getValue = function()
{
  return this.value;
};

}).call(this,require("buffer").Buffer)
},{"./Request":46,"./WriteSingleRegisterResponse":63,"./util":65,"buffer":3}],63:[function(require,module,exports){
(function (Buffer){
'use strict';

var util = require('./util');
var Response = require('./Response');

module.exports = WriteSingleRegisterResponse;

/**
 * The write single register response (code 0x06).
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
function WriteSingleRegisterResponse(address, value)
{
  Response.call(this, 0x06);

  /**
   * An address of the register. A number between 0x0000 and 0xFFFF.
   *
   * @private
   * @type {number}
   */
  this.address = util.prepareAddress(address);

  /**
   * A value of the register. A number between 0 and 65535.
   *
   * @private
   * @type {number}
   */
  this.value = util.prepareRegisterValue(value);
}

util.inherits(WriteSingleRegisterResponse, Response);

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
WriteSingleRegisterResponse.fromOptions = function(options)
{
  return new WriteSingleRegisterResponse(options.address, options.value);
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
WriteSingleRegisterResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 5);
  util.assertFunctionCode(buffer[0], 0x06);

  var address = buffer.readUInt16BE(1, true);
  var value = buffer.readUInt16BE(3, true);

  return new WriteSingleRegisterResponse(address, value);
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
WriteSingleRegisterResponse.prototype.toBuffer = function()
{
  var buffer = new Buffer(5);

  buffer[0] = 0x06;
  buffer.writeUInt16BE(this.address, 1, true);
  buffer.writeUInt16BE(this.value, 3, true);

  return buffer;
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
WriteSingleRegisterResponse.prototype.toString = function()
{
  return util.format(
    "0x06 (RES) Register at address %d was set to: %d",
    this.address,
    this.value
  );
};

/**
 * @returns {number} An address of the register.
 */
WriteSingleRegisterResponse.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @returns {number} A value of the register.
 */
WriteSingleRegisterResponse.prototype.getValue = function()
{
  return this.value;
};


}).call(this,require("buffer").Buffer)
},{"./Response":47,"./util":65,"buffer":3}],64:[function(require,module,exports){
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

},{"./CommandRequest":23,"./CommandResponse":24,"./ExceptionResponse":25,"./ReadCoilsRequest":26,"./ReadCoilsResponse":27,"./ReadDiagnosticsRequest":28,"./ReadDiagnosticsResponse":29,"./ReadDiscreteInputsRequest":30,"./ReadDiscreteInputsResponse":31,"./ReadFifo8Request":32,"./ReadFifo8Response":33,"./ReadFileRecordRequest":34,"./ReadFileRecordResponse":35,"./ReadHoldingRegistersRequest":36,"./ReadHoldingRegistersResponse":37,"./ReadInputRegistersRequest":38,"./ReadInputRegistersResponse":39,"./ReadMemoryRequest":40,"./ReadMemoryResponse":41,"./ReadObjectRequest":42,"./ReadObjectResponse":43,"./ReportSlaveIdRequest":44,"./ReportSlaveIdResponse":45,"./WriteFifo8Request":48,"./WriteFifo8Response":49,"./WriteFileRecordRequest":50,"./WriteFileRecordResponse":51,"./WriteMemoryRequest":52,"./WriteMemoryResponse":53,"./WriteMultipleCoilsRequest":54,"./WriteMultipleCoilsResponse":55,"./WriteMultipleRegistersRequest":56,"./WriteMultipleRegistersResponse":57,"./WriteObjectRequest":58,"./WriteObjectResponse":59,"./WriteSingleCoilRequest":60,"./WriteSingleCoilResponse":61,"./WriteSingleRegisterRequest":62,"./WriteSingleRegisterResponse":63}],65:[function(require,module,exports){
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

},{"util":9}],66:[function(require,module,exports){
'use strict';

var Master = require('./Master');
var functions = require('./functions');

/**
 * @private
 * @const
 * @type {object.<string, function(object): Connection>}
 */
var connectionFactories = {
  'tcp': function createTcpConnection(options)
  {
    return new (require('./connections/TcpConnection'))(options);
  },
  'udp': function createUdpConnection(options)
  {
    return new (require('./connections/UdpConnection'))(options);
  },
  'serial': function createSerialConnection(options)
  {
    return new (require('./connections/SerialConnection'))(options.serialPort);
  },
  'websocket': function createWebsocketConnection(options)
  {
    return new (require('./connections/WebsocketConnection'))(options.socket);
  },
  'ble': function createBleConnection(options)
  {
    return new (require('./connections/BleConnection'))(options.device);
  },
  'none': function createNoConnection(options)
  {
    return new (require('./connections/NoConnection'))(options);
  }
};

/**
 * @private
 * @const
 * @type {object.<string, function(object): Transport>}
 */
var transportFactories = {
  'ip': function createIpTransport(options)
  {
    return new (require('./transports/IpTransport'))(
      createConnection(options.connection)
    );
  },
  'ascii': function createAsciiTransport(options)
  {
    return new (require('./transports/AsciiTransport'))(
      createConnection(options.connection)
    );
  },
  'rtu': function createRtuTransport(options)
  {
    options.connection = createConnection(options.connection);

    return new (require('./transports/RtuTransport'))(options);
  },
  'tunnel': function createTunnelTransport(options)
  {
    options.connection = createConnection(options.connection);

    return new (require('./transports/TunnelTransport'))(options);
  }
};

/**
 * @private
 * @param {object} [options]
 * @param {string} [options.type]
 * @returns {Connection}
 * @throws {Error} If any of the specified options are invalid.
 */
function createConnection(options)
{
  if (typeof options !== 'object')
  {
    options = {};
  }

  if (typeof options.type !== 'string')
  {
    options.type = 'tcp';
  }

  var connectionFactory = connectionFactories[options.type];

  if (typeof connectionFactory === 'undefined')
  {
    throw new Error("Unknown connection type: " + options.type);
  }

  return connectionFactory(options);
}

/**
 * @private
 * @param {object} [options]
 * @param {string} [options.type]
 * @param {object} [options.connection]
 * @returns {Transport}
 * @throws {Error} If any of the specified options are invalid.
 */
function createTransport(options)
{
  if (typeof options !== 'object')
  {
    options = {};
  }

  if (typeof options.type !== 'string')
  {
    options.type = 'ip';
  }

  var transportFactory = transportFactories[options.type];

  if (typeof transportFactory === 'undefined')
  {
    throw new Error("Unknown transport type: " + options.type);
  }

  return transportFactory(options);
}

/**
 * @param {object} [options]
 * @param {object} [options.transport]
 * @param {boolean} [options.retryOnException]
 * @param {number} [options.maxConcurrentRequests]
 * @param {number} [options.defaultUnit]
 * @param {number} [options.defaultMaxRetries]
 * @param {number} [options.defaultTimeout]
 * @returns {Master}
 * @throws {Error} If any of the specified options are invalid.
 */
function createMaster(options)
{
  if (typeof options === 'undefined')
  {
    options = {};
  }

  options.transport = createTransport(options.transport);
  options = new Master.Options(options);

  return new Master(options);
}

module.exports = {
  createMaster: createMaster,
  functions: functions,
  Register: require('./Register')
};

},{"./Master":11,"./Register":13,"./connections/BleConnection":16,"./connections/NoConnection":17,"./connections/SerialConnection":18,"./connections/TcpConnection":19,"./connections/UdpConnection":20,"./connections/WebsocketConnection":21,"./functions":64,"./transports/AsciiTransport":67,"./transports/IpTransport":68,"./transports/RtuTransport":69,"./transports/TunnelTransport":70}],67:[function(require,module,exports){
(function (Buffer){
'use strict';

var util = require('util');
var buffers = require('h5.buffers');
var errors = require('../errors');
var Transport = require('../Transport');

module.exports = AsciiTransport;

/**
 * @private
 * @const
 * @type {number}
 */
var FRAME_START = 0x3A;

/**
 * @private
 * @const
 * @type {number}
 */
var FRAME_CR = 0x0D;

/**
 * @private
 * @const
 * @type {number}
 */
var FRAME_LF = 0x0A;

/**
 * @constructor
 * @extends {Transport}
 * @param {Connection} connection
 * @event request Emitted right before the ADU is passed to the underlying
 * `Connection`.
 */
function AsciiTransport(connection)
{
  Transport.call(this, connection);

  /**
   * @private
   * @type {Transaction}
   */
  this.transaction = null;

  /**
   * @private
   * @type {h5.buffers.BufferQueueReader}
   */
  this.reader = new buffers.BufferQueueReader();

  /**
   * @private
   * @type {number}
   */
  this.lastByte = -1;

  /**
   * @private
   * @type {function(function)}
   */
  this.handleTimeout = this.handleTimeout.bind(this);

  this.connection.on('data', this.onData.bind(this));
}

util.inherits(AsciiTransport, Transport);

AsciiTransport.prototype.destroy = function()
{
  this.removeAllListeners();

  if (this.connection !== null)
  {
    this.connection.destroy();
    this.connection = null;
  }

  if (this.transaction !== null)
  {
    this.transaction.destroy();
    this.transaction = null;
  }
};

/**
 * @param {Transaction} transaction
 * @throws {Error}
 */
AsciiTransport.prototype.sendRequest = function(transaction)
{
  if (this.transaction !== null)
  {
    throw new Error(
      "Can not send another request while the previous one "
        + "has not yet completed."
    );
  }

  this.transaction = transaction;

  var adu = this.getAdu(transaction);

  this.emit('request', transaction);

  this.connection.write(adu);

  transaction.start(this.handleTimeout);
};

/**
 * @private
 * @param {Transaction} transaction
 * @returns {Buffer}
 */
AsciiTransport.prototype.getAdu = function(transaction)
{
  var adu = transaction.getAdu();

  if (adu === null)
  {
    adu = this.buildAdu(transaction);
  }

  return adu;
};

/**
 * @private
 * @param {Transaction} transaction
 * @returns {Buffer}
 */
AsciiTransport.prototype.buildAdu = function(transaction)
{
  var request = transaction.getRequest();
  var pdu = request.toBuffer();
  var adu = this.frame(transaction.getUnit(), pdu);

  transaction.setAdu(adu);

  return adu;
};

/**
 * @private
 * @param {number} unit
 * @param {Buffer} pdu
 * @returns {Buffer}
 */
AsciiTransport.prototype.frame = function(unit, pdu)
{
  var frame = new Buffer(7 + pdu.length * 2);
  var i = 0;

  frame[i++] = FRAME_START;
  frame[i++] = this.encodeNibble(this.high(unit));
  frame[i++] = this.encodeNibble(this.low(unit));

  for (var j = 0, l = pdu.length; j < l; ++j)
  {
    frame[i++] = this.encodeNibble(this.high(pdu[j]));
    frame[i++] = this.encodeNibble(this.low(pdu[j]));
  }

  var checksum = this.lrc(unit, pdu);

  frame[i++] = this.encodeNibble(this.high(checksum));
  frame[i++] = this.encodeNibble(this.low(checksum));
  frame[i++] = FRAME_CR;
  frame[i] = FRAME_LF;

  return frame;
};

/**
 * @private
 * @param {number} initial
 * @param {Buffer|Array.<number>} buffer
 * @returns {number}
 */
AsciiTransport.prototype.lrc = function(initial, buffer)
{
  var result = initial & 0xFF;

  for (var i = 0, l = buffer.length; i < l; ++i)
  {
    result += buffer[i] & 0xFF;
  }

  return ((result ^ 0xFF) + 1) & 0xFF;
};

/**
 * @private
 * @param {number} byt3
 * @returns {number}
 */
AsciiTransport.prototype.high = function(byt3)
{
  return ((byt3 & 0xF0) >>> 4) & 0xFF;
};

/**
 * @private
 * @param {number} byt3
 * @returns {number}
 */
AsciiTransport.prototype.low = function(byt3)
{
  return ((byt3 & 0x0F) >>> 0) & 0xFF;
};

/**
 * @private
 * @param {number} nibble
 * @returns {number}
 */
AsciiTransport.prototype.encodeNibble = function(nibble)
{
  return nibble + (nibble < 10 ? 48 : 55);
};

/**
 * @private
 * @param {number} nibble
 * @returns {number}
 */
AsciiTransport.prototype.decodeNibble = function(nibble)
{
  return nibble - (nibble < 65 ? 48 : 55);
};

/**
 * @private
 * @param {number} highNibble
 * @param {number} lowNibble
 * @returns {number}
 */
AsciiTransport.prototype.decodeByte = function(highNibble, lowNibble)
{
  return (this.decodeNibble(highNibble) << 4)
    + (this.decodeNibble(lowNibble) << 0);
};

/**
 * @private
 * @param {Array.<number>} bytes
 * @returns {Array.<number>}
 */
AsciiTransport.prototype.decodeBytes = function(bytes)
{
  var result = [];

  while (bytes.length > 0)
  {
    result.push(this.decodeByte(bytes.shift(), bytes.shift()));
  }

  return result;
};

/**
 * @private
 */
AsciiTransport.prototype.handleTimeout = function()
{
  this.skipResponseData();
};

/**
 * @private
 */
AsciiTransport.prototype.skipResponseData = function()
{
  if (this.reader.length > 0)
  {
    this.reader.skip(this.reader.length);
  }

  this.transaction = null;
};

/**
 * @private
 * @param {Buffer} data
 */
AsciiTransport.prototype.onData = function(data)
{
  var transaction = this.transaction;

  if (transaction === null)
  {
    return;
  }

  if (!this.isValidChunk(data))
  {
    this.skipResponseData();

    transaction.handleError(new errors.InvalidResponseDataError());

    return;
  }

  this.reader.push(data);

  if (this.endsWithCrLf(data))
  {
    this.handleFrameData();
  }
};

/**
 * @private
 * @param {Buffer} chunk
 * @returns {boolean}
 */
AsciiTransport.prototype.isValidChunk = function(chunk)
{
  return this.reader.length > 0 || chunk[0] === FRAME_START;
};

/**
 * @private
 * @param {Buffer} chunk
 * @returns {boolean}
 */
AsciiTransport.prototype.endsWithCrLf = function(chunk)
{
  var lastByte = this.lastByte;

  this.lastByte = chunk[chunk.length - 1];

  if (chunk.length === 1)
  {
    return lastByte === FRAME_CR && chunk[0] === FRAME_LF;
  }

  return chunk[chunk.length - 2] === FRAME_CR && this.lastByte === FRAME_LF;
};

/**
 * @private
 */
AsciiTransport.prototype.handleFrameData = function()
{
  this.reader.skip(1);

  var frame = this.decodeBytes(this.reader.shiftBytes(this.reader.length - 2));
  var checksum = frame.pop();
  var transaction = this.transaction;

  this.skipResponseData();

  var validationError = this.validate(transaction, frame, checksum);

  if (validationError !== null)
  {
    transaction.handleError(validationError);

    return;
  }

  var request = transaction.getRequest();

  try
  {
    transaction.handleResponse(request.createResponse(new Buffer(frame)));
  }
  catch (error)
  {
    transaction.handleError(error);
  }
};

/**
 * @private
 * @param {Transaction} transaction
 * @param {Array.<number>} frame
 * @param {number} expectedChecksum
 * @returns {Error|null}
 */
AsciiTransport.prototype.validate =
  function(transaction, frame, expectedChecksum)
{
  var actualChecksum = this.lrc(0, frame);

  if (actualChecksum !== expectedChecksum)
  {
    return new errors.InvalidChecksumError();
  }

  var expectedUnit = transaction.getUnit();
  var actualUnit = frame.shift();

  if (actualUnit !== expectedUnit)
  {
    return new errors.InvalidResponseDataError(util.format(
      "Invalid unit specified in the MODBUS response. Expected: %d, got: %d.",
      expectedUnit,
      actualUnit
    ));
  }

  return null;
};

}).call(this,require("buffer").Buffer)
},{"../Transport":15,"../errors":22,"buffer":3,"h5.buffers":75,"util":9}],68:[function(require,module,exports){
'use strict';

var util = require('util');
var buffers = require('h5.buffers');
var Transport = require('../Transport');
var InvalidResponseDataError = require('../errors').InvalidResponseDataError;

module.exports = IpTransport;

/**
 * @constructor
 * @extends {Transport}
 * @param {Connection} connection
 * @event request Emitted right before the ADU is passed to the underlying
 * `Connection`.
 */
function IpTransport(connection)
{
  Transport.call(this, connection);

  /**
   * @type {h5.buffers.BufferQueueReader}
   */
  this.reader = new buffers.BufferQueueReader();

  /**
   * @type {IpTransport.Header}
   */
  this.header = new IpTransport.Header();

  /**
   * @private
   * @type {number}
   */
  this.nextTransactionId = 0;

  /**
   * @private
   * @type {object.<number, Transaction>}
   */
  this.transactions = {};

  this.connection.on('data', this.onData.bind(this));
}

util.inherits(IpTransport, Transport);

/**
 * @constructor
 */
IpTransport.Header = function()
{
  /**
   * @type {number}
   */
  this.id = -1;

  /**
   * @type {number}
   */
  this.version = -1;

  /**
   * @type {number}
   */
  this.length = -1;

  /**
   * @type {number}
   */
  this.unit = -1;
};

/**
 * @param {h5.buffers.BufferQueueReader} bufferReader
 */
IpTransport.Header.prototype.read = function(bufferReader)
{
  this.id = bufferReader.shiftUInt16();
  this.version = bufferReader.shiftUInt16();
  this.length = bufferReader.shiftUInt16() - 1;
  this.unit = bufferReader.shiftByte();
};

/**
 * @param {Transaction} transaction
 * @returns {InvalidResponseDataError|null}
 */
IpTransport.Header.prototype.validate = function(transaction)
{
  var message;
  var expectedUnit = transaction.getUnit();

  if (this.version !== 0)
  {
    message = util.format(
      "Invalid version specified in the MODBUS response header. "
        + "Expected: 0, got: %d",
      this.version
    );
  }
  else if (this.length === 0)
  {
    message = "Invalid length specified in the MODBUS response header. "
      + "Expected: at least 1, got: 0.";
  }
  else if (this.unit !== expectedUnit)
  {
    message = util.format(
      "Invalid unit specified in the MODBUS response header. "
        + "Expected: %d, got: %d.",
      expectedUnit,
      this.unit
    );
  }

  return typeof message === 'undefined'
    ? null
    : new InvalidResponseDataError(message);
};

IpTransport.Header.prototype.reset = function()
{
  this.id = -1;
  this.version = -1;
  this.length = -1;
  this.unit = -1;
};

IpTransport.prototype.destroy = function()
{
  this.removeAllListeners();

  if (this.connection !== null)
  {
    this.connection.destroy();
    this.connection = null;
  }

  if (this.transactions !== null)
  {
    Object.keys(this.transactions).forEach(function(id)
    {
      this.transactions[id].destroy();
    }, this);

    this.transactions = null;
  }
};

/**
 * @param {Transaction} transaction
 */
IpTransport.prototype.sendRequest = function(transaction)
{
  var id = this.getNextTransactionId();
  var adu = this.getAdu(id, transaction);

  this.transactions[id] = transaction;

  this.emit('request', transaction);

  this.connection.write(adu);

  transaction.start(this.createTimeoutHandler(id));
};

/**
 * @private
 * @returns {number}
 */
IpTransport.prototype.getNextTransactionId = function()
{
  if (++this.nextTransactionId === 0xFFFF)
  {
    this.nextTransactionId = 0;
  }

  return this.nextTransactionId;
};

/**
 * @private
 * @param {number} id
 * @param {Transaction} transaction
 * @returns {Buffer}
 */
IpTransport.prototype.getAdu = function(id, transaction)
{
  var adu = transaction.getAdu();

  if (adu === null)
  {
    adu = this.buildAdu(id, transaction);
  }
  else
  {
    adu.writeUInt16BE(id, 0);
  }

  return adu;
};

/**
 * @private
 * @param {number} id
 * @param {Transaction} transaction
 * @returns {Buffer}
 */
IpTransport.prototype.buildAdu = function(id, transaction)
{
  var request = transaction.getRequest();
  var pdu = request.toBuffer();
  var adu = this.frame(id, transaction.getUnit(), pdu);

  transaction.setAdu(adu);

  return adu;
};

/**
 * @private
 * @param {number} id
 * @param {number} unit
 * @param {Buffer} pdu
 * @returns {Buffer}
 */
IpTransport.prototype.frame = function(id, unit, pdu)
{
  var builder = new buffers.BufferBuilder();

  builder.pushUInt16(id);
  builder.pushUInt16(0);
  builder.pushUInt16(pdu.length + 1);
  builder.pushByte(unit);
  builder.pushBuffer(pdu);

  return builder.toBuffer();
};

/**
 * @private
 * @param {number} id
 * @returns {function}
 */
IpTransport.prototype.createTimeoutHandler = function(id)
{
  var transactions = this.transactions;

  return function()
  {
    if (typeof transactions[id] !== 'undefined')
    {
      delete transactions[id];
    }
  };
};

/**
 * @private
 * @param {Buffer} [data]
 */
IpTransport.prototype.onData = function(data)
{
  if (typeof data !== 'undefined')
  {
    this.reader.push(data);
  }

  if (this.header.id === -1 && this.reader.length >= 7)
  {
    this.header.read(this.reader);
  }

  if (this.header.id !== -1 && this.reader.length >= this.header.length)
  {
    this.handleFrameData();
  }
};

/**
 * @private
 */
IpTransport.prototype.handleFrameData = function()
{
  var transaction = this.transactions[this.header.id];

  if (typeof transaction === 'undefined')
  {
    this.skipResponseData();
    this.onData();

    return;
  }

  delete this.transactions[this.header.id];

  var validationError = this.header.validate(transaction);

  if (validationError !== null)
  {
    this.skipResponseData();

    transaction.handleError(validationError);

    this.onData();

    return;
  }

  var responseBuffer = this.reader.shiftBuffer(this.header.length);

  this.header.reset();

  var request = transaction.getRequest();

  try
  {
    transaction.handleResponse(request.createResponse(responseBuffer));
  }
  catch (error)
  {
    transaction.handleError(error);
  }

  this.onData();
};

/**
 * @private
 */
IpTransport.prototype.skipResponseData = function()
{
  if (this.header.length > 0)
  {
    this.reader.skip(this.header.length);
  }

  this.header.reset();
};

},{"../Transport":15,"../errors":22,"h5.buffers":75,"util":9}],69:[function(require,module,exports){
'use strict';

var util = require('util');
var buffers = require('h5.buffers');
var errors = require('../errors');
var Transport = require('../Transport');

module.exports = RtuTransport;

/**
 * @private
 * @const
 * @type {number}
 */
var MIN_FRAME_LENGTH = 5;

/**
 * @private
 * @const
 * @type {Array.<number>}
 */
var CRC_TABLE = [
  0x0000, 0xC0C1, 0xC181, 0x0140, 0xC301, 0x03C0, 0x0280, 0xC241,
  0xC601, 0x06C0, 0x0780, 0xC741, 0x0500, 0xC5C1, 0xC481, 0x0440,
  0xCC01, 0x0CC0, 0x0D80, 0xCD41, 0x0F00, 0xCFC1, 0xCE81, 0x0E40,
  0x0A00, 0xCAC1, 0xCB81, 0x0B40, 0xC901, 0x09C0, 0x0880, 0xC841,
  0xD801, 0x18C0, 0x1980, 0xD941, 0x1B00, 0xDBC1, 0xDA81, 0x1A40,
  0x1E00, 0xDEC1, 0xDF81, 0x1F40, 0xDD01, 0x1DC0, 0x1C80, 0xDC41,
  0x1400, 0xD4C1, 0xD581, 0x1540, 0xD701, 0x17C0, 0x1680, 0xD641,
  0xD201, 0x12C0, 0x1380, 0xD341, 0x1100, 0xD1C1, 0xD081, 0x1040,
  0xF001, 0x30C0, 0x3180, 0xF141, 0x3300, 0xF3C1, 0xF281, 0x3240,
  0x3600, 0xF6C1, 0xF781, 0x3740, 0xF501, 0x35C0, 0x3480, 0xF441,
  0x3C00, 0xFCC1, 0xFD81, 0x3D40, 0xFF01, 0x3FC0, 0x3E80, 0xFE41,
  0xFA01, 0x3AC0, 0x3B80, 0xFB41, 0x3900, 0xF9C1, 0xF881, 0x3840,
  0x2800, 0xE8C1, 0xE981, 0x2940, 0xEB01, 0x2BC0, 0x2A80, 0xEA41,
  0xEE01, 0x2EC0, 0x2F80, 0xEF41, 0x2D00, 0xEDC1, 0xEC81, 0x2C40,
  0xE401, 0x24C0, 0x2580, 0xE541, 0x2700, 0xE7C1, 0xE681, 0x2640,
  0x2200, 0xE2C1, 0xE381, 0x2340, 0xE101, 0x21C0, 0x2080, 0xE041,
  0xA001, 0x60C0, 0x6180, 0xA141, 0x6300, 0xA3C1, 0xA281, 0x6240,
  0x6600, 0xA6C1, 0xA781, 0x6740, 0xA501, 0x65C0, 0x6480, 0xA441,
  0x6C00, 0xACC1, 0xAD81, 0x6D40, 0xAF01, 0x6FC0, 0x6E80, 0xAE41,
  0xAA01, 0x6AC0, 0x6B80, 0xAB41, 0x6900, 0xA9C1, 0xA881, 0x6840,
  0x7800, 0xB8C1, 0xB981, 0x7940, 0xBB01, 0x7BC0, 0x7A80, 0xBA41,
  0xBE01, 0x7EC0, 0x7F80, 0xBF41, 0x7D00, 0xBDC1, 0xBC81, 0x7C40,
  0xB401, 0x74C0, 0x7580, 0xB541, 0x7700, 0xB7C1, 0xB681, 0x7640,
  0x7200, 0xB2C1, 0xB381, 0x7340, 0xB101, 0x71C0, 0x7080, 0xB041,
  0x5000, 0x90C1, 0x9181, 0x5140, 0x9301, 0x53C0, 0x5280, 0x9241,
  0x9601, 0x56C0, 0x5780, 0x9741, 0x5500, 0x95C1, 0x9481, 0x5440,
  0x9C01, 0x5CC0, 0x5D80, 0x9D41, 0x5F00, 0x9FC1, 0x9E81, 0x5E40,
  0x5A00, 0x9AC1, 0x9B81, 0x5B40, 0x9901, 0x59C0, 0x5880, 0x9841,
  0x8801, 0x48C0, 0x4980, 0x8941, 0x4B00, 0x8BC1, 0x8A81, 0x4A40,
  0x4E00, 0x8EC1, 0x8F81, 0x4F40, 0x8D01, 0x4DC0, 0x4C80, 0x8C41,
  0x4400, 0x84C1, 0x8581, 0x4540, 0x8701, 0x47C0, 0x4680, 0x8641,
  0x8201, 0x42C0, 0x4380, 0x8341, 0x4100, 0x81C1, 0x8081, 0x4040
];

/**
 * @constructor
 * @extends {Transport}
 * @param {RtuTransport.Options|object} options
 * @event request Emitted right before the ADU is passed to the underlying
 * `Connection`.
 */
function RtuTransport(options)
{
  /**
   * @private
   * @type {RtuTransport.Options}
   */
  this.options = options instanceof RtuTransport.Options
    ? options
    : new RtuTransport.Options(options);

  Transport.call(this, this.options.connection);

  /**
   * @private
   * @type {Transaction}
   */
  this.transaction = null;

  /**
   * @private
   * @type {BufferQueueReader}
   */
  this.reader = new buffers.BufferQueueReader();

  /**
   * @private
   * @type {number|null}
   */
  this.eofTimer = null;

  /**
   * @private
   * @type {function}
   */
  this.handleFrameData = this.handleFrameData.bind(this);

  /**
   * @private
   * @type {function}
   */
  this.handleTimeout = this.handleTimeout.bind(this);

  this.connection.on('data', this.onData.bind(this));
}

util.inherits(RtuTransport, Transport);

/**
 * @constructor
 * @param {object} options
 * @param {Connection} options.connection
 * @param {number} [options.eofTimeout]
 */
RtuTransport.Options = function(options)
{
  /**
   * @type {Connection}
   */
  this.connection = options.connection;

  /**
   * @type {number}
   */
  this.eofTimeout =
    typeof options.eofTimeout === 'number' && options.eofTimeout >= 1
      ? options.eofTimeout
      : 10;
};

RtuTransport.prototype.destroy = function()
{
  this.removeAllListeners();

  this.options = null;

  if (this.connection !== null)
  {
    this.connection.destroy();
    this.connection = null;
  }

  if (this.transaction !== null)
  {
    this.transaction.destroy();
    this.transaction = null;
  }

  if (this.eofTimer !== null)
  {
    clearTimeout(this.eofTimer);
    this.eofTimer = null;
  }
};

/**
 * @param {Transaction} transaction
 * @throws {Error}
 */
RtuTransport.prototype.sendRequest = function(transaction)
{
  if (this.transaction !== null)
  {
    throw new Error(
      "Can not send another request while the previous one "
        + "has not yet completed."
    );
  }

  this.transaction = transaction;

  var adu = this.getAdu(transaction);

  this.emit('request', transaction);

  this.connection.write(adu);

  transaction.start(this.handleTimeout);
};

/**
 * @private
 * @param {Transaction} transaction
 * @returns {Buffer}
 */
RtuTransport.prototype.getAdu = function(transaction)
{
  var adu = transaction.getAdu();

  if (adu === null)
  {
    adu = this.buildAdu(transaction);
  }

  return adu;
};

/**
 * @private
 * @param {Transaction} transaction
 * @returns {Buffer}
 */
RtuTransport.prototype.buildAdu = function(transaction)
{
  var request = transaction.getRequest();
  var pdu = request.toBuffer();
  var adu = this.frame(transaction.getUnit(), pdu);

  transaction.setAdu(adu);

  return adu;
};

/**
 * @private
 * @param {number} unit
 * @param {Buffer} pdu
 * @returns {Buffer}
 */
RtuTransport.prototype.frame = function(unit, pdu)
{
  var builder = new buffers.BufferBuilder();

  builder.pushByte(unit);
  builder.pushBuffer(pdu);
  builder.pushUInt16(this.crc16(unit, pdu), true);

  return builder.toBuffer();
};

/**
 * @private
 * @param {number} firstByte
 * @param {Buffer} buffer
 * @returns {number}
 */
RtuTransport.prototype.crc16 = function(firstByte, buffer)
{
  var crc = 0xFFFF;
  var j;

  if (firstByte !== -1)
  {
    j = (crc ^ firstByte) & 0xFF;

    crc >>= 8;
    crc ^= CRC_TABLE[j];
  }

  for (var i = 0, l = buffer.length; i < l; ++i)
  {
    j = (crc ^ buffer[i]) & 0xFF;

    crc >>= 8;
    crc ^= CRC_TABLE[j];
  }

  return crc;
};

/**
 * @private
 */
RtuTransport.prototype.handleTimeout = function()
{
  if (this.eofTimer !== null)
  {
    clearTimeout(this.eofTimer);
  }

  this.skipResponseData();
};

/**
 * @private
 */
RtuTransport.prototype.skipResponseData = function()
{
  if (this.reader.length > 0)
  {
    this.reader.skip(this.reader.length);
  }

  this.transaction = null;
};

/**
 * @private
 * @param {Buffer} data
 */
RtuTransport.prototype.onData = function(data)
{
  if (this.transaction === null)
  {
    return;
  }

  this.reader.push(data);

  if (this.eofTimer !== null)
  {
    clearTimeout(this.eofTimer);
  }

  this.eofTimer = setTimeout(this.handleFrameData, this.options.eofTimeout);
};

/**
 * @private
 */
RtuTransport.prototype.handleFrameData = function()
{
  var transaction = this.transaction;

  if (this.reader.length < MIN_FRAME_LENGTH)
  {
    this.skipResponseData();

    transaction.handleError(new errors.IncompleteResponseFrameError());

    return;
  }

  var unit = this.reader.shiftByte();
  var responseBuffer = this.reader.shiftBuffer(this.reader.length - 2);
  var checksum = this.reader.shiftUInt16(true);

  this.skipResponseData();

  var validationError = this.validate(
    transaction,
    unit,
    responseBuffer,
    checksum
  );

  if (validationError !== null)
  {
    transaction.handleError(validationError);

    return;
  }

  var request = transaction.getRequest();

  try
  {
    transaction.handleResponse(request.createResponse(responseBuffer));
  }
  catch (error)
  {
    transaction.handleError(error);
  }
};

/**
 * @private
 * @param {Transaction} transaction
 * @param {number} actualUnit
 * @param {Buffer} responseBuffer
 * @param {number} expectedChecksum
 * @returns {Error|null}
 */
RtuTransport.prototype.validate =
  function(transaction, actualUnit, responseBuffer, expectedChecksum)
{
  var actualChecksum = this.crc16(actualUnit, responseBuffer);

  if (actualChecksum !== expectedChecksum)
  {
    return new errors.InvalidChecksumError();
  }

  var expectedUnit = transaction.getUnit();

  if (actualUnit !== expectedUnit)
  {
    return new errors.InvalidResponseDataError(util.format(
      "Invalid unit specified in the MODBUS response. Expected: %d, got: %d.",
      expectedUnit,
      actualUnit
    ));
  }

  return null;
};

},{"../Transport":15,"../errors":22,"h5.buffers":75,"util":9}],70:[function(require,module,exports){
(function (Buffer){
/**
 * Implements a custom transport that allows us to behave like a slave but
 * tunnel messages to the master.  This is a non-standard MODBUS extension.
 *
 * An example scenario would be that we are a temporary device (like a diagnostic device)
 * connected to a functioning multi-drop MODBUS network.  Because the network already has
 * a functioning master, we can't blast in and act like a master, even if we would like
 * to query or request status.  According to the MODBUS rules, we can only 'speak when spoken to'.
 * The permanent master in such a network will periodically send out a poll to see if
 * we want to say something.
 *
 * The transport framing is RTU; however when a request is to be send, we wait until
 * polled by the master before sending it, and we have to wait until the next poll (at least)
 * before we get a response.  Transaction Timeouts for this kind of transport will be much longer than
 * normal RTU timeouts, and will depend on the polling rate set up in the permanent master.
 *
 */

'use strict';

var util = require('util');
var buffers = require('h5.buffers');
var errors = require('../errors');
var Transport = require('../Transport');

module.exports = TunnelTransport;


/**
 * MODBUS function code for tunneling message (per Control Solutions DOC0003824A-SRS-A)
 * @private
 * @const
 * @type {number}
 */
var SLAVE_COMMAND = 71;

/**
 * @private
 * @const
 * @type {Array.<number>}
 */
var CRC_TABLE = [
  0x0000, 0xC0C1, 0xC181, 0x0140, 0xC301, 0x03C0, 0x0280, 0xC241,
  0xC601, 0x06C0, 0x0780, 0xC741, 0x0500, 0xC5C1, 0xC481, 0x0440,
  0xCC01, 0x0CC0, 0x0D80, 0xCD41, 0x0F00, 0xCFC1, 0xCE81, 0x0E40,
  0x0A00, 0xCAC1, 0xCB81, 0x0B40, 0xC901, 0x09C0, 0x0880, 0xC841,
  0xD801, 0x18C0, 0x1980, 0xD941, 0x1B00, 0xDBC1, 0xDA81, 0x1A40,
  0x1E00, 0xDEC1, 0xDF81, 0x1F40, 0xDD01, 0x1DC0, 0x1C80, 0xDC41,
  0x1400, 0xD4C1, 0xD581, 0x1540, 0xD701, 0x17C0, 0x1680, 0xD641,
  0xD201, 0x12C0, 0x1380, 0xD341, 0x1100, 0xD1C1, 0xD081, 0x1040,
  0xF001, 0x30C0, 0x3180, 0xF141, 0x3300, 0xF3C1, 0xF281, 0x3240,
  0x3600, 0xF6C1, 0xF781, 0x3740, 0xF501, 0x35C0, 0x3480, 0xF441,
  0x3C00, 0xFCC1, 0xFD81, 0x3D40, 0xFF01, 0x3FC0, 0x3E80, 0xFE41,
  0xFA01, 0x3AC0, 0x3B80, 0xFB41, 0x3900, 0xF9C1, 0xF881, 0x3840,
  0x2800, 0xE8C1, 0xE981, 0x2940, 0xEB01, 0x2BC0, 0x2A80, 0xEA41,
  0xEE01, 0x2EC0, 0x2F80, 0xEF41, 0x2D00, 0xEDC1, 0xEC81, 0x2C40,
  0xE401, 0x24C0, 0x2580, 0xE541, 0x2700, 0xE7C1, 0xE681, 0x2640,
  0x2200, 0xE2C1, 0xE381, 0x2340, 0xE101, 0x21C0, 0x2080, 0xE041,
  0xA001, 0x60C0, 0x6180, 0xA141, 0x6300, 0xA3C1, 0xA281, 0x6240,
  0x6600, 0xA6C1, 0xA781, 0x6740, 0xA501, 0x65C0, 0x6480, 0xA441,
  0x6C00, 0xACC1, 0xAD81, 0x6D40, 0xAF01, 0x6FC0, 0x6E80, 0xAE41,
  0xAA01, 0x6AC0, 0x6B80, 0xAB41, 0x6900, 0xA9C1, 0xA881, 0x6840,
  0x7800, 0xB8C1, 0xB981, 0x7940, 0xBB01, 0x7BC0, 0x7A80, 0xBA41,
  0xBE01, 0x7EC0, 0x7F80, 0xBF41, 0x7D00, 0xBDC1, 0xBC81, 0x7C40,
  0xB401, 0x74C0, 0x7580, 0xB541, 0x7700, 0xB7C1, 0xB681, 0x7640,
  0x7200, 0xB2C1, 0xB381, 0x7340, 0xB101, 0x71C0, 0x7080, 0xB041,
  0x5000, 0x90C1, 0x9181, 0x5140, 0x9301, 0x53C0, 0x5280, 0x9241,
  0x9601, 0x56C0, 0x5780, 0x9741, 0x5500, 0x95C1, 0x9481, 0x5440,
  0x9C01, 0x5CC0, 0x5D80, 0x9D41, 0x5F00, 0x9FC1, 0x9E81, 0x5E40,
  0x5A00, 0x9AC1, 0x9B81, 0x5B40, 0x9901, 0x59C0, 0x5880, 0x9841,
  0x8801, 0x48C0, 0x4980, 0x8941, 0x4B00, 0x8BC1, 0x8A81, 0x4A40,
  0x4E00, 0x8EC1, 0x8F81, 0x4F40, 0x8D01, 0x4DC0, 0x4C80, 0x8C41,
  0x4400, 0x84C1, 0x8581, 0x4540, 0x8701, 0x47C0, 0x4680, 0x8641,
  0x8201, 0x42C0, 0x4380, 0x8341, 0x4100, 0x81C1, 0x8081, 0x4040
];

/**
 * @constructor
 * @extends {Transport}
 * @param {TunnelTransport.Options|object} options
 * @event request Emitted right before the ADU is passed to the underlying
 * `Connection`.
 */
function TunnelTransport(options)
{
  /**
   * @private
   * @type {TunnelTransport.Options}
   */
  this.options = options instanceof TunnelTransport.Options
    ? options
    : new TunnelTransport.Options(options);

  Transport.call(this, this.options.connection);

  /**
   * @private
   * @type {Transaction}
   */
  this.transaction = null;
  this.nextTransaction = null;

  /**
   * @private
   * @type {BufferQueueReader}
   */
  this.reader = new buffers.BufferQueueReader();

  /**
   * @private
   * @type {number|null}
   */
  this.eofTimer = null;


  /**
   * @private
   * @type {number}
   */
  this.sequence = 0;

  /**
   * @private
   * @type {function}
   */
  this.handleFrameData = this.handleFrameData.bind(this);

  /**
   * @private
   * @type {function}
   */
  this.handleTimeout = this.handleTimeout.bind(this);

  this.connection.on('data', this.onData.bind(this));
}

util.inherits(TunnelTransport, Transport);

/**
 * @constructor
 * @param {object} options
 * @param {Connection} options.connection
 * @param {number} [options.eofTimeout]
 * @param {number} [options.slaveId]
 */
TunnelTransport.Options = function(options)
{
  /**
   * @type {Connection}
   */
  this.connection = options.connection;

  /**
   * @type {number}
   */
  this.eofTimeout =
    typeof options.eofTimeout === 'number' && options.eofTimeout >= 1
      ? options.eofTimeout
      : 10;

  /**
   * @type {number}
   */
  this.slaveId =
    typeof options.slaveId === 'number' && options.slaveId >= 0
      ? options.slaveId
      : 127;
};

TunnelTransport.prototype.destroy = function()
{
  this.removeAllListeners();

  this.options = null;

  if (this.connection !== null)
  {
    this.connection.destroy();
    this.connection = null;
  }

  if (this.transaction !== null)
  {
    this.transaction.destroy();
    this.transaction = null;
  }

  if (this.nextTransaction !== null)
  {
    this.nextTransaction.destroy();
    this.nextTransaction = null;
  }

  if (this.eofTimer !== null)
  {
    clearTimeout(this.eofTimer);
    this.eofTimer = null;
  }
};

/**
 * Starts a new outgoing transaction.
 *
 * With this transport, we get the ADU ready
 * but don't launch it until the bus master
 * requests it with a SLAVE_COMMAND function code
 *
 * @param {Transaction} transaction
 * @throws {Error}
 */
TunnelTransport.prototype.sendRequest = function(transaction)
{

  // we keep track of a current transaction and a next transaction
  // but that's all... if master sends more than that, throw
  if (this.transaction !== null)
  {
    if( this.nextTransaction !== null) {
      throw new Error(
        'Sending too many requests to TunnelTransport. '
          + 'maxConcurrentRequests should be 2.'
      );
    }
    else {

      // save it for when we finish the current transaction
      this.nextTransaction = transaction;

      return;
    }
  }

  this.transaction = transaction;

  this.startTransaction();

};

/**
 * signal transaction start and init timeout
 *
 * @return {[type]} [description]
 */
TunnelTransport.prototype.startTransaction = function()
{
  if( this.transaction )
  {
    this.emit('request', this.transaction);

    this.transaction.start(this.handleTimeout);
  }
}

/**
 * Launches the response to the SLAVE_COMMAND function code
 *
 * @private
 * @param {Transaction} transaction
 * @throws {Error}
 */
TunnelTransport.prototype.sendSlaveResponse = function()
{

  var adu = this.getAdu(this.transaction);

  // set RTS line to active
  //this.connection.set( {rts: true} );

  this.connection.write(adu);

  // wait till all characters transmitted, then release RTS
  //this.connection.drain( function() {
  //  this.connection.set( {rts: false} );
  //});

};

/**
 * @private
 * @param {Transaction} transaction
 * @returns {Buffer}
 */
TunnelTransport.prototype.getAdu = function(transaction)
{
  var adu = null;

  if( transaction !== null )
  {
    adu = transaction.getAdu();
  }

  if (adu === null)
  {
    adu = this.buildAdu(transaction);
  }

  return adu;
};

/**
 * @private
 * @param {Transaction} transaction
 * @returns {Buffer}
 */
TunnelTransport.prototype.buildAdu = function(transaction)
{
  var adu;

  if( transaction !== null )
  {

    var request = transaction.getRequest();

    // put the slave command sequence number up front,
    // and use our slaveId as the unit id
    var pdu = new Buffer([SLAVE_COMMAND, this.sequence, transaction.getUnit()]);

    pdu = Buffer.concat([pdu, request.toBuffer()]);

    adu = this.frame(this.options.slaveId, pdu);

    transaction.setAdu(adu);
  }
  else
  {
    adu = this.frame( this.options.slaveId, new Buffer([SLAVE_COMMAND, this.sequence]));
  }
  return adu;
};

/**
 * @private
 * @param {number} unit
 * @param {Buffer} pdu
 * @returns {Buffer}
 */
TunnelTransport.prototype.frame = function(unit, pdu)
{
  var builder = new buffers.BufferBuilder();

  builder.pushByte(unit);
  builder.pushBuffer(pdu);
  builder.pushUInt16(this.crc16(unit, pdu), true);

  return builder.toBuffer();
};

/**
 * @private
 * @param {number} firstByte
 * @param {Buffer} buffer
 * @returns {number}
 */
TunnelTransport.prototype.crc16 = function(firstByte, buffer)
{
  var crc = 0xFFFF;
  var j;

  if (firstByte !== -1)
  {
    j = (crc ^ firstByte) & 0xFF;

    crc >>= 8;
    crc ^= CRC_TABLE[j];
  }

  for (var i = 0, l = buffer.length; i < l; ++i)
  {
    j = (crc ^ buffer[i]) & 0xFF;

    crc >>= 8;
    crc ^= CRC_TABLE[j];
  }

  return crc;
};

/**
 * @private
 */
TunnelTransport.prototype.handleTimeout = function()
{
  if (this.eofTimer !== null)
  {
    clearTimeout(this.eofTimer);
  }

  this.skipResponseData();
};

/**
 * @private
 */
TunnelTransport.prototype.flushReader = function()
{
  if (this.reader.length > 0)
  {
    this.reader.skip(this.reader.length);
  }

};

/**
 * @private
 */
TunnelTransport.prototype.skipResponseData = function()
{
  this.flushReader();

  // kill this transaction and start the next one if available
  this.transaction = this.nextTransaction;
  this.nextTransaction = null;
  this.startTransaction();
};

/**
 * Event handler for incoming data from the port
 *
 * Accumulates the data and kicks the timer.  Keep
 * doing this until there is a gap in the data
 * and the timer fires (handleFrameData).
 *
 * @private
 * @param {Buffer} data
 */
TunnelTransport.prototype.onData = function(data)
{
  this.reader.push(data);

  if (this.eofTimer !== null)
  {
    clearTimeout(this.eofTimer);
  }

  this.eofTimer = setTimeout(this.handleFrameData, this.options.eofTimeout);
};

/**
 * @private
 */
TunnelTransport.prototype.handleFrameData = function()
{

  if (this.reader.length < 4)
  {
    // we received a message that is too short to process.
    // we just ignore it, but signal an event in case anyone cares.
    this.emit( 'sniff', 'incomplete', this.reader.buffers[0] );

    this.flushReader();

    return;
  }

  // copy for event emitting before we process the data
  var rxBuffer = new Buffer(this.reader.length);
  this.reader.copy( rxBuffer );

  var unit = this.reader.shiftByte();
  var responseBuffer = this.reader.shiftBuffer(this.reader.length - 2);
  var checksum = this.reader.shiftUInt16(true);

  this.flushReader();

  var validationError = this.validate(
    transaction,
    unit,
    responseBuffer,
    checksum
  );

  if (validationError !== null)
  {
    // wrong checksum?  Ignore...
    this.emit( 'sniff', 'bad checksum',  rxBuffer );

    return;
  }


  // Emit the received message in case anybody cares about it.
  // This will include messages heard on the bus that are not
  // addressed to us, as well as those addressed to us.
  this.emit( 'sniff', 'pdu', rxBuffer );

  // Check the slave ID; on a multi-drop network
  // we might overhear messages intended for other
  // slaves.
  if (unit === this.options.slaveId)
  {

    // the message is for us
    // Check the sequence ID; if it matches our counter,
    // it is a response to the pending transaction
    if( responseBuffer[0] === SLAVE_COMMAND )
    {
      if( responseBuffer[1] === this.sequence )
      {
        //console.log('In-sequence SLAVE_COMMAND');

        // Remove the SLAVE_COMMAND function code and sequence, and
        // treat the rest of the buffer as the response to the transaction
        //
        // sequence byte is incremented to show we are ready to move on
        this.sequence = (this.sequence+1) & 255;

        // if there is a transaction in progress, close it out
        if( this.transaction !== null && responseBuffer.length > 2)
        {
          //console.log('Closing transaction');

          var transaction = this.transaction;
          this.transaction = this.nextTransaction;
          this.nextTransaction = null;

          var request = transaction.getRequest();

          try
          {
            transaction.handleResponse(request.createResponse(responseBuffer.slice(3)));
          }
          catch (error)
          {
            transaction.handleError(error);
          }

          // Start next transaction if any
          this.startTransaction();

        }
      }
      else
      {
        // sequence number is wrong.  Ignore the PDU-T, if any
        //console.log('Out-of-sequence SLAVE_COMMAND');

      }

      // Prepare and send our response to the SLAVE_COMMAND
      this.sendSlaveResponse();

    }
    else
    {
      // message to us, but not a SLAVE COMMAND
      // ignore, wait for a slave command to come
      console.log('Ignored incoming function code ' + responseBuffer[0] );
    }
  }
};

/**
 * Checks to see if we have received a valid MODBUS PDU
 *
 * @private
 * @param {Transaction} transaction
 * @param {number} actualUnit
 * @param {Buffer} responseBuffer
 * @param {number} expectedChecksum
 * @returns {Error|null}
 */
TunnelTransport.prototype.validate =
  function(transaction, actualUnit, responseBuffer, expectedChecksum)
{
  var actualChecksum = this.crc16(actualUnit, responseBuffer);

  if (actualChecksum !== expectedChecksum)
  {
    return new errors.InvalidChecksumError();
  }


  return null;
};

}).call(this,require("buffer").Buffer)
},{"../Transport":15,"../errors":22,"buffer":3,"h5.buffers":75,"util":9}],71:[function(require,module,exports){
(function (Buffer){
'use strict';

/**
 * A builder of dynamically sized `Buffer`s.
 *
 * @constructor
 * @property {number} length A number of pushed bytes.
 * @example
 * var builder = new BufferBuilder();
 *
 * builder
 *   .pushByte(0x01)
 *   .pushUInt16(12)
 *   .pushString('Hello World!');
 *
 * var buffer = builder.toBuffer();
 *
 * console.log(buffer);
 */
function BufferBuilder()
{
  /**
   * @type {number}
   */
  this.length = 0;

  /**
   * @private
   * @type {Array.<function(Buffer, number): number>}
   */
  this.data = [];
}

/**
 * Returns a new `Buffer` with all data pushed to this builder.
 *
 * The new `Buffer` will have the same length as the builder.
 *
 * @returns {Buffer} An instance of `Buffer` filled with all bytes pushed to
 * this builder.
 * @example
 * var buffer = builder.toBuffer();
 */
BufferBuilder.prototype.toBuffer = function()
{
  var buffer = new Buffer(this.length);

  this.data.reduce(function(offset, push)
  {
    return offset + push(buffer, offset);
  }, 0);

  return buffer;
};

/**
 * Appends the specified bits to this builder.
 *
 * A number of bytes corresponding to the following formula will be appended
 * to the builder:
 *
 *     var byteCount = Math.ceil(bitsArray.length / 8);
 *
 * If the number of bits is not a multiple of 8, then the remaining bits will
 * be set to `0`.
 *
 * Each 8 values from the array correspond to the 8 bits being appended to the
 * buffer as bytes. First value of the each octet is the least significant bit,
 * last value - the most significant bit.
 *
 * Truthy values become `1`'s and falsy values become `0`'s.
 *
 * For example, pushing the following array of 11 values:
 * ```
 *     [0, 1, 1, 0, 0, 1, 1, 1,
 *                     0, 1, 1]
 * ```
 * will result in 2 bytes being appended to the builder:
 * `0xE6`, because its bit representation is `11100110` and
 * `0x06`, because its bit representation is `00000011`.
 *
 * @param {Array.<boolean>} bitsArray An array of truthy and falsy values.
 * @returns {BufferBuilder} Self.
 * @throws {Error} If the specified argument is not an array.
 * @example
 * builder.pushBits([0, 0, 0, 0, 1, 1, 0, 1, 0, 1])
 * builder.pushBits((0xABCD).toString(2).split('').map(Number))
 */
BufferBuilder.prototype.pushBits = function(bitsArray)
{
  if (!Array.isArray(bitsArray))
  {
    throw new Error('Expected an array.');
  }

  var bitsCount = bitsArray.length;
  
  if (bitsCount === 0)
  {
    return this;
  }

  var byteCount = Math.ceil(bitsCount / 8);

  this.data.push(function(buffer, offset)
  {
    var bitIndex = 0;
    var byteValue = 0;

    for (var i = 0; i < bitsCount; ++i)
    {
      if (bitIndex !== 0 && bitIndex % 8 === 0)
      {
        buffer[offset++] = byteValue;

        bitIndex = 0;
        byteValue = bitsArray[i] ? 1 : 0;
      }
      else if (bitsArray[i])
      {
        byteValue |= Math.pow(2, bitIndex);
      }

      bitIndex += 1;
    }

    buffer[offset] = byteValue;

    return byteCount;
  });

  this.length += byteCount;

  return this;
};

/**
 * Appends the specified byte to this builder.
 *
 * Increases the length of the builder by 1.
 *
 * @param {number} byteValue A number between 0 and 255.
 * @returns {BufferBuilder} Self.
 * @throws {Error} If the specified argument is not a number between 0 and 255.
 * @example
 * builder.pushByte(0xFE);
 */
BufferBuilder.prototype.pushByte = function(byteValue)
{
  byteValue = parseInt(byteValue, 10);

  if (isNaN(byteValue) || byteValue < 0 || byteValue > 255)
  {
    throw new Error('Expected a number between 0 and 255.');
  }

  this.data.push(function(buffer, offset)
  {
    buffer[offset] = byteValue;

    return 1;
  });

  this.length += 1;

  return this;
};

/**
 * Appends the specified ASCII character to this builder.
 *
 * Increases the length of the builder by 1.
 *
 * @param {string} charValue An ASCII character.
 * @returns {BufferBuilder} Self.
 * @throws {ReferenceError} If no char value was specified.
 * @throws {TypeError} If the specified argument is not a string.
 * @throws {Error} If the specified argument is not an ASCII character.
 * @example
 * builder.pushChar('!');
 */
BufferBuilder.prototype.pushChar = function(charValue)
{
  var byteValue = charValue.charCodeAt(0);

  if (isNaN(byteValue) || byteValue < 0 || byteValue > 127)
  {
    throw new Error('Expected an ASCII character.');
  }

  return this.pushByte(byteValue);
};

/**
 * Appends the specified bytes to this builder.
 *
 * Increases the length of the builder by the length of the specified array.
 *
 * @param {Array.<number>} bytesArray An array of numbers between 0 and 255.
 * @returns {BufferBuilder} Self.
 * @throws {Error} If the specified argument is not an array.
 * @example
 * builder.pushBytes([0x00, 0x01, 0xAB, 0xCD]);
 */
BufferBuilder.prototype.pushBytes = function(bytesArray)
{
  if (!Array.isArray(bytesArray))
  {
    throw new Error('Expected an array.');
  }

  var bytesCount = bytesArray.length;

  if (bytesCount === 0)
  {
    return this;
  }

  this.data.push(function(buffer, offset)
  {
    for (var i = 0; i < bytesCount; ++i)
    {
      buffer[offset + i] = bytesArray[i];
    }

    return bytesCount;
  });

  this.length += bytesCount;

  return this;
};

/**
 * Appends bytes from the specified source `Buffer` to this builder.
 *
 * Increases the length of the builder by the specified source buffer.
 *
 * @param {Buffer} sourceBuffer An instance of `Buffer`.
 * @returns {BufferBuilder} Self.
 * @throws {Error} If the specified argument is not an instance of `Buffer`.
 * @example
 * builder.pushBuffer(new Buffer([0, 1, 2]));
 * builder.pushBuffer(new Buffer('Hello!'));
 */
BufferBuilder.prototype.pushBuffer = function(sourceBuffer)
{
  if (!Buffer.isBuffer(sourceBuffer))
  {
    throw new Error('Expected an instance of Buffer.');
  }

  if (sourceBuffer.length === 0)
  {
    return this;
  }

  this.data.push(function(targetBuffer, offset)
  {
    return sourceBuffer.copy(targetBuffer, offset, 0, sourceBuffer.length);
  });

  this.length += sourceBuffer.length;

  return this;
};

/**
 * Appends the specified string in the specified encoding to this builder.
 *
 * Increases the length of the builder by the byte length of the specified
 * string. Byte length is calculated using `Buffer.byteLength()` function.
 *
 * @param {string} stringValue A string value in the specified encoding.
 * @param {string} [encoding] An encoding of the specified string value.
 * Defaults to `utf8`.
 * @returns {BufferBuilder} Self.
 * @throws {Error} If the specified value is not a string.
 * @example
 * builder.pushString('Hęłłó!');
 * builder.pushString('Hello!', 'ascii');
 */
BufferBuilder.prototype.pushString = function(stringValue, encoding)
{
  if (typeof stringValue !== 'string')
  {
    throw new Error('Expected a string.');
  }

  if (stringValue.length === 0)
  {
    return this;
  }

  if (!encoding)
  {
    encoding = 'utf8';
  }

  this.data.push(function(buffer, offset)
  {
    return buffer.write(stringValue, offset, encoding);
  });

  this.length += Buffer.byteLength(stringValue, encoding);

  return this;
};

/**
 * Appends the specified string followed by NULL character (`\0`)
 * to this builder.
 *
 * Increases the length of the builder by the byte length of the specified
 * string value plus 1. Byte length is calculated using `Buffer.byteLength()`
 * function.
 *
 * @param {string} stringValue A string value in the specified encoding.
 * @param {string} [encoding] An encoding of the specified string value.
 * Defaults to `utf8`.
 * @returns {BufferBuilder} Self.
 * @throws {Error} If the specified value is not a string.
 * @example
 * builder.pushZeroString('Hęłłó!');
 * builder.pushZeroString('Hello!', 'ascii');
 */
BufferBuilder.prototype.pushZeroString = function(stringValue, encoding)
{
  return this.pushString(stringValue, encoding).pushByte(0);
};

/**
 * Appends the specified number as a signed 8-bit integer to this builder.
 *
 * Increases the length of the builder by 1.
 *
 * @param {number} numberValue A number between -128 and 127.
 * @returns {BufferBuilder} Self.
 * @throws {Error} If the specified value is not an 8-bit signed integer.
 * @example
 * builder.pushInt8(-100);
 * builder.pushInt8(10, true);
 */
BufferBuilder.prototype.pushInt8 = function(numberValue)
{
  numberValue = parseIntValue(numberValue, 0x7F, -0x80);

  this.data.push(function(buffer, offset)
  {
    buffer.writeInt8(numberValue, offset, true);

    return 1;
  });

  this.length += 1;

  return this;
};

/**
 * Appends the specified number as a signed 16-bit integer to this builder.
 *
 * Increases the length of the builder by 2.
 *
 * @param {number} numberValue A number between -32768 and 32767.
 * @param {boolean} [littleEndian] `TRUE` for little endian byte order;
 * `FALSE` for big endian. Defaults to `FALSE`.
 * @returns {BufferBuilder} Self.
 * @throws {Error} If the specified value is not a 16-bit signed integer.
 * @example
 * builder.pushInt16(12345);
 * builder.pushInt16(-12345, true);
 */
BufferBuilder.prototype.pushInt16 = function(numberValue, littleEndian)
{
  numberValue = parseIntValue(numberValue, 0x7FFF, -0x8000);

  this.data.push(function(buffer, offset)
  {
    buffer[littleEndian ? 'writeInt16LE' : 'writeInt16BE'](
      numberValue, offset, true
    );

    return 2;
  });

  this.length += 2;

  return this;
};

/**
 * Appends the specified number as a signed 32-bit integer to this builder.
 *
 * Increases the length of the builder by 4.
 *
 * @param {number} numberValue A number between -2147483648 and 2147483647.
 * @param {boolean} [littleEndian] `TRUE` for little endian byte order;
 * `FALSE` for big endian. Defaults to `FALSE`.
 * @returns {BufferBuilder} Self.
 * @throws {Error} If the specified value is not a 32-bit signed integer.
 * @example
 * builder.pushInt32(-123456789);
 * builder.pushInt32(123456789, true);
 */
BufferBuilder.prototype.pushInt32 = function(numberValue, littleEndian)
{
  numberValue = parseIntValue(numberValue, 0x7FFFFFFF, -0x80000000);

  this.data.push(function(buffer, offset)
  {
    buffer[littleEndian ? 'writeInt32LE' : 'writeInt32BE'](
      numberValue, offset, true
    );

    return 4;
  });

  this.length += 4;

  return this;
};

/**
 * Appends the specified number as an unsigned 8-bit integer to this builder.
 *
 * Increases the length of the builder by 1.
 *
 * @param {number} numberValue A number between 0 and 255.
 * @returns {BufferBuilder} Self.
 * @throws {Error} If the specified value is not an 8-bit unsigned integer.
 * @example
 * builder.pushUInt8(255);
 * builder.pushUInt8(66, true);
 */
BufferBuilder.prototype.pushUInt8 = function(numberValue)
{
  numberValue = parseIntValue(numberValue, 0xFF, 0x00);

  this.data.push(function(buffer, offset)
  {
    buffer.writeUInt8(numberValue, offset, true);

    return 1;
  });

  this.length += 1;

  return this;
};

/**
 * Appends the specified number as an unsigned 16-bit integer to this builder.
 *
 * Increases the length of the builder by 2.
 *
 * @param {number} numberValue A number between 0 and 65535.
 * @param {boolean} [littleEndian] `TRUE` for little endian byte order;
 * `FALSE` for big endian. Defaults to `FALSE`.
 * @returns {BufferBuilder} Self.
 * @throws {Error} If the specified value is not a 16-bit unsigned integer.
 * @example
 * builder.pushUInt16(256);
 * builder.pushUInt16(1, true);
 */
BufferBuilder.prototype.pushUInt16 = function(numberValue, littleEndian)
{
  numberValue = parseIntValue(numberValue, 0xFFFF, 0x0000);

  this.data.push(function(buffer, offset)
  {
    buffer[littleEndian ? 'writeUInt16LE' : 'writeUInt16BE'](
      numberValue, offset, true
    );

    return 2;
  });

  this.length += 2;

  return this;
};

/**
 * Appends the specified number as an unsigned 32-bit integer to this builder.
 *
 * Increases the length of the builder by 4.
 *
 * @param {number} numberValue A number between 0 and 4294967295.
 * @param {boolean} [littleEndian] `TRUE` for little endian byte order;
 * `FALSE` for big endian. Defaults to `FALSE`.
 * @returns {BufferBuilder} Self.
 * @throws {Error} If the specified value is not a 32-bit unsigned integer.
 * @example
 * builder.pushUInt32(4000111222);
 * builder.pushUInt32(4000111222, true);
 */
BufferBuilder.prototype.pushUInt32 = function(numberValue, littleEndian)
{
  numberValue = parseIntValue(numberValue, 0xFFFFFFFF, 0x00000000);

  this.data.push(function(buffer, offset)
  {
    buffer[littleEndian ? 'writeUInt32LE' : 'writeUInt32BE'](
      numberValue, offset, true
    );

    return 4;
  });

  this.length += 4;

  return this;
};

/**
 * Appends the specified number as a signed 32 bit floating-point number
 * defined in IEEE 754.
 *
 * Increases the length of the builder by 4.
 *
 * @param {number} numberValue A number between -3.4028234663852886e+38
 * and 3.4028234663852886e+38.
 * @param {boolean} [littleEndian] `TRUE` for little endian byte order;
 * `FALSE` for big endian. Defaults to `FALSE`.
 * @returns {BufferBuilder} Self.
 * @throws {Error} If the specified value is not a float.
 * @example
 * builder.pushFloat(123.456);
 * builder.pushFloat(-123.456);
 */
BufferBuilder.prototype.pushFloat = function(numberValue, littleEndian)
{
  numberValue = parseFloatValue(
    numberValue, 3.4028234663852886e+38, -3.4028234663852886e+38
  );

  this.data.push(function(buffer, offset)
  {
    buffer[littleEndian ? 'writeFloatLE' : 'writeFloatBE'](
      numberValue, offset, true
    );

    return 4;
  });

  this.length += 4;

  return this;
};

/**
 * Appends the specified number as a signed 64 bit floating-point number
 * defined in IEEE 754.
 *
 * Increases the length of the builder by 8.
 *
 * @param {number} numberValue A number between -1.7976931348623157e+308
 * and 1.7976931348623157e+308.
 * @param {boolean} [littleEndian] `TRUE` for little endian byte order;
 * `FALSE` for big endian. Defaults to `FALSE`.
 * @returns {BufferBuilder} Self.
 * @throws {Error} If the specified value is not a double.
 * @example
 * builder.pushDouble(12345.6789);
 * builder.pushDouble(-12345.99999);
 */
BufferBuilder.prototype.pushDouble = function(numberValue, littleEndian)
{
  numberValue = parseFloatValue(
    numberValue, 1.7976931348623157e+308, -1.7976931348623157e+308
  );

  this.data.push(function(buffer, offset)
  {
    buffer[littleEndian ? 'writeDoubleLE' : 'writeDoubleBE'](
      numberValue, offset, true
    );

    return 8;
  });

  this.length += 8;

  return this;
};

/**
 * @private
 * @param {number} value
 * @param {number} max
 * @param {number} min
 * @returns {number}
 * @throws {Error}
 */
function parseIntValue(value, max, min)
{
  value = parseInt(value, 10);

  if (isNaN(value) || value < min || value > max)
  {
    throw new Error('Expected an integer between ' + min + ' and ' + max + '.');
  }

  return value;
}

/**
 * @private
 * @param {number} value
 * @param {number} max
 * @param {number} min
 * @returns {number}
 * @throws {Error}
 */
function parseFloatValue(value, max, min)
{
  value = parseFloat(value, 10);

  if (isNaN(value) || value < min || value > max)
  {
    throw new Error(
      'Expected a floating-point number between ' + min + ' and ' + max + '.'
    );
  }

  return value;
}

module.exports = BufferBuilder;

}).call(this,require("buffer").Buffer)
},{"buffer":3}],72:[function(require,module,exports){
(function (Buffer){
'use strict';

var toBits = require('./helpers').toBits;

/**
 * A class providing extended functionality for reading lists/streams of
 * `Buffer` instances.
 *
 * @constructor
 * @param {...Buffer} [bufferN] An optional buffer to push.
 * @throws {Error} If any of the specified buffers aren't instances of `Buffer`.
 * @property {number} length The remaining length of the reader.
 * @example
 * var reader = new BufferQueueReader(new Buffer(3), new Buffer(8));
 *
 * reader.push(new Buffer(10));
 * reader.push(new Buffer(5));
 * reader.push(new Buffer(16));
 *
 * console.log('int16=', reader.shiftInt16());
 * console.log('uint32=', reader.shiftUInt32());
 * console.log('bits=', reader.readBits(0, 12));
 *
 * reader.skip(2);
 *
 * console.log('double=', reader.shiftDouble());
 */
function BufferQueueReader()
{
  /**
   * @type {number}
   */
  this.length = 0;

  /**
   * @private
   * @type {number}
   */
  this.offset = 0;

  /**
   * @private
   * @type {Array.<Buffer>}
   */
  this.buffers = [];
  
  for (var i = 0, l = arguments.length; i < l; ++i)
  {
    this.push(arguments[i]);
  }
}

/**
 * Adds the specified buffers to the reader.
 *
 * Empty buffers are ignored.
 *
 * @param {...Buffer} bufferN An optional buffer to push.
 * @throws {Error} If any of the specified buffers aren't an instance
 * of `Buffer`.
 * @example
 * reader.push(new Buffer('Hello'), new Buffer(' '), new Buffer('World!'));
 */
BufferQueueReader.prototype.push = function()
{
  for (var i = 0, l = arguments.length; i < l; ++i)
  {
    var buffer = arguments[i];
    
    if (!Buffer.isBuffer(buffer))
    {
      throw new Error("The buffer must be an instance of Buffer.");
    }
    
    if (buffer.length === 0)
    {
      continue;
    }
    
    this.buffers.push(buffer);
    
    this.length += buffer.length;
  }
};

/**
 * Skips the specified number of bytes.
 *
 * If the byte count was not specified or it's value is greater than the length
 * of the reader, skips all the bytes to the end.
 *
 * @param {number} [count] A number of bytes to skip.
 * Defaults to the reader's length.
 * @throws {Error} If the count is not a number greater than or equal to 0.
 * @example
 * reader.skip(10);
 */
BufferQueueReader.prototype.skip = function(count)
{
  count = arguments.length ? parseInt(count, 10) : this.length;

  if (isNaN(count) || count < 0)
  {
    throw new Error(
      "The byte count must be a number greater than or equal to 0."
    );
  }

  if (count > this.length)
  {
    count = this.length;
  }
  
  this.offset += count;
  this.length -= count;
  
  var buffer;
  
  while (this.buffers.length > 0
    && (buffer = this.buffers[0]).length <= this.offset)
  {
    this.buffers.shift();
    
    this.offset -= buffer.length;
  }
};

/**
 * Returns a position of the next occurence of the specified byte after
 * the specified starting index.
 *
 * @param {number} searchElement A byte value to search for.
 * @param {number} [fromIndex] A starting index. Defaults to 0 (the beginning).
 * @returns {number} A position of the found element (starting at 0)
 * or -1 if the search element was not found.
 * @throws {Error} If the search element is not a number between 0x00 and 0xFF.
 * @throws {Error} If the starting index is not a number between 0
 * and the reader's length.
 * @example
 * var index = reader.indexOf(0xFF, 20);
 */
BufferQueueReader.prototype.indexOf = function(searchElement, fromIndex)
{
  /*jshint maxstatements:22*/

  searchElement = parseInt(searchElement, 10);

  if (isNaN(searchElement) || searchElement < 0x00 || searchElement > 0xFF)
  {
    throw new Error(
      "The search element must be a number between 0x00 and 0xFF."
    );
  }

  fromIndex = arguments.length >= 2 ? parseInt(fromIndex, 10) : 0;

  if (isNaN(fromIndex) || fromIndex < 0 || fromIndex > this.length)
  {
    throw new Error(
      "The search starting index must be a number between 0 "
      + "and the reader's length."
    );
  }
  
  var offset = this.offset + fromIndex;
  var index = 0;
  var buffer = this.buffers[index];
  
  while (index < this.buffers.length && offset >= buffer.length)
  {
    offset -= buffer.length;
    buffer = this.buffers[++index];
  }

  var totalOffset = fromIndex;
  
  while (index < this.buffers.length)
  {
    if (buffer[offset] === searchElement)
    {
      return totalOffset;
    }
    
    offset += 1;
    totalOffset += 1;
    
    if (offset >= buffer.length)
    {
      offset = 0;
      buffer = this.buffers[++index];
    }
  }
  
  return -1;
};

/**
 * Copies bytes from the reader to the specified target buffer.
 *
 * @param {Buffer} targetBuffer A buffer to copy to.
 * @param {number} [targetStart] A position at which writing to the buffer
 * should begin. Defaults to 0 (the beginning).
 * @param {number} [sourceStart] A position from which writing from the reader
 * should begin. Defaults to 0 (the beginning).
 * @param {number} [sourceEnd] A position at which writing from
 * the reader should end. Defaults to the end (the reader's length).
 * @returns {number} A number of bytes written.
 * @throws {Error} If the specified target buffer is not an instance of Buffer.
 * @throws {Error} If the specified target start index is not a number between
 * 0 and the target buffer's length.
 * @throws {Error} If the specified source start index is not a number between
 * 0 and the reader's length (exclusive).
 * @throws {Error} If the specified source end index is not a number between
 * 0 (exclusive) and the reader's length.
 * @throws {Error} If the specified source start index is greater than
 * or equal to the source end index.
 * @example
 * var buffer = new Buffer(10);
 *
 * reader.copy(buffer, 5, 0, 5);
 */
BufferQueueReader.prototype.copy = function(
  targetBuffer, targetStart, sourceStart, sourceEnd)
{
  /*jshint maxstatements:32*/

  if (!Buffer.isBuffer(targetBuffer))
  {
    throw new Error("The target buffer must be an instance of Buffer.");
  }

  targetStart = arguments.length >= 2 ? parseInt(targetStart, 10) : 0;

  if (isNaN(targetStart)
    || targetStart < 0
    || targetStart > targetBuffer.length)
  {
    throw new Error(
      "The target starting index must be a number greater than or "
      + "equal to 0 and less than or equal to the target buffer's length."
    );
  }

  sourceStart = arguments.length >= 3 ? parseInt(sourceStart, 10) : 0;

  if (isNaN(sourceStart) || sourceStart < 0 || sourceStart >= this.length)
  {
    throw new Error(
      "The source starting index must be a number greater than or "
      + "equal to 0 and less than the reader's length."
    );
  }

  sourceEnd = arguments.length >= 4 ? parseInt(sourceEnd, 10) : this.length;

  if (isNaN(sourceEnd) || sourceEnd < 1 || sourceEnd > this.length)
  {
    throw new Error(
      "The source ending index must be a number greater than 0 and "
      + "less than or equal to the reader's length."
    );
  }

  if (sourceStart >= sourceEnd)
  {
    throw new Error(
      "The source start index must be less than the source end index."
    );
  }

  var offset = this.offset + sourceStart;
  var index = 0;
  var buffer;

  while ((buffer = this.buffers[index++]).length <= offset)
  {
    offset -= buffer.length;
  }

  var count = sourceEnd - sourceStart;

  if (buffer.length >= offset + count)
  {
    return buffer.copy(targetBuffer, targetStart, offset, offset + count);
  }

  var totalWritten = 0;

  while (count)
  {
    var written = buffer.copy(
      targetBuffer, targetStart, offset, Math.min(buffer.length, offset + count)
    );

    targetStart += written;
    totalWritten += written;
    count -= written;
    offset += written;

    if (offset >= buffer.length)
    {
      offset = 0;
      buffer = this.buffers[index++];
    }
  }

  return totalWritten;
};

/**
 * Shifts an array of bits (boolean values) from the reader.
 *
 * Decreases the reader's length by a number of bytes that is needed to
 * extract the specified number of bits
 * (e.g. 4, 8 bits=1 byte, 9, 13, 16 bits=2 bytes etc.).
 *
 * @param {number} count A number of bits to shift.
 * Must be between 1 and the reader's length multiplied by 8.
 * @returns {Array.<boolean>} An array of bits.
 * @throws {Error} If the specified count is not a number between 1 and
 * the reader's length multiplied by 8.
 * @example
 * var bitsArray = reader.shiftBits(13);
 */
BufferQueueReader.prototype.shiftBits = function(count)
{
  return toBits(this.shiftBytes(Math.ceil(count / 8)), count);
};

/**
 * Shifts a byte from the reader.
 *
 * Decreases the reader's length by 1.
 *
 * @returns {number} A number between 0x00 and 0xFF.
 * @throws {Error} If the reader is empty.
 * @example
 * var byteValue = reader.shiftByte();
 */
BufferQueueReader.prototype.shiftByte = function()
{
  if (this.length === 0)
  {
    throw new Error("The reader is empty.");
  }

  var buffer = this.buffers[0];
  var byteValue = buffer[this.offset++];

  this.length -= 1;

  if (this.offset >= buffer.length)
  {
    this.buffers.shift();

    this.offset -= buffer.length;
  }

  return byteValue;
};

/**
 * Shifts an ASCII character from the reader.
 *
 * Decreases the reader's length by 1.
 *
 * @returns {string} An ASCII character.
 * @throws {Error} If the reader is empty.
 * @example
 * var charValue = reader.shiftChar();
 */
BufferQueueReader.prototype.shiftChar = function()
{
  return String.fromCharCode(this.shiftByte());
};

/**
 * Shifts the specified number of bytes from the reader.
 *
 * Decreases the reader's length by the specified byte count.
 *
 * @param {number} count A number of bytes to shift.
 * Must be between 1 and the reader's length.
 * @returns {Array.<number>} An array of bytes.
 * @throws {Error} If the specified count is not a number between 1 and
 * the reader's length.
 * @example
 * var bytesArray = reader.shiftBytes(6);
 */
BufferQueueReader.prototype.shiftBytes = function(count)
{
  count = parseInt(count, 10);

  if (isNaN(count) || count < 1 || count > this.length)
  {
    throw new Error(
      "The byte count must be a number greater than 0 and "
      + "less than or equal to the reader's length."
    );
  }

  this.length -= count;

  var byteArray = [];

  while (count--)
  {
    var buffer = this.buffers[0];

    byteArray.push(buffer[this.offset++]);

    if (this.offset >= buffer.length)
    {
      this.buffers.shift();

      this.offset -= buffer.length;
    }
  }

  return byteArray;
};

/**
 * Shifts the specified number of bytes as an instance of Buffer.
 *
 * Decreases the reader's length by the specified byte count.
 *
 * @param {number} count A number of bytes to shift.
 * Must be between 1 and the reader's length.
 * @returns {Buffer} A buffer of the specified size.
 * @throws {Error} If the specified count is not a number between 1 and
 * the reader's length.
 * @example
 * var buffer = reader.shiftBuffer(10);
 */
BufferQueueReader.prototype.shiftBuffer = function(count)
{
  return new Buffer(this.shiftBytes(count));
};

/**
 * Shifts the specified number of bytes as a string with
 * the specified encoding.
 *
 * Decreases the reader's length by the specified byte count.
 *
 * @param {number} length A number of bytes to shift.
 * Must be between 1 and the reader's length.
 * @param {string} [encoding] An encoding of the string. Defaults to `utf8`.
 * @returns {string} A string of the specified length.
 * @throws {Error} If the specified length is not a number between 1 and
 * the reader's length.
 * @throws {Error} If the specified encoding is not supported.
 * @example
 * var stringValue = reader.shiftString(12, 'ascii');
 */
BufferQueueReader.prototype.shiftString = function(length, encoding)
{
  return this.shiftBuffer(length).toString(encoding || 'utf8');
};

/**
 * Shifts a string from the beginning of the reader until the first
 * occurence of the NULL character (\0).
 *
 * Decreases the reader's length by the returned string's length plus one.
 *
 * @param {string} [encoding] An encoding of the string. Defaults to `utf8`.
 * @returns {string} A string constructed from the shifted bytes or empty string
 * if NULL character could not be found.
 * @throws {Error} If the specified encoding is not supported.
 * @example
 * var stringValue = reader.shiftZeroString('utf8');
 */
BufferQueueReader.prototype.shiftZeroString = function(encoding)
{
  var zeroIndex = this.indexOf(0);

  if (zeroIndex === -1)
  {
    return '';
  }

  var zeroString = this.shiftString(zeroIndex, encoding);

  this.skip(1);

  return zeroString;
};

/**
 * Shifts a signed 8 bit integer.
 *
 * Decreases the reader's length by one byte.
 *
 * @returns {number} A number between -128 and 127.
 * @throws {Error} If the reader is empty.
 * @example
 * var int8 = reader.shiftInt8();
 */
BufferQueueReader.prototype.shiftInt8 = function()
{
  return toInt8(this.shiftByte());
};

/**
 * Shifts a signed 16 bit integer.
 *
 * Decreases the reader's length by two bytes.
 *
 * @param {boolean} littleEndian Whether to use little endian
 * instead of big endian.
 * @returns {number} A number between -32768 and 32767.
 * @throws {Error} If the reader's length is less than 2.
 * @example
 * var int16BE = reader.shiftInt16();
 * var int16LE = reader.shiftInt16(true);
 */
BufferQueueReader.prototype.shiftInt16 = function(littleEndian)
{
  return toInt16(shiftUInt(this, 2, littleEndian));
};

/**
 * Shifts a signed 32 bit integer.
 *
 * Decreases the reader's length by four bytes.
 *
 * @param {boolean} littleEndian Whether to use little endian
 * instead of big endian.
 * @returns {number} A number between -2147483648 and 2147483647.
 * @throws {Error} If the reader's length is less than 4.
 * @example
 * var int32BE = reader.shiftInt32();
 * var int32LE = reader.shiftInt32(true);
 */
BufferQueueReader.prototype.shiftInt32 = function(littleEndian)
{
  return toInt32(shiftUInt(this, 4, littleEndian));
};

/**
 * Shifts an unsigned 8 bit integer.
 *
 * Decreases the reader's length by one byte.
 *
 * @returns {number} A number between 0 and 255.
 * @throws {Error} If the reader is empty.
 * @example
 * var uint8 = reader.shiftUInt8();
 */
BufferQueueReader.prototype.shiftUInt8 = function()
{
  return this.shiftByte();
};

/**
 * Shifts an unsigned 16 bit integer.
 *
 * Decreases the reader's length by two bytes.
 *
 * @param {boolean} littleEndian Whether to use little endian
 * instead of big endian.
 * @returns {number} A number between 0 and 65535.
 * @throws {Error} If the reader's length is less than 2.
 * @example
 * var uint16BE = reader.shiftUInt16();
 * var uint16LE = reader.shiftUInt16(true);
 */
BufferQueueReader.prototype.shiftUInt16 = function(littleEndian)
{
  return shiftUInt(this, 2, littleEndian);
};

/**
 * Shifts an unsigned 32 bit integer.
 *
 * Decreases the reader's length by four bytes.
 *
 * @param {boolean} littleEndian Whether to use little endian
 * instead of big endian.
 * @returns {number} A number between 0 and 4294967295.
 * @throws {Error} If the reader's length is less than 4.
 * @example
 * var uint32BE = reader.shiftUInt32();
 * var uint32LE = reader.shiftUInt32(true);
 */
BufferQueueReader.prototype.shiftUInt32 = function(littleEndian)
{
  return shiftUInt(this, 4, littleEndian);
};

/**
 * Shifts a signed 32 bit floating-point number as defined in IEEE 754.
 *
 * Decreases the reader's length by four bytes.
 *
 * @param {boolean} littleEndian Whether to use little endian
 * instead of big endian.
 * @returns {number} A 32 bit floating-point number.
 * @throws {Error} If the reader's length is less than 4.
 * @example
 * var floatBE = reader.shiftFloat();
 * var floatLE = reader.shiftFloat(true);
 */
BufferQueueReader.prototype.shiftFloat = function(littleEndian)
{
  var readFloat = littleEndian ? 'readFloatLE' : 'readFloatBE';

  return this.shiftBuffer(4)[readFloat](0, false);
};

/**
 * Shifts a signed 64 bit floating-point number as defined in IEEE 754.
 *
 * Decreases the reader's length by eight bytes.
 *
 * @param {boolean} littleEndian Whether to use little endian
 * instead of big endian.
 * @returns {number} A 64 bit floating-point number.
 * @throws {Error} If the reader's length is less than 8.
 * @example
 * var doubleBE = reader.shiftDouble();
 * var doubleLE = reader.shiftDouble(true);
 */
BufferQueueReader.prototype.shiftDouble = function(littleEndian)
{
  var readDouble = littleEndian ? 'readDoubleLE' : 'readDoubleBE';

  return this.shiftBuffer(8)[readDouble](0, false);
};

/**
 * Returns an array of bits (boolean values) starting at the specified offset.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus 1.
 * @param {number} count A number of bits to read. Must be between 1 and
 * the reader's length multiplied by 8 minus the starting index.
 * @returns {Array.<boolean>} An array of bits.
 * @throws {Error} If the specified count is not a number between 1 and the
 * reader's length multiplied by 8 minus the starting index.
 * @example
 * var bitsArray = reader.readBits(5, 13);
 */
BufferQueueReader.prototype.readBits = function(offset, count)
{
  return toBits(this.readBytes(offset, Math.ceil(count / 8)), count);
};

/**
 * Returns a byte at the specified position.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus 1.
 * @returns {number} A number between 0x00 and 0xFF.
 * @throws {Error} If the reader is empty.
 * @example
 * var byteValue = reader.readByte(1);
 */
BufferQueueReader.prototype.readByte = function(offset)
{
  offset = parseInt(offset, 10);

  if (isNaN(offset) || offset < 0 || offset >= this.length)
  {
    throw new Error(
      "The offset must be a number between 0 and the reader's length minus one."
    );
  }

  offset += this.offset;

  var index = 0;
  var buffer;

  while ((buffer = this.buffers[index++]).length <= offset)
  {
    offset -= buffer.length;
  }

  return buffer[offset];
};

/**
 * Returns an ASCII character at the specified position.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus 1.
 * @returns {string} An ASCII character.
 * @throws {Error} If the specified offset exceeds the reader's boundries.
 * @example
 * var charValue = reader.readChar(4);
 */
BufferQueueReader.prototype.readChar = function(offset)
{
  return String.fromCharCode(this.readByte(offset));
};

/**
 * Returns the specified number of bytes starting from the specified position.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus the specified count.
 * @param {number} count A number of bytes to read.
 * Must be between 1 and the reader's length minus the offset.
 * @returns {Array.<number>} An array of bytes.
 * @throws {Error} If the specified offset exceeds the reader's boundries.
 * @throws {Error} If the specified count is not a number between 1 and
 * the reader's length minus the offset.
 * @example
 * var bytesArray = reader.readBytes(0, 6);
 */
BufferQueueReader.prototype.readBytes = function(offset, count)
{
  offset = parseInt(offset, 10);

  if (isNaN(offset) || offset < 0)
  {
    throw new Error("The offset must be a number greater than 0.");
  }

  count = parseInt(count, 10);

  if (isNaN(count) || count < 1)
  {
    throw new Error("The byte count must be a number greater than 0.");
  }

  if (offset + count > this.length)
  {
    throw new Error(
      "A sum of the offset and byte count must be less than or "
      + "equal to the reader's length"
    );
  }

  offset += this.offset;

  var byteArray = [];
  var index = 0;
  var buffer;

  while ((buffer = this.buffers[index++]).length <= offset)
  {
    offset -= buffer.length;
  }

  while (count--)
  {
    byteArray.push(buffer[offset++]);
      
    if (offset >= buffer.length)
    {
      offset = 0;
      buffer = this.buffers[index++];
    }
  }

  return byteArray;
};

/**
 * Returns the specified number of bytes as an instance of Buffer
 * starting from the specified position.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus the specified count.
 * @param {number} count A number of bytes to read.
 * Must be between 1 and the reader's length minus the offset.
 * @returns {Buffer} A Buffer of bytes.
 * @throws {Error} If the specified offset exceeds the reader's boundries.
 * @throws {Error} If the specified count is not a number between 1 and
 * the reader's length minus the offset.
 * @example
 * var buffer = reader.readBuffer(5, 10);
 */
BufferQueueReader.prototype.readBuffer = function(offset, count)
{
  /*jshint maxstatements:26*/

  offset = parseInt(offset, 10);

  if (isNaN(offset) || offset < 0)
  {
    throw new Error("The offset must be a number greater than 0.");
  }

  count = parseInt(count, 10);

  if (isNaN(count) || count < 1)
  {
    throw new Error("The byte count must be a number greater than 0.");
  }

  if (offset + count > this.length)
  {
    throw new Error(
      "A sum of the offset and byte count must be less than or "
      + "equal to the reader's length"
    );
  }

  offset += this.offset;

  var index = 0;
  var buffer;

  while ((buffer = this.buffers[index++]).length <= offset)
  {
    offset -= buffer.length;
  }

  if (buffer.length >= offset + count)
  {
    return buffer.slice(offset, offset + count);
  }

  var resultBuffer = new Buffer(count);
  var resultOffset = 0;

  while (count)
  {
    var written = buffer.copy(
      resultBuffer,
      resultOffset,
      offset,
      Math.min(buffer.length, offset + count)
    );

    resultOffset += written;
    count -= written;
    offset += written;

    if (offset >= buffer.length)
    {
      offset = 0;
      buffer = this.buffers[index++];
    }
  }

  return resultBuffer;
};

/**
 * Returns the specified number of bytes as a string with
 * the specified encoding.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus the specified length.
 * @param {number} length A number of bytes to read.
 * Must be between 1 and the reader's length minus the offset.
 * @param {string} [encoding] An encoding of the string. Defaults to `utf8`.
 * @returns {string} A string of the specified length.
 * @throws {Error} If the specified offset exceeds the reader's boundries.
 * @throws {Error} If the specified length is not a number between 1 and
 * the reader's length.
 * @throws {Error} If the specified encoding is not supported.
 * @example
 * var stringValue = reader.readString(1, 12, 'ascii');
 */
BufferQueueReader.prototype.readString = function(offset, length, encoding)
{
  return this.readBuffer(offset, length).toString(encoding || 'utf8');
};

/**
 * Returns a string from the specified offset until the first
 * occurence of the NULL character (\0).
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length.
 * @param {string} [encoding] An encoding of the string. Defaults to `utf8`.
 * @returns {string} A string constructed from the read bytes or empty string if
 * NULL character could not be found.
 * @throws {Error} If the specified offset exceeds the reader's boundries.
 * @throws {Error} If the specified encoding is not supported.
 * @example
 * var stringValue = reader.readZeroString(0, 'utf8');
 */
BufferQueueReader.prototype.readZeroString = function(offset, encoding)
{
  var zeroIndex = this.indexOf(0, offset);

  if (zeroIndex === -1 || zeroIndex - offset === 0)
  {
    return '';
  }

  return this.readString(offset, zeroIndex - offset, encoding);
};

/**
 * Returns a signed 8 bit integer at the specified position.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus 1.
 * @returns {number} A number between -128 and 127.
 * @throws {Error} If the specified offset exceeds the reader's boundries.
 * @throws {Error} If the reader is empty.
 * @example
 * var int8 = reader.readInt8(5);
 */
BufferQueueReader.prototype.readInt8 = function(offset)
{
  return toInt8(this.readByte(offset));
};

/**
 * Returns a signed 16 bit integer starting from the specified position.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus 2.
 * @param {boolean} littleEndian Whether to use little endian
 * instead of big endian.
 * @returns {number} A number between -32768 and 32767.
 * @throws {Error} If the specified offset exceeds the reader's boundries.
 * @example
 * var int16BE = reader.readInt16(0);
 * var int16LE = reader.readInt16(2, true);
 */
BufferQueueReader.prototype.readInt16 = function(offset, littleEndian)
{
  return toInt16(readUInt(this, offset, 2, littleEndian));
};

/**
 * Returns a signed 32 bit integer starting from the specified position.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus 4.
 * @param {boolean} littleEndian Whether to use little endian
 * instead of big endian.
 * @returns {number} A number between -2147483648 and 2147483647.
 * @throws {Error} If the specified offset exceeds the reader's boundries.
 * @example
 * var int32BE = reader.readInt32(0);
 * var int32LE = reader.readInt32(4, true);
 */
BufferQueueReader.prototype.readInt32 = function(offset, littleEndian)
{
  return toInt32(readUInt(this, offset, 4, littleEndian));
};

/**
 * Returns an unsigned 8 bit integer at the specified position.
 *
 * @param {number} offset A starting index. Must be between 0 and
 * the reader's length minus 1.
 * @returns {number} A number between 0 and 255.
 * @throws {Error} If the specified offset exceeds the reader's boundries.
 * @example
 * var uint8 = reader.readUInt8(0);
 */
BufferQueueReader.prototype.readUInt8 = function(offset)
{
  return this.readByte(offset);
};

/**
 * Returns an unsigned 16 bit integer starting from the specified position.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus 2.
 * @param {boolean} littleEndian Whether to use little endian
 * instead of big endian.
 * @returns {number} A number between 0 and 65535.
 * @throws {Error} If the specified offset exceeds the reader's boundries.
 * @example
 * var uint16BE = reader.readUInt16(0);
 * var uint16LE = reader.readUInt16(2, true);
 */
BufferQueueReader.prototype.readUInt16 = function(offset, littleEndian)
{
  return readUInt(this, offset, 2, littleEndian);
};

/**
 * Returns an unsigned 32 bit integer starting from the specified position.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus 4.
 * @param {boolean} littleEndian Whether to use little endian
 * instead of big endian.
 * @returns {number} A number between 0 and 4294967295.
 * @throws {Error} If the specified offset exceeds the reader's boundries.
 * @example
 * var uint32BE = reader.readUInt32(0);
 * var uint32LE = reader.readUInt32(4, true);
 */
BufferQueueReader.prototype.readUInt32 = function(offset, littleEndian)
{
  return readUInt(this, offset, 4, littleEndian);
};

/**
 * Returns a signed 32 bit floating-point number as defined in IEEE 754.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus 4.
 * @param {boolean} littleEndian Whether to use little endian
 * instead of big endian.
 * @returns {number} A 32 bit floating-point number.
 * @throws {Error} If the specified offset exceeds the reader's boundries.
 * @example
 * var floatBE = reader.readFloat(0);
 * var floatLE = reader.readFloat(4, true);
 */
BufferQueueReader.prototype.readFloat = function(offset, littleEndian)
{
  var readFloat = littleEndian ? 'readFloatLE' : 'readFloatBE';

  return this.readBuffer(offset, 4)[readFloat](0, false);
};

/**
 * Returns a signed 64 bit floating-point number as defined in IEEE 754.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus 8.
 * @param {boolean} littleEndian Whether to use little endian
 * instead of big endian.
 * @returns {number} A 64 bit floating-point number.
 * @throws {Error} If the specified offset exceeds the reader's boundries.
 * @example
 * var doubleBE = reader.readDouble(0);
 * var doubleLE = reader.readDouble(8, true);
 */
BufferQueueReader.prototype.readDouble = function(offset, littleEndian)
{
  var readDouble = littleEndian ? 'readDoubleLE' : 'readDoubleBE';

  return this.readBuffer(offset, 8)[readDouble](0, false);
};

/**
 * @private
 * @param {BufferQueueReader} reader
 * @param {number} size
 * @param {boolean} littleEndian
 * @returns {number}
 */
function shiftUInt(reader, size, littleEndian)
{
  if (reader.length < size)
  {
    throw new Error("The reader's length is less than " + size + " bytes.");
  }

  reader.length -= size;

  var value = 0;
  var shift = -8;

  while (size--)
  {
    var buffer = reader.buffers[0];

    if (littleEndian)
    {
      value += ((buffer[reader.offset++] << (shift += 8)) >>> 0);
    }
    else
    {
      value = ((value << 8) >>> 0) + buffer[reader.offset++];
    }

    if (reader.offset >= buffer.length)
    {
      reader.offset -= reader.buffers.shift().length;
    }
  }

  return value;
}

/**
 * @private
 * @param {BufferQueueReader} reader
 * @param {number} offset
 * @param {number} size
 * @param {boolean} littleEndian
 * @returns {number}
 * @throws {Error}
 */
function readUInt(reader, offset, size, littleEndian)
{
  offset = parseInt(offset, 10);

  if (isNaN(offset) || offset < 0 || offset + size > reader.length)
  {
    throw new Error(
      "The offset must be a number between 0 and the reader's length minus 2."
    );
  }

  offset += reader.offset;

  var index = 0;
  var buffer;

  while ((buffer = reader.buffers[index++]).length <= offset)
  {
    offset -= buffer.length;
  }

  var value = 0;
  var shift = -8;

  while (size--)
  {
    if (littleEndian)
    {
      value += ((buffer[offset++] << (shift += 8)) >>> 0);
    }
    else
    {
      value = ((value << 8) >>> 0) + buffer[offset++];
    }

    if (offset >= buffer.length)
    {
      offset = 0;
      buffer = reader.buffers[index++];
    }
  }

  return value;
}

/**
 * @private
 * @param {number} uInt8
 * @returns {number}
 */
function toInt8(uInt8)
{
  return uInt8 & 0x80 ? (0x100 - uInt8) * -1 : uInt8;
}

/**
 * @private
 * @param {number} uInt16
 * @returns {number}
 */
function toInt16(uInt16)
{
  return uInt16 & 0x8000 ? (0x10000 - uInt16) * -1 : uInt16;
}

/**
 * @private
 * @param {number} uInt32
 * @returns {number}
 */
function toInt32(uInt32)
{
  return uInt32 & 0x80000000 ? (0x100000000 - uInt32) * -1 : uInt32;
}

module.exports = BufferQueueReader;

}).call(this,require("buffer").Buffer)
},{"./helpers":74,"buffer":3}],73:[function(require,module,exports){
(function (Buffer){
'use strict';

var toBits = require('./helpers').toBits;

/**
 * A class providing extended functionality for reading `Buffer` instances.
 *
 * @constructor
 * @param {Buffer} buffer A buffer to wrap.
 * @throws {Error} If the specified `buffer` is not a `Buffer`.
 * @property {number} length The remaining length of the reader.
 * @example
 * var buffer = new Buffer(256);
 * var reader = new BufferReader(buffer);
 *
 * console.log('int16=', reader.shiftInt16());
 * console.log('uint32=', reader.shiftUInt32());
 * console.log('bits=', reader.readBits(0, 12));
 *
 * reader.skip(2);
 *
 * console.log('double=', reader.shiftDouble());
 */
function BufferReader(buffer)
{
  if (!Buffer.isBuffer(buffer))
  {
    throw new Error("Buffer reader expects an instance of Buffer.");
  }

  /**
   * @type {number}
   */
  this.length = buffer.length;

  /**
   * @private
   * @type {number}
   */
  this.offset = 0;

  /**
   * @private
   * @type {Buffer}
   */
  this.buffer = buffer;
}

/**
 * Skips the specified number of bytes.
 *
 * If the byte count was not specified or it's value is greater than the length
 * of the reader, skips all the bytes to the end.
 *
 * @param {number} [count] A number of bytes to skip.
 * Defaults to the reader's length.
 * @throws {Error} If the count is not a number greater than or equal to 0.
 * @example
 * reader.skip(10);
 */
BufferReader.prototype.skip = function(count)
{
  count = arguments.length === 0 ? this.length : parseInt(count, 10);

  if (isNaN(count) || count < 0)
  {
    throw new Error(
      "The byte count must be a number greater than or equal to 0."
    );
  }

  if (count > this.length)
  {
    count = this.length;
  }

  this.offset += count;
  this.length -= count;
};

/**
 * Returns a position of the next occurence of the specified byte after
 * the specified starting index.
 *
 * @param {number} searchElement A byte value to search for.
 * @param {number=0} fromIndex A starting index. Defaults to 0 (the beginning).
 * @returns {number} A position of the found element (starting at 0) or
 * -1 if the search element was not found.
 * @throws {Error} If the search element is not a number between 0x00 and 0xFF.
 * @throws {Error} If the starting index is not a number between 0 and
 * the reader's length.
 * @example
 * var index = reader.indexOf(0xAB, 10);
 */
BufferReader.prototype.indexOf = function(searchElement, fromIndex)
{
  searchElement = parseInt(searchElement, 10);

  if (isNaN(searchElement) || searchElement < 0x00 || searchElement > 0xFF)
  {
    throw new Error(
      "The search element must be a number between 0x00 and 0xFF."
    );
  }

  fromIndex = arguments.length >= 2 ? parseInt(fromIndex, 10) : 0;

  if (isNaN(fromIndex) || fromIndex < 0 || fromIndex > this.length)
  {
    throw new Error(
      "The search starting index must be a number " +
      "between 0 and the reader's length."
    );
  }

  for (var i = this.offset + fromIndex; i < this.length; ++i)
  {
    if (this.buffer[i] === searchElement)
    {
      return i - this.offset;
    }
  }

  return -1;
};

/**
 * Copies bytes from the reader to the specified target buffer.
 *
 * @param {Buffer} targetBuffer A buffer to copy to.
 * @param {number=0} targetStart A position at which writing to the buffer
 * should begin. Defaults to 0 (the beginning).
 * @param {number=0} sourceStart A position from which writing from the reader
 * should begin. Defaults to 0 (the beginning).
 * @param {number=this.length} sourceEnd A position at which writing from
 * the reader should end. Defaults to the end (the reader's length).
 * @returns {number} A number of bytes written.
 * @throws {Error} If the specified target buffer is not an instance of Buffer.
 * @throws {Error} If the specified target start index is not a number between
 * 0 and the target buffer's length.
 * @throws {Error} If the specified source start index is not a number between
 * 0 and the reader's length (exclusive).
 * @throws {Error} If the specified source end index is not a number between
 * 0 (exclusive) and the reader's length.
 * @throws {Error} If the specified source start index is greater than or
 * equal to the source end index.
 * @example
 * var buffer = new Buffer(10);
 *
 * reader.copy(buffer, 0);
 * reader.copy(buffer, 5, 4, 9);
 */
BufferReader.prototype.copy = function(
  targetBuffer, targetStart, sourceStart, sourceEnd)
{
  if (!Buffer.isBuffer(targetBuffer))
  {
    throw new Error("The target buffer must be an instance of Buffer.");
  }

  targetStart = arguments.length >= 2 ? parseInt(targetStart, 10) : 0;

  if (isNaN(targetStart)
    || targetStart < 0
    || targetStart > targetBuffer.length)
  {
    throw new Error(
      "The target starting index must be a number greater than " +
      "or equal to 0 and less than or equal to the target buffer's length."
    );
  }

  sourceStart = arguments.length >= 3 ? parseInt(sourceStart, 10) : 0;

  if (isNaN(sourceStart) || sourceStart < 0 || sourceStart >= this.length)
  {
    throw new Error(
      "The source starting index must be a number greater than " +
      "or equal to 0 and less than the reader's length."
    );
  }

  sourceEnd = arguments.length >= 4 ? parseInt(sourceEnd, 10) : this.length;

  if (isNaN(sourceEnd) || sourceEnd < 1 || sourceEnd > this.length)
  {
    throw new Error(
      "The source ending index must be a number greater than 0 " +
      "and less than or equal to the reader's length."
    );
  }

  if (sourceStart >= sourceEnd)
  {
    throw new Error(
      "The source start index must be less than the source end index."
    );
  }

  return this.buffer.copy(
    targetBuffer,
    targetStart,
    this.offset + sourceStart,
    this.offset + sourceEnd
  );
};

/**
 * Shifts an array of bits (boolean values) from the reader.
 *
 * Decreases the reader's length by a number of bytes that is needed to
 * extract the specified number of bits
 * (e.g. 4, 8 bits=1 byte, 9, 13, 16 bits=2 bytes etc.).
 *
 * @param {number} count A number of bits to shift.
 * Must be between 1 and the reader's length multiplied by 8.
 * @returns {Array.<boolean>} An array of bits.
 * @throws {Error} If the specified count is not a number between 1 and
 * the reader's length multiplied by 8.
 * @example
 * var bitsArray = reader.shiftBits(13);
 */
BufferReader.prototype.shiftBits = function(count)
{
  return toBits(this.shiftBytes(Math.ceil(count / 8)), count);
};

/**
 * Shifts a byte from the reader.
 *
 * Decreases the reader's length by 1.
 *
 * @returns {number} A number between 0x00 and 0xFF.
 * @throws {Error} If the reader is empty.
 * @example
 * var byteValue = reader.shiftByte();
 */
BufferReader.prototype.shiftByte = function()
{
  if (this.length === 0)
  {
    throw new Error("The reader is empty.");
  }

  this.length -= 1;

  return this.buffer[this.offset++];
};

/**
 * Shifts an ASCII character from the reader.
 *
 * Decreases the reader's length by 1.
 *
 * @returns {string} An ASCII character.
 * @throws {Error} If the reader is empty.
 * @example
 * var charValue = reader.shiftChar();
 */
BufferReader.prototype.shiftChar = function()
{
  return String.fromCharCode(this.shiftByte());
};

/**
 * Shifts the specified number of bytes from the reader.
 *
 * Decreases the reader's length by the specified byte count.
 *
 * @param {number} count A number of bytes to shift.
 * Must be between 1 and the reader's length.
 * @returns {Array.<number>} An array of bytes.
 * @throws {Error} If the specified count is not a number between 1 and
 * the reader's length.
 * @example
 * var bytesArray = reader.shiftBytes(6);
 */
BufferReader.prototype.shiftBytes = function(count)
{
  count = parseInt(count, 10);

  if (isNaN(count) || count < 1 || count > this.length)
  {
    throw new Error(
      "The byte count must be a number greater than 0 " +
      "and less than or equal to the reader's length."
    );
  }
  
  this.length -= count;

  var byteArray = [];

  while (count--)
  {
    byteArray.push(this.buffer[this.offset++]);
  }

  return byteArray;
};

/**
 * Shifts the specified number of bytes as an instance of Buffer.
 *
 * Decreases the reader's length by the specified byte count.
 *
 * @param {number} count A number of bytes to shift.
 * Must be between 1 and the reader's length.
 * @returns {Buffer} A buffer of the specified size.
 * @throws {Error} If the specified count is not a number between 1 and
 * the reader's length.
 * @example
 * var buffer = reader.shiftBuffer(10);
 */
BufferReader.prototype.shiftBuffer = function(count)
{
  return new Buffer(this.shiftBytes(count));
};

/**
 * Shifts the specified number of bytes as a string with
 * the specified encoding.
 *
 * Decreases the reader's length by the specified byte count.
 *
 * @param {number} length A number of bytes to shift.
 * Must be between 1 and the reader's length.
 * @param {string} [encoding] An encoding of the string. Defaults to `utf8`.
 * @returns {string} A string of the specified length.
 * @throws {Error} If the specified length is not a number between 1 and
 * the reader's length.
 * @throws {Error} If the specified encoding is not supported.
 * @example
 * var stringValue = reader.shiftString(12, 'ascii');
 */
BufferReader.prototype.shiftString = function(length, encoding)
{
  return this.shiftBuffer(length).toString(encoding || 'utf8');
};

/**
 * Shifts a string from the beginning of the reader until the first
 * occurence of the NULL character (\0).
 *
 * Decreases the reader's length by the returned string's length plus one.
 *
 * @param {string} [encoding] An encoding of the string. Defaults to `utf8`.
 * @returns {string} A string constructed from the shifted bytes or empty string
 * if NULL character could not be found.
 * @throws {Error} If the specified encoding is not supported.
 * @example
 * var stringValue = reader.shiftZeroString('utf8');
 */
BufferReader.prototype.shiftZeroString = function(encoding)
{
  var zeroIndex = this.indexOf(0);

  if (zeroIndex === -1)
  {
    return '';
  }

  var zeroString = this.shiftString(zeroIndex, encoding);

  this.skip(1);

  return zeroString;
};

/**
 * Shifts a signed 8 bit integer.
 *
 * Decreases the reader's length by one byte.
 *
 * @returns {number} A number between -128 and 127.
 * @throws {Error} If the reader is empty.
 * @example
 * var int8 = reader.shiftInt8();
 */
BufferReader.prototype.shiftInt8 = function()
{
  var value = this.readInt8(0);

  this.skip(1);
  
  return value;
};

/**
 * Shifts a signed 16 bit integer.
 *
 * Decreases the reader's length by two bytes.
 *
 * @param {boolean} [littleEndian] Whether to use little endian
 * instead of big endian.
 * @returns {number} A number between -32768 and 32767.
 * @throws {Error} If the reader's length is less than 2.
 * @example
 * var int16BE = reader.shiftInt16();
 * var int16LE = reader.shiftInt16(true);
 */
BufferReader.prototype.shiftInt16 = function(littleEndian)
{
  var value = this.readInt16(0, littleEndian);

  this.skip(2);

  return value;
};

/**
 * Shifts a signed 32 bit integer.
 *
 * Decreases the reader's length by four bytes.
 *
 * @param {boolean} [littleEndian] Whether to use little endian
 * instead of big endian.
 * @returns {number} A number between -2147483648 and 2147483647.
 * @throws {Error} If the reader's length is less than 4.
 * @example
 * var int32BE = reader.shiftInt32();
 * var int32LE = reader.shiftInt32(true);
 */
BufferReader.prototype.shiftInt32 = function(littleEndian)
{
  var value = this.readInt32(0, littleEndian);

  this.skip(4);

  return value;
};

/**
 * Shifts an unsigned 8 bit integer.
 *
 * Decreases the reader's length by one byte.
 *
 * @returns {number} A number between 0 and 255.
 * @throws {Error} If the reader is empty.
 * @example
 * var uint8 = reader.shiftUInt8();
 */
BufferReader.prototype.shiftUInt8 = function()
{
  var value = this.readUInt8(0);

  this.skip(1);

  return value;
};

/**
 * Shifts an unsigned 16 bit integer.
 *
 * Decreases the reader's length by two bytes.
 *
 * @param {boolean} [littleEndian] Whether to use little endian
 * instead of big endian.
 * @returns {number} A number between 0 and 65535.
 * @throws {Error} If the reader's length is less than 2.
 * @example
 * var uint16BE = reader.shiftUInt16();
 * var uint16LE = reader.shiftUInt16(true);
 */
BufferReader.prototype.shiftUInt16 = function(littleEndian)
{
  var value = this.readUInt16(0, littleEndian);

  this.skip(2);

  return value;
};

/**
 * Shifts an unsigned 32 bit integer.
 *
 * Decreases the reader's length by four bytes.
 *
 * @param {boolean} [littleEndian] Whether to use little endian
 * instead of big endian.
 * @returns {number} A number between 0 and 4294967295.
 * @throws {Error} If the reader's length is less than 4.
 * @example
 * var uint32BE = reader.shiftUInt32();
 * var uint32LE = reader.shiftUInt32(true);
 */
BufferReader.prototype.shiftUInt32 = function(littleEndian)
{
  var value = this.readUInt32(0, littleEndian);

  this.skip(4);

  return value;
};

/**
 * Shifts a signed 32 bit floating-point number as defined in IEEE 754.
 *
 * Decreases the reader's length by four bytes.
 *
 * @param {boolean} [littleEndian] Whether to use little endian
 * instead of big endian.
 * @returns {number} A 32 bit floating-point number.
 * @throws {Error} If the reader's length is less than 4.
 * @example
 * var floatBE = reader.shiftFloat();
 * var floatLE = reader.shiftFloat(true);
 */
BufferReader.prototype.shiftFloat = function(littleEndian)
{
  var value = this.readFloat(0, littleEndian);

  this.skip(4);

  return value;
};

/**
 * Shifts a signed 64 bit floating-point number as defined in IEEE 754.
 *
 * Decreases the reader's length by eight bytes.
 *
 * @param {boolean} [littleEndian] Whether to use little endian
 * instead of big endian.
 * @returns {number} A 64 bit floating-point number.
 * @throws {Error} If the reader's length is less than 8.
 * @example
 * var doubleBE = reader.shiftDouble();
 * var doubleLE = reader.shiftDouble(true);
 */
BufferReader.prototype.shiftDouble = function(littleEndian)
{
  var value = this.readDouble(0, littleEndian);

  this.skip(8);

  return value;
};

/**
 * Returns an array of bits (boolean values) starting at the specified offset.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus 1.
 * @param {number} count A number of bits to read. Must be between 1 and
 * the reader's length multiplied by 8 minus the starting index.
 * @returns {Array.<boolean>} An array of bits.
 * @throws {Error} If the specified count is not a number between 1 and
 * the reader's length multiplied by 8 minus the starting index.
 * @example
 * var bitsArray = reader.readBits(5, 13);
 */
BufferReader.prototype.readBits = function(offset, count)
{
  // @todo bit or bytes offset
  return toBits(this.readBytes(offset, Math.ceil(count / 8)), count);
};

/**
 * Returns a byte at the specified position.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus 1.
 * @returns {number} A number between 0x00 and 0xFF.
 * @throws {Error} If the reader is empty.
 * @example
 * var byteValue = reader.readByte(1);
 */
BufferReader.prototype.readByte = function(offset)
{
  offset = parseInt(offset, 10);

  if (isNaN(offset) || offset < 0 || offset >= this.length)
  {
    throw new Error(
      "The offset must be a number between 0 and the reader's length minus one."
    );
  }

  return this.buffer[this.offset + offset];
};

/**
 * Returns an ASCII character at the specified position.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus 1.
 * @returns {string} An ASCII character.
 * @throws {Error} If the specified offset exceeds the reader's boundries.
 * @example
 * var charValue = reader.readChar(4);
 */
BufferReader.prototype.readChar = function(offset)
{
  return String.fromCharCode(this.readByte(offset));
};

/**
 * Returns the specified number of bytes starting from the specified position.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus the specified count.
 * @param {number} count A number of bytes to read.
 * Must be between 1 and the reader's length minus the offset.
 * @returns {Array.<number>} An array of bytes.
 * @throws {Error} If the specified offset exceeds the reader's boundries.
 * @throws {Error} If the specified count is not a number between 1 and
 * the reader's length minus the offset.
 * @example
 * var bytesArray = reader.readBytes(0, 6);
 */
BufferReader.prototype.readBytes = function(offset, count)
{
  offset = parseInt(offset, 10);

  if (isNaN(offset) || offset < 0)
  {
    throw new Error("The offset must be a number greater than 0.");
  }

  count = parseInt(count, 10);

  if (isNaN(count) || count < 1)
  {
    throw new Error("The byte count must be a number greater than 0.");
  }

  if (offset + count > this.length)
  {
    throw new Error(
      "A sum of the offset and byte count must be less than " +
      "or equal to the reader's length."
    );
  }
  
  offset += this.offset;

  var byteArray = [];

  while (count--)
  {
    byteArray.push(this.buffer[offset++]);
  }

  return byteArray;
};

/**
 * Returns the specified number of bytes as an instance of Buffer
 * starting from the specified position.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus the specified count.
 * @param {number} count A number of bytes to read.
 * Must be between 1 and the reader's length minus the offset.
 * @returns {Buffer} A Buffer of bytes.
 * @throws {Error} If the specified offset exceeds the reader's boundries.
 * @throws {Error} If the specified count is not a number between 1 and
 * the reader's length minus the offset.
 * @example
 * var buffer = reader.readBuffer(5, 10);
 */
BufferReader.prototype.readBuffer = function(offset, count)
{
  return new Buffer(this.readBytes(offset, count));
};

/**
 * Returns the specified number of bytes as a string with
 * the specified encoding.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus the specified length.
 * @param {number} length A number of bytes to read.
 * Must be between 1 and the reader's length minus the offset.
 * @param {string} [encoding] An encoding of the string. Defaults to `utf8`.
 * @returns {string} A string of the specified length.
 * @throws {Error} If the specified offset exceeds the reader's boundries.
 * @throws {Error} If the specified length is not a number between 1 and
 * the reader's length.
 * @throws {Error} If the specified encoding is not supported.
 * @example
 * var stringValue = reader.readString(1, 12, 'ascii');
 */
BufferReader.prototype.readString = function(offset, length, encoding)
{
  return this.readBuffer(offset, length).toString(encoding || 'utf8');
};

/**
 * Returns a string from the specified offset until the first
 * occurence of the NULL character (\0).
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length.
 * @param {string} [encoding] An encoding of the string. Defaults to `utf8`.
 * @returns {string} A string constructed from the read bytes or empty string
 * if NULL character could not be found.
 * @throws {Error} If the specified offset exceeds the reader's boundries.
 * @throws {Error} If the specified encoding is not supported.
 * @example
 * var stringValue = reader.readZeroString(0, 'utf8');
 */
BufferReader.prototype.readZeroString = function(offset, encoding)
{
  var zeroIndex = this.indexOf(0, offset);

  if (zeroIndex === -1 || zeroIndex - offset === 0)
  {
    return '';
  }

  return this.readString(offset, zeroIndex - offset, encoding);
};

/**
 * Returns a signed 8 bit integer at the specified position.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus 1.
 * @returns {number} A number between -128 and 127.
 * @throws {Error} If the specified offset exceeds the reader's boundries.
 * @throws {Error} If the reader is empty.
 * @example
 * var int8 = reader.readInt8(5);
 */
BufferReader.prototype.readInt8 = function(offset)
{
  return this.buffer.readInt8(this.offset + offset);
};

/**
 * Returns a signed 16 bit integer starting from the specified position.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus 2.
 * @param {boolean} [littleEndian] Whether to use little endian
 * instead of big endian.
 * @returns {number} A number between -32768 and 32767.
 * @throws {Error} If the specified offset exceeds the reader's boundries.
 * @example
 * var int16BE = reader.readInt16(0);
 * var int16LE = reader.readInt16(2, true);
 */
BufferReader.prototype.readInt16 = function(offset, littleEndian)
{
  return this.buffer[littleEndian ? 'readInt16LE' : 'readInt16BE'](
    this.offset + offset
  );
};

/**
 * Returns a signed 32 bit integer starting from the specified position.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus 4.
 * @param {boolean} [littleEndian] Whether to use little endian
 * instead of big endian.
 * @returns {number} A number between -2147483648 and 2147483647.
 * @throws {Error} If the specified offset exceeds the reader's boundries.
 * @example
 * var int32BE = reader.readInt32(0);
 * var int32LE = reader.readInt32(4, true);
 */
BufferReader.prototype.readInt32 = function(offset, littleEndian)
{
  return this.buffer[littleEndian ? 'readInt32LE' : 'readInt32BE'](
    this.offset + offset
  );
};

/**
 * Returns an unsigned 8 bit integer at the specified position.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus 1.
 * @returns {number} A number between 0 and 255.
 * @throws {Error} If the specified offset exceeds the reader's boundries.
 * @example
 * var uint8 = reader.readUInt8(0);
 */
BufferReader.prototype.readUInt8 = function(offset)
{
  return this.buffer.readUInt8(this.offset + offset);
};

/**
 * Returns an unsigned 16 bit integer starting from the specified position.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus 2.
 * @param {boolean} [littleEndian] Whether to use little endian
 * instead of big endian.
 * @returns {number} A number between 0 and 65535.
 * @throws {Error} If the specified offset exceeds the reader's boundries.
 * @example
 * var uint16BE = reader.readUInt16(0);
 * var uint16LE = reader.readUInt16(2, true);
 */
BufferReader.prototype.readUInt16 = function(offset, littleEndian)
{
  return this.buffer[littleEndian ? 'readUInt16LE' : 'readUInt16BE'](
    this.offset + offset
  );
};

/**
 * Returns an unsigned 32 bit integer starting from the specified position.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus 4.
 * @param {boolean} [littleEndian] Whether to use little endian
 * instead of big endian.
 * @returns {number} A number between 0 and 4294967295.
 * @throws {Error} If the specified offset exceeds the reader's boundries.
 * @example
 * var uint32BE = reader.readUInt32(0);
 * var uint32LE = reader.readUInt32(4, true);
 */
BufferReader.prototype.readUInt32 = function(offset, littleEndian)
{
  return this.buffer[littleEndian ? 'readUInt32LE' : 'readUInt32BE'](
    this.offset + offset
  );
};

/**
 * Returns a signed 32 bit floating-point number as defined in IEEE 754.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus 4.
 * @param {boolean} [littleEndian] Whether to use little endian
 * instead of big endian.
 * @returns {number} A 32 bit floating-point number.
 * @throws {Error} If the specified offset exceeds the reader's boundries.
 * @example
 * var floatBE = reader.readFloat(0, );
 * var floatLE = reader.readFloat(4, true);
 */
BufferReader.prototype.readFloat = function(offset, littleEndian)
{
  return this.buffer[littleEndian ? 'readFloatLE' : 'readFloatBE'](
    this.offset + offset
  );
};

/**
 * Returns a signed 64 bit floating-point number as defined in IEEE 754.
 *
 * @param {number} offset A starting index.
 * Must be between 0 and the reader's length minus 8.
 * @param {boolean} [littleEndian] Whether to use little endian
 * instead of big endian.
 * @returns {number} A 64 bit floating-point number.
 * @throws {Error} If the specified offset exceeds the reader's boundries.
 * @example
 * var doubleBE = reader.readDouble(0);
 * var doubleLE = reader.readDouble(8, true);
 */
BufferReader.prototype.readDouble = function(offset, littleEndian)
{
  return this.buffer[littleEndian ? 'readDoubleLE' : 'readDoubleBE'](
    this.offset + offset
  );
};

module.exports = BufferReader;

}).call(this,require("buffer").Buffer)
},{"./helpers":74,"buffer":3}],74:[function(require,module,exports){
'use strict';

/**
 * @private
 * @param {Array.<number>} byteArray
 * @param {number} bitCount
 * @returns {Array.<boolean>}
 */
exports.toBits = function(byteArray, bitCount)
{
  var bitArray = [];
  var byteCount = byteArray.length;

  for (var byteIndex = 0; byteIndex < byteCount; ++byteIndex)
  {
    var byteValue = byteArray[byteIndex];

    for (var bitIndex = 0; bitIndex < 8; ++bitIndex)
    {
      if (bitArray.length === bitCount)
      {
        break;
      }

      bitArray.push(Boolean(byteValue & Math.pow(2, bitIndex)));
    }
  }

  return bitArray;
};

},{}],75:[function(require,module,exports){
exports.BufferQueueReader = require('./BufferQueueReader');
exports.BufferReader = require('./BufferReader');
exports.BufferBuilder = require('./BufferBuilder');

},{"./BufferBuilder":71,"./BufferQueueReader":72,"./BufferReader":73}]},{},[66])(66)
});