
import {scalarTypes, lubType} from './type';

export function IntegralValue (type, number) {
  this.type = type;
  this.number = number | 0;
};
IntegralValue.prototype.toString = function () {
  return this.number.toString();
};
IntegralValue.prototype.toInteger = function () {
  return this.number;
};
IntegralValue.prototype.toBool = function () {
  return 0 !== this.number;
};

export function FloatingValue (type, number) {
  this.type = type;
  this.number = type.size === 4 ? Math.fround(address) : address;
};
FloatingValue.prototype.toString = function () {
  return this.number.toString();
};
FloatingValue.prototype.toInteger = function () {
  return this.number | 0;
};
FloatingValue.prototype.toBool = function () {
  return 0 !== this.number;
};

export function PointerValue (type, address) {
  this.type = type;
  this.address = address | 0;
};
PointerValue.prototype.toString = function () {
  return `0x${this.address.toString(16)}`;
};
PointerValue.prototype.toInteger = function () {
  return this.address;
};
PointerValue.prototype.toBool = function () {
  return 0 !== this.address;
};

export function ConstantArrayValue (type, elements) {
  this.type = type;
  this.elements = elements;
};
ConstantArrayValue.prototype.toString = function () {
  return `constant array`;
};

export const packValue = function (view, offset, value, littleEndian) {
  switch (value.type.kind) {
    case 'scalar':
      switch (value.type.repr) {
        case 'char':
          view.setInt8(offset, value.number);
          break;
        case 'unsigned char':
          view.setUint8(offset, value.number);
          break;
        case 'short':
          view.setInt16(offset, value.number, littleEndian);
          break;
        case 'unsigned short':
          view.setUint16(offset, value.number, littleEndian);
          break;
        case 'int':
        case 'long':
          view.setInt32(offset, value.number, littleEndian);
          break;
        case 'unsigned int':
        case 'unsigned long':
          view.setUint32(offset, value.number, littleEndian);
          break;
        case 'float':
          view.setFloat32(offset, value.number, littleEndian);
          break;
        case 'double':
          view.setFloat64(offset, value.number, littleEndian);
          break;
        default:
          throw `pack scalar ${value.type.repr}`;
      }
      break;
    case 'array':
      {
        const elemSize = value.type.elem.size;
        value.elements.forEach(function (elem, index) {
          packValue(view, offset + index * elemSize, elem, littleEndian);
        });
        break;
      }
    case 'pointer':
      view.setUint32(offset, value.address, littleEndian);
      break;
    default:
      throw `not implemented: pack ${value.type.kind}`;
  }
};

export const unpackValue = function (view, offset, type, littleEndian) {
  switch (type.kind) {
    case 'scalar':
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
          throw `unpack scalar ${type.repr}`;
      }
    case 'array':
      {
        const elemType = type.elem;
        const elemSize = elemType.size;
        const elements = [];
        for (var i = 0; i < type.count; i++) {
          elements.push(unpackValue(view, offset + index * elemSize, elemType, littleEndian));
        }
        return new ConstantArrayValue(type, elements);
      }
    case 'pointer':
      return new PointerValue(type, view.getUint32(offset, littleEndian));
    default:
      throw `not implemented: unpack ${type.kind}`;
  }
};

const isRelational = function (op) {
  return /^(EQ|NE|LT|LE|GT|GE)$/.test(op);
};

const evalRelationalOperation = function (op, v1, v2) {
  switch (op) {
    case 'EQ':  return v1 === v2;
    case 'NE':  return v1 !== v2;
    case 'LT':  return v1 < v2;
    case 'LE':  return v1 <= v2;
    case 'GT':  return v1 > v2;
    case 'GE':  return v1 >= v2;
  }
};

const evalIntegerBinaryOperation = function (op, v1, v2) {
  switch (op) {
    case 'Add': case 'AddAssign': return v1 + v2;
    case 'Sub': case 'SubAssign': return v1 - v2;
    case 'Mul': case 'MulAssign': return v1 * v2;
    case 'Div': case 'DivAssign': return v1 / v2;
    // TODO: check Rem results on negative values
    case 'Rem': case 'RemAssign': return v1 % v2;
    case 'And': case 'AndAssign': return v1 & v2;
    case 'Or':  case 'OrAssign':  return v1 | v2;
    case 'Xor': case 'XorAssign': return v1 ^ v2;
    case 'Shl': case 'ShlAssign': return v1 << v2;
    case 'Shr': case 'ShrAssign': return v1 >> v2;
  }
};

const evalFloatingBinaryOperation = function (op, v1, v2) {
  switch (op) {
    case 'Add': case 'AddAssign': return v1 + v2;
    case 'Sub': case 'SubAssign': return v1 - v2;
    case 'Mul': case 'MulAssign': return v1 * v2;
    case 'Div': case 'DivAssign': return v1 / v2;
  }
};

export const evalBinaryOperation = function (opcode, lhs, rhs) {
  if (isRelational(opcode)) {
    const result = evalRelationalOperation(opcode, lhs.number, rhs.number);
    return new IntegralValue(scalarTypes['int'], result ? 1 : 0);
  }
  if (lhs instanceof IntegralValue && rhs instanceof IntegralValue) {
    const result = evalIntegerBinaryOperation(opcode, lhs.number, rhs.number);
    return new IntegralValue(lubType(lhs.type, rhs.type), result);
  }
  if (lhs instanceof FloatingValue && rhs instanceof FloatingValue) {
    const result = evalFloatingBinaryOperation(opcode, lhs.number, rhs.number)
    return new FloatingValue(lubType(lhs.type, rhs.type), result);
  }
  throw `not implemented: ${lhs} ${opcode} ${rhs}`;
};

export const evalUnaryOperation = function (opcode, operand) {
  if (operand instanceof IntegralValue) {
    switch (opcode) {
      case 'Plus': return operand;
      case 'Minus': return new IntegralValue(operand.type, -operand.number);
      case 'LNot': return new IntegralValue(scalarTypes['int'], operand.number ? 1 : 0);
      case 'Not': return new IntegralValue(operand.type, ~operand.number);
    }
  }
  if (operand instanceof FloatingValue) {
    switch (opcode) {
      case 'Plus': return operand;
      case 'Minus': return new FloatingValue(operand.type, -operand.number);
    }
  }
  throw `not implemented: ${opcode} ${operand}`;
};

export const evalCast = function (type, operand) {
  if (type.kind === 'scalar') {
    if (/^(unsigned )?char$/.test(type.repr)) {
      return new IntegralValue(type, operand.toInteger() & 0xff);
    }
    if (/^(unsigned )?short$/.test(type.repr)) {
      return new IntegralValue(type, operand.toInteger() & 0xffff);
    }
    if (/^(unsigned )?(int|long)$/.test(type.repr)) {
      return new IntegralValue(type, operand.toInteger() & 0xffffffff);
    }
    if (type.repr === 'float') {
      if (operand instanceof IntegralValue || operand instanceof IntegralValue) {
        return new FloatingValue(type, operand.number)
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
      return new PointerValue(type, operand.toInteger())
    }
    if (/^(builtin|function|string)$/.test(operand[0])) {
      // XXX temporary cheat for non-addressable values.
      return operand;
    }
  }
  throw `not implemented: (${type})${operand}`;
};

export const evalPointerAdd = function (pointer, value) {
  const offset = value.toInteger() * pointer.type.pointee.size;
  return new PointerValue(pointer.type, pointer.address + offset);
};
