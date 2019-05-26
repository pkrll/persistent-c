'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.zeroAtType = exports.evalCast = exports.evalUnaryOperation = exports.evalBinaryOperation = exports.stringValue = exports.unpackValue = exports.packValue = exports.badFunction = exports.makeRef = undefined;
exports.IntegralValue = IntegralValue;
exports.FloatingValue = FloatingValue;
exports.PointerValue = PointerValue;
exports.ArrayValue = ArrayValue;
exports.RecordValue = RecordValue;
exports.FunctionValue = FunctionValue;
exports.BuiltinValue = BuiltinValue;

var _textEncodingUtf = require('text-encoding-utf-8');

var _type2 = require('./type');

// TextEncoder shim for older browsers and Safari.
function IntegralValue(type, number) {
  this.type = type;
  if (/^unsigned/.test(this.type.repr)) {
    this.number = number >>> 0;
  } else {
    this.number = number | 0;
  }
};
IntegralValue.prototype.toString = function () {
  if (this.type.repr === 'char') {
    if (this.number >= 32 && this.number < 128) {
      switch (this.number) {
        case 39:
          return '\\\'';
        case 92:
          return '\\\\';
        default:
          return '\'' + String.fromCharCode(this.number) + '\'';
      }
    } else {
      switch (this.number) {
        case 0:
          return '\\0';
        case 8:
          return '\\t';
        case 10:
          return '\\r';
        case 13:
          return '\\n';
        default:
          {
            var n = this.number + (this.number >= 0 ? 0 : 256);
            return '\'\\x' + n.toString(16) + '\'';
          }
      }
    }
  } else {
    return this.number.toString();
  }
};
IntegralValue.prototype.toInteger = function () {
  return this.number;
};
IntegralValue.prototype.toBool = function () {
  return 0 !== this.number;
};
IntegralValue.prototype.pack = function (view, offset, littleEndian) {
  switch (this.type.repr) {
    case 'char':
      view.setInt8(offset, this.number);
      break;
    case 'unsigned char':
      view.setUint8(offset, this.number);
      break;
    case 'short':
      view.setInt16(offset, this.number, littleEndian);
      break;
    case 'unsigned short':
      view.setUint16(offset, this.number, littleEndian);
      break;
    case 'int':
    case 'long':
      view.setInt32(offset, this.number, littleEndian);
      break;
    case 'unsigned int':
    case 'unsigned long':
      view.setUint32(offset, this.number, littleEndian);
      break;
    default:
      throw new Error('cannot pack integral value ' + this.type.repr);
  }
};

function FloatingValue(type, number) {
  this.type = type;
  this.number = type.size === 4 ? Math.fround(number) : number;
};
FloatingValue.prototype.toString = function () {
  var str = this.number.toFixed(6);
  // Trim the trailing zeros, and the decimal point if there are no digits
  // to its right.
  str = str.replace(/(\.[0-9]*?)0+$/, function (m, n) {
    return n === '.' ? '' : n;
  });
  return str;
};
FloatingValue.prototype.toInteger = function () {
  return this.number | 0;
};
FloatingValue.prototype.toBool = function () {
  return 0 !== this.number;
};
FloatingValue.prototype.pack = function (view, offset, littleEndian) {
  switch (this.type.repr) {
    case 'float':
      view.setFloat32(offset, this.number, littleEndian);
      break;
    case 'double':
      view.setFloat64(offset, this.number, littleEndian);
      break;
    default:
      throw new Error('cannot pack floating value ' + this.type.repr);
  }
};

function PointerValue(type, address) {
  this.type = type;
  this.address = address | 0;
};
PointerValue.prototype.toString = function () {
  return '0x' + this.address.toString(16);
};
PointerValue.prototype.toInteger = function () {
  return this.address;
};
PointerValue.prototype.toBool = function () {
  return 0 !== this.address;
};
PointerValue.prototype.pack = function (view, offset, littleEndian) {
  view.setUint32(offset, this.address, littleEndian);
};

var makeRef = exports.makeRef = function makeRef(elemType, address) {
  var refType = void 0;
  if (elemType.kind === 'array') {
    // A array reference decays to a pointer to its first element.
    refType = (0, _type2.decayedType)(elemType);
  } else {
    refType = (0, _type2.pointerType)(elemType);
  }
  return new PointerValue(refType, address);
};

