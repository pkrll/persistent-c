'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.readString = exports.strlen = exports.readValue = exports.writeValue = exports.allocate = undefined;

var _immutable = require('immutable');

var _immutable2 = _interopRequireDefault(_immutable);

var _value = require('./value');

var _textEncodingUtf = require('text-encoding-utf-8');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var littleEndian = false;

var allocate = exports.allocate = function allocate(size) {
  return _immutable2.default.List(Array(size).fill(0));
};

var writeValue = exports.writeValue = function writeValue(memory, ref, value) {
  if (value === undefined) return memory; // XXX
  // XXX assert(ref instanceof PointerValue)
  // XXX assert(typeEquals(ref.type.pointee, value.type))
  var address = ref.address;
  var nbytes = value.type.size;
  var view = new DataView(new ArrayBuffer(nbytes));
  (0, _value.packValue)(view, 0, value, littleEndian);
  for (var offset = 0; offset < nbytes; offset += 1) {
    memory = memory.set(address + offset, view.getUint8(offset));
  }
  return memory;
};

var readValue = exports.readValue = function readValue(core, ref) {
  // XXX assert(ref instanceof PointerValue)
  var memory = core.memory;
  var type = ref.type,
      address = ref.address;

  var nbytes = type.pointee.size;
  var view = new DataView(new ArrayBuffer(nbytes));
  for (var offset = 0; offset < nbytes; offset += 1) {
    view.setUint8(offset, memory.get(address + offset));
  }
  return (0, _value.unpackValue)(view, 0, type.pointee, littleEndian, core);
};

var strlen = exports.strlen = function strlen(memory, ref, maxBytes) {
  var address = ref.address;

  var limit = (maxBytes === undefined ? memory.size : Math.min(memory.size, address + maxBytes)) - 1;
  var endAddress = address;
  while (endAddress < limit && memory.get(endAddress) !== 0) {
    endAddress += 1;
  }
  return endAddress - address;
};

var readBytes = function readBytes(view, byteCount, memory, ref) {
  for (var offset = 0; offset < byteCount; offset += 1) {
    view.setInt8(offset, memory.get(ref.address + offset));
  }
};

var readString = exports.readString = function readString(memory, ref, maxBytes) {
  var byteCount = strlen(memory, ref, maxBytes);
  var view = new DataView(new ArrayBuffer(byteCount));
  readBytes(view, byteCount, memory, ref);
  var decoder = new _textEncodingUtf.TextDecoder("utf-8");
  return decoder.decode(view);
};