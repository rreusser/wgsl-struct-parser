export class ASTNode {
  constructor() {
    if (this.constructor == ASTNode) {
      throw new Error("Abstract ASTNode class can't be instantiated.");
    }
  }
}

export class StructDeclNode extends ASTNode {
  constructor(name, members) {
    super();
    this.name = name;
    this.members = members;
  }
  toString() {
    return `struct ${this.name} {
  ${this.members.join("\n  ")}
}`;
  }
  computeLayout() {
    return calculateLayout(this);
  }
}

export class AlignAttrNode extends ASTNode {
  constructor(value) {
    super();
    this.value = value;
  }
  toString() {
    return `@align(${this.value})`;
  }
}

export class SizeAttrNode extends ASTNode {
  constructor(value) {
    super();
    this.value = value;
  }
  toString() {
    return `@size(${this.value})`;
  }
}

export class RuntimeSizeArrayTypeNode extends ASTNode {
  constructor(value) {
    super();
    this.value = value;
  }
  toString() {
    return `array<${this.value}>`;
  }
}

export class FixedSizedArrayTypeNode extends ASTNode {
  constructor(value, size) {
    super();
    this.value = value;
    this.size = size;
  }
  toString() {
    return `array<${this.value},${this.size}>`;
  }
}

export class StructMemberNode extends ASTNode {
  constructor(name, type, attrs = attrs) {
    super();
    this.name = name;
    this.type = type;
    this.attrs = attrs;
  }
  toString() {
    return `${
      this.attrs.length
        ? `${this.attrs.map((a) => a.toString()).join(" ")} `
        : ""
    }${this.name}: ${this.type},`;
  }
}

export class IdentifierNode extends ASTNode {
  constructor(value) {
    super();
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

// See: https://www.w3.org/TR/WGSL/#alignment-and-size
export class ScalarTypeNode extends ASTNode {
  constructor(type) {
    super();
    this.type = type;
  }
  toString() {
    return this.type;
  }
  get alignOf() {
    switch (this.type) {
      case "bool":
      case "i32":
      case "u32":
      case "f32":
        return 4;
      case "f16":
        return 2;
    }
  }
  get sizeOf() {
    switch (this.type) {
      case "bool":
      case "i32":
      case "u32":
      case "f32":
        return 4;
      case "f16":
        return 2;
    }
  }
}

export class VectorTypeNode extends ASTNode {
  constructor(type, size) {
    super();
    this.type = type;
    this.size = size;
  }
  toString() {
    return `vec${this.size}<${this.type}>`;
  }
}

export class MatrixTypeNode extends ASTNode {
  constructor(type, size) {
    super();
    this.type = type;
    this.size = size;
  }
  toString() {
    return `mat${this.size[0]}x${this.size[1]}<${this.type}>`;
  }
}

export class DecimalIntNode extends ASTNode {
  constructor(decimalIntToken) {
    super();
    this.value = parseInt(decimalIntToken.value.replace(/[ui]$/, ""));
  }
  toString() {
    return this.value;
  }
}