function ArrayValue(type, elements) {
  this.type = type;
  this.elements = elements;
};
ArrayValue.prototype.toString = function () {
  return 'array';
};
ArrayValue.prototype.pack = function (view, offset, littleEndian) {
  var elemSize = this.type.elem.size;
  this.elements.forEach(function (elem, index) {
    packValue(view, offset + index * elemSize, elem, littleEndian);
  });
};

function RecordValue(type, props) {
  this.type = type;
  this.props = props;
};
RecordValue.prototype.toString = function () {
  return 'record';
};
RecordValue.prototype.pack = function (view, offset, littleEndian) {
  var _type = this.type,
      fields = _type.fields,
      fieldMap = _type.fieldMap,
      props = this.props;
  // {offset, type, refType}

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = fields[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var name = _step.value;

      var value = props[name];
      if (value) {
        var fieldOffset = fieldMap[name].offset;

        console.log('pack field', offset + fieldOffset, value);
        packValue(view, offset + fieldOffset, value, littleEndian);
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }
};

function FunctionValue(type, codePtr, name, body, decl) {
  this.type = (0, _type2.pointerType)(type);
  this.codePtr = codePtr;
  this.name = name;
  this.body = body;
  this.decl = decl;
};
FunctionValue.prototype.toString = function () {
  return '&' + this.name;
};
FunctionValue.prototype.pack = function (view, offset, littleEndian) {
  view.setUint16(offset, this.codePtr, littleEndian);
};
FunctionValue.prototype.toInteger = function () {
  return this.codePtr;
};

function BuiltinValue(type, codePtr, name, func) {
  this.type = type;
  this.codePtr = codePtr;
  this.name = name;
  this.func = func;
};
BuiltinValue.prototype.toString = function () {
  return '&' + this.name;
};
BuiltinValue.prototype.pack = function (view, offset, littleEndian) {
  view.setUint16(offset, this.codePtr, littleEndian);
};
BuiltinValue.prototype.toInteger = function () {
  return this.codePtr;
};

var badFunction = exports.badFunction = new BuiltinValue((0, _type2.functionType)(_type2.builtinTypes['void'], []), 0, "bad_func", function (state, cont, values) {
  return { error: 'bad function' };
});

var packValue = exports.packValue = function packValue(view, offset, value, littleEndian) {
  value.pack(view, offset, littleEndian);
};

var unpackValue = exports.unpackValue = function unpackValue(view, offset, type, littleEndian, core) {
  switch (type.kind) {
    case 'builtin':
      switch (type.repr) {
        case 'char':
          return new IntegralValue(type, view.getInt8(offset));
        case 'unsigned char':
          return new IntegralValue(type, view.getUint8(offset));
        case 'short':
          return new IntegralValue(type, view.getInt16(offset, littleEndian));
        case 'unsigned short':
          return new IntegralValue(type, view.getUint16(offset, littleEndian));
        case 'int':
        case 'long':
          return new IntegralValue(type, view.getInt32(offset, littleEndian));
        case 'unsigned int':
        case 'unsigned long':
          return new IntegralValue(type, view.getUint32(offset, littleEndian));
        case 'float':
          return new FloatingValue(type, view.getFloat32(offset, littleEndian));
        case 'double':
          return new FloatingValue(type, view.getFloat64(offset, littleEndian));
        default:
          throw new Error('unpack builtin ' + type.repr);
      }
    case 'array':
      {
        var elemType = type.elem;
        var elemSize = elemType.size;
        var elements = [];
        for (var index = 0; index < type.count; index++) {
          elements.push(unpackValue(view, offset + index * elemSize, elemType, littleEndian, core));
        }
        return new ArrayValue(type, elements);
      }
    case 'record':
      {
        var props = {};
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = type.fields[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var name = _step2.value;
            var _type$fieldMap$name = type.fieldMap[name],
                fieldOffset = _type$fieldMap$name.offset,
                fieldType = _type$fieldMap$name.type;

            props[name] = unpackValue(view, offset + fieldOffset, fieldType, littleEndian, core);
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }

        return new RecordValue(type, props);
      }
    case 'pointer':
      {
        if (type.pointee.kind === 'function') {
          var codePtr = view.getUint16(offset, littleEndian);
          return core.functions[codePtr] || badFunction;
        } else {
          var address = view.getUint32(offset, littleEndian);
          return new PointerValue(type, address);
        }
      }
    default:
      throw new Error('not implemented: unpack ' + type.kind);
  }
};

var stringValue = exports.stringValue = function stringValue(string) {
  var encoder = new _textEncodingUtf.TextEncoder('utf-8');
  var bytesArray = encoder.encode(string);
  var charType = _type2.builtinTypes['char'];
  var charLen = bytesArray.length;
  var chars = [];
  for (var charPos = 0; charPos < charLen; charPos++) {
    chars.push(new IntegralValue(charType, bytesArray[charPos]));
  }
  chars.push(new IntegralValue(charType, 0));
  var lenValue = new IntegralValue(_type2.builtinTypes['int'], chars.length);
  return new ArrayValue((0, _type2.arrayType)(charType, lenValue), chars);
};

var isRelational = function isRelational(op) {
  return (/^(EQ|NE|LT|LE|GT|GE)$/.test(op)
  );
};

var evalRelationalOperation = function evalRelationalOperation(op, v1, v2) {
  switch (op) {
    case 'EQ':
      return v1 === v2;
    case 'NE':
      return v1 !== v2;
    case 'LT':
      return v1 < v2;
    case 'LE':
      return v1 <= v2;
    case 'GT':
      return v1 > v2;
    case 'GE':
      return v1 >= v2;
  }
};

var evalIntegerBinaryOperation = function evalIntegerBinaryOperation(op, v1, v2) {
  switch (op) {
    case 'Add':case 'AddAssign':
      return v1 + v2;
    case 'Sub':case 'SubAssign':
      return v1 - v2;
    case 'Mul':case 'MulAssign':
      return v1 * v2;
    case 'Div':case 'DivAssign':
      return v1 / v2;
    case 'Rem':case 'RemAssign':
      return v1 % v2;
    case 'And':case 'AndAssign':
      return v1 & v2;
    case 'Or':case 'OrAssign':
      return v1 | v2;
    case 'Xor':case 'XorAssign':
      return v1 ^ v2;
    case 'Shl':case 'ShlAssign':
      return v1 << v2;
    case 'Shr':case 'ShrAssign':
      return v1 >> v2;
  }
};

var evalFloatingBinaryOperation = function evalFloatingBinaryOperation(op, v1, v2) {
  switch (op) {
    case 'Add':case 'AddAssign':
      return v1 + v2;
    case 'Sub':case 'SubAssign':
      return v1 - v2;
    case 'Mul':case 'MulAssign':
      return v1 * v2;
    case 'Div':case 'DivAssign':
      return v1 / v2;
  }
};

var evalBinaryOperation = exports.evalBinaryOperation = function evalBinaryOperation(opcode, lhs, rhs) {
  // Relational operators
  if (isRelational(opcode)) {
    var result = lhs instanceof PointerValue ? evalRelationalOperation(opcode, lhs.address, rhs.address) : evalRelationalOperation(opcode, lhs.number, rhs.number);
    return new IntegralValue(_type2.builtinTypes['int'], result ? 1 : 0);
  }
  // Integer arithmetic
  if (lhs instanceof IntegralValue && rhs instanceof IntegralValue) {
    var _result = evalIntegerBinaryOperation(opcode, lhs.number, rhs.number);
    return new IntegralValue((0, _type2.lubType)(lhs.type, rhs.type), _result);
  }
  // Float arithmetic
  if (lhs instanceof FloatingValue && rhs instanceof FloatingValue) {
    var _result2 = evalFloatingBinaryOperation(opcode, lhs.number, rhs.number);
    return new FloatingValue((0, _type2.lubType)(lhs.type, rhs.type), _result2);
  }
  // Pointer arithmetic
  if (lhs instanceof PointerValue && rhs instanceof IntegralValue) {
    if (opcode === 'Add') {
      var address = lhs.address + rhs.number * lhs.type.pointee.size;
      return new PointerValue(lhs.type, address);
    }
    if (opcode === 'Sub') {
      var _address = lhs.address - rhs.number * lhs.type.pointee.size;
      return new PointerValue(lhs.type, _address);
    }
  }
  if (lhs instanceof IntegralValue && rhs instanceof PointerValue) {
    if (opcode === 'Add') {
      var _address2 = rhs.address + lhs.number * rhs.type.pointee.size;
      return new PointerValue(rhs.type, _address2);
    }
  }
  if (lhs instanceof PointerValue && rhs instanceof PointerValue) {
    if (opcode === 'Sub') {
      var offset = lhs.address - rhs.address;
      return new IntegralValue(_type2.builtinTypes['int'], offset);
    }
  }
  throw new Error('not implemented: ' + lhs + ' ' + opcode + ' ' + rhs);
};

var evalUnaryOperation = exports.evalUnaryOperation = function evalUnaryOperation(opcode, operand) {
  if (operand instanceof IntegralValue) {
    switch (opcode) {
      case 'Plus':
        return operand;
      case 'Minus':
        return new IntegralValue(operand.type, -operand.number);
      case 'LNot':
        return new IntegralValue(_type2.builtinTypes['int'], !operand.toBool());
      case 'Not':
        return new IntegralValue(operand.type, ~operand.number);
    }
  }
  if (operand instanceof FloatingValue) {
    switch (opcode) {
      case 'Plus':
        return operand;
      case 'Minus':
        return new FloatingValue(operand.type, -operand.number);
    }
  }
  throw new Error('not implemented: ' + opcode + ' ' + operand);
};

var evalCast = exports.evalCast = function evalCast(type, operand) {
  if (operand.type === type) {
    return operand;
  }
  if (type.kind === 'builtin') {
    if (/^(unsigned )?char$/.test(type.repr)) {
      return new IntegralValue(type, operand.toInteger() & 0xff);
    }
    if (/^(unsigned )?short$/.test(type.repr)) {
      return new IntegralValue(type, operand.toInteger() & 0xffff);
    }
    if (/^(unsigned )?(int|long)$/.test(type.repr)) {
      return new IntegralValue(type, operand.toInteger() & 0xffffffff);
    }
    if (/^(unsigned )?long long$/.test(type.repr)) {
      // XXX this only works up to 2^53, use npm:long
      return new IntegralValue(type, operand.toInteger());
    }
    if (type.repr === 'float') {
      if (operand instanceof FloatingValue || operand instanceof IntegralValue) {
        return new FloatingValue(type, operand.number);
      }
    }
    if (type.repr === 'double') {
      if (operand instanceof FloatingValue || operand instanceof IntegralValue) {
        return new FloatingValue(type, operand.number);
      }
    }
  }
  if (type.kind === 'pointer') {
    if (operand instanceof PointerValue) {
      return new PointerValue(type, operand.address);
    }
    if (operand instanceof IntegralValue) {
      return new PointerValue(type, operand.toInteger());
    }
    if (operand instanceof BuiltinValue || operand instanceof FunctionValue) {
      // XXX temporary cheat for non-addressable values.
      return operand;
    }
  }
  throw new Error('not implemented: (' + type + ')' + operand);
};

var zeroAtType = exports.zeroAtType = function zeroAtType(type) {
  if (type.kind === 'pointer') {
    var pointer = new PointerValue(type, randomizedData('int'));
    console.log(pointer);
    return pointer;
  }
  if (type.kind === 'builtin') {
    switch (type.repr) {
      case 'char':
      case 'unsigned char':
      case 'short':
      case 'unsigned short':
      case 'int':
      case 'unsigned int':
      case 'long':
      case 'unsigned long':
      case 'long long':
      case 'unsigned long long':
        return new IntegralValue(type, randomizedData(type.repr));
      case 'float':
      case 'double':
        return new FloatingValue(type, randomizedData(type.repr));
    }
  }
  throw new Error('undefined zero at type ' + type.kind);
};

var randomizedData = function randomizedData(type) {
  switch (type.repr) {
    case 'char':
    case 'unsigned char':
      return Math.random().toString(36).substr(2, 1);
    case 'short':
    case 'unsigned short':
    case 'int':
    case 'unsigned int':
    case 'long':
    case 'unsigned long':
    case 'long long':
    case 'unsigned long long':
    case 'float':
    case 'double':
      return Math.random() * 32767 << 0;
  }
};