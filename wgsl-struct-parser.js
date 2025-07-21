class Token {
  constructor(value) {
    this.value = value;
  }
  match() {
    return this.value.match(this.constructor.pattern);
  }
  isMatch(tokenTypes = null, tokenValues = null) {
    tokenTypes = wrap(tokenTypes);
    tokenValues = wrap(tokenValues);
    return (
      (!tokenTypes.length || tokenTypes.includes(this.constructor)) &&
      (!tokenValues.length || tokenValues.includes(this.value))
    );
  }
}
class CommentToken extends Token {
  static pattern = /^\/\/.*/;
  static name = "Comment";
}
class KeywordToken extends Token {
  static pattern =
    /^(struct|size|align|array|bool|i32|u32|f32|f16|vec[234][iufh]?|mat[234]x[234][fh]?)\b/;
  static name = "Keyword";
}
class DecimalIntToken extends Token {
  static pattern = /^(0[iu]?|[1-9][0-9]*[iu]?)/;
  static name = "DecimalInt";
}
class IdentifierToken extends Token {
  static pattern = /^[a-zA-Z_][a-zA-Z0-9_]*/;
  static name = "Identifier";
}
class PunctuatorToken extends Token {
  static pattern = /^(\:|\,|\{|\}|@|\(|\)|>|<)/;
  static name = "Punctuator";
}
class UnknownToken extends Token {
  static pattern = /^\S/;
  static name = "Unknown";
}
const TOKENS = [
  CommentToken,
  KeywordToken,
  DecimalIntToken,
  IdentifierToken,
  PunctuatorToken,
  UnknownToken
];
const WHITESPACE = /^\s+/;
function tokenize(input) {
  const tokens = [];
  let currentIndex = 0;
  while (currentIndex < input.length) {
    const whitespaceMatch = input.slice(currentIndex).match(WHITESPACE);
    if (whitespaceMatch) currentIndex += whitespaceMatch[0].length;
    if (currentIndex >= input.length) break;
    const remainingInput = input.slice(currentIndex);
    let matched = false;
    for (const TokenType of TOKENS) {
      const match = remainingInput.match(TokenType.pattern);
      if (match && match.index === 0) {
        const value = match[0];
        if (TokenType !== CommentToken) tokens.push(new TokenType(value));
        currentIndex += value.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      throw new Error(
        `Unrecognized token at index ${currentIndex}: "${remainingInput}"`
      );
    }
  }
  return tokens;
}

class ASTNode {
  constructor() {
    if (this.constructor == ASTNode) {
      throw new Error("Abstract ASTNode class can't be instantiated.");
    }
  }
}

class StructDeclNode extends ASTNode {
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

class AlignAttrNode extends ASTNode {
  constructor(value) {
    super();
    this.value = value;
  }
  toString() {
    return `@align(${this.value})`;
  }
}

class SizeAttrNode extends ASTNode {
  constructor(value) {
    super();
    this.value = value;
  }
  toString() {
    return `@size(${this.value})`;
  }
}

class RuntimeSizeArrayTypeSpecifierNode extends ASTNode {
  constructor(value) {
    super();
    this.value = value;
  }
  toString() {
    return `array<${this.value}>`;
  }
}

class FixedSizedArrayTypeSpecifierNode extends ASTNode {
  constructor(value, size) {
    super();
    this.value = value;
    this.size = size;
  }
  toString() {
    return `array<${this.value},${this.size}>`;
  }
}

class StructMemberNode extends ASTNode {
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

class IdentifierNode extends ASTNode {
  constructor(value) {
    super();
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

class StructReferenceNode extends ASTNode {
  constructor(type) {
    super();
    this.type = type;
  }
  toString() {
    return this.type.name.toString();
  }
}

// See: https://www.w3.org/TR/WGSL/#alignment-and-size
class ScalarTypeSpecifierNode extends ASTNode {
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

class VectorTypeSpecifierNode extends ASTNode {
  constructor(type, size) {
    super();
    this.type = type;
    this.size = size;
  }
  toString() {
    return `vec${this.size}<${this.type}>`;
  }
}

class MatrixTypeSpecifierNode extends ASTNode {
  constructor(type, size) {
    super();
    this.type = type;
    this.size = size;
  }
  toString() {
    return `mat${this.size[0]}x${this.size[1]}<${this.type}>`;
  }
}

class DecimalIntNode extends ASTNode {
  constructor(decimalIntToken) {
    super();
    this.value = parseInt(decimalIntToken.value.replace(/[ui]$/, ""));
  }
  toString() {
    return this.value;
  }
}
function wrap(value) {
  if (value === null) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

class ParserState {
  constructor(tokens, knownTypes = []) {
    this.currentIndex = 0;
    this.tokens = tokens;
    this.knownTypes = new Map();
    for (const type of knownTypes) {
      this.knownTypes.set(type.name.value, type);
    }
  }
  get next() {
    return this.tokens[this.currentIndex];
  }
  peek(expectedType = null, expectedValue = null) {
    const token = this.tokens[this.currentIndex];
    if (!token.isMatch(expectedType, expectedValue)) return null;
    return token;
  }
  consume(expectedType = null, expectedValue = null) {
    const token = this.tokens[this.currentIndex++];
    if (!token) throw new Error("Unexpected end of input");
    if (token.isMatch(expectedType, expectedValue)) return token;
    if (expectedValue?.length) {
      throw new Error(
        `Expected ${wrap(expectedType)
          .map((t) => t.name)
          .join(", ")} ${wrap(expectedValue)
          .map((v) => JSON.stringify(v))
          .join(", ")} but found ${token.constructor.name} "${token?.value}"`
      );
    } else {
      throw new Error(
        `Expected ${wrap(expectedType)
          .map((t) => t.name)
          .join(", ")} but found ${token.constructor.name} "${token?.value}"`
      );
    }
    return token;
  }
}

function matches(token, tokenTypes = null, tokenValues = null) {
  return (
    (!tokenTypes.length || tokenTypes.includes(token?.constructor)) &&
    (!tokenValues.length || tokenValues.includes(token?.value))
  );
}

function parseStruct(state) {
  if (state.peek(KeywordToken, "struct")) state.consume();
  const name = state.consume(IdentifierToken);
  state.consume(PunctuatorToken, "{");
  const members = [];
  while (true) {
    const decl = parseMemberDeclaration(state);
    if (!decl) break;
    members.push(decl);
    if (state.peek(PunctuatorToken, ",")) {
      state.consume();
    } else {
      break;
    }
  }
  state.consume(PunctuatorToken, "}");
  return new StructDeclNode(new IdentifierNode(name.value), members);
}

function parseMemberAttributes(state) {
  const attrs = [];
  while (true) {
    if (!state.peek(PunctuatorToken, "@")) break;
    state.consume();
    const keyword = state.consume(KeywordToken, ["align", "size"]);
    state.consume(PunctuatorToken, "(");
    switch (keyword.value) {
      case "align":
        attrs.push(new AlignAttrNode(parseExpression(state)));
        break;
      case "size":
        attrs.push(new SizeAttrNode(parseExpression(state)));
        break;
    }
    state.consume(PunctuatorToken, ")");
  }
  return attrs;
}

function parseExpression(state) {
  // Currently only parses integer constants.
  return new DecimalIntNode(state.consume(DecimalIntToken));
}

function parseMemberDeclaration(state) {
  const attrs = parseMemberAttributes(state);
  if (!state.peek(IdentifierToken)) return null;
  const name = state.consume();
  state.consume(PunctuatorToken, ":");
  const typeSpecifier = parseTypeSpecifier(state);
  return new StructMemberNode(
    new IdentifierNode(name.value),
    typeSpecifier,
    attrs
  );
}

const SCALAR_TYPE_PATTERN = /^(bool|i32|u32|f32|f16\b)/;
const VECTOR_TYPE_PATTERN = /^(vec([234])([iufh])?)\b/;
const MATRIX_TYPE_PATTERN = /^(mat([234])x([234])([fh])?)\b/;
const SHORTHAND_TO_TYPE = { h: "f16", f: "f32", i: "i32", u: "u32" };
const VECTOR_TYPE_SHORTHANDS = ["h", "f", "i", "u"];
const MATRIX_TYPE_SHORTHANDS = ["h", "f"];

function parseTemplateTypeSpecifier(state) {
  state.consume(PunctuatorToken, "<");
  const type = parseTypeSpecifier(state);
  state.consume(PunctuatorToken, ">");
  return type;
}

function parseArrayTypeSpecifier(state) {
  state.consume(PunctuatorToken, "<");
  const type = parseTypeSpecifier(state);
  if (state.peek(PunctuatorToken, ",")) {
    state.consume();
    const size = new DecimalIntNode(state.consume(DecimalIntToken));
    state.consume(PunctuatorToken, ">");
    return new FixedSizedArrayTypeSpecifierNode(type, size);
  } else {
    state.consume(PunctuatorToken, ">");
    return new RuntimeSizeArrayTypeSpecifierNode(type);
  }
}

function parseTypeSpecifier(state) {
  let dataType, match;
  const token = state.consume([KeywordToken, IdentifierToken]);

  if (token instanceof KeywordToken) {
    if (token.value === "array") {
      return parseArrayTypeSpecifier(state);
    } else if ((match = token.value.match(SCALAR_TYPE_PATTERN))) {
      return new ScalarTypeSpecifierNode(match[0]);
    } else if ((match = token.value.match(VECTOR_TYPE_PATTERN))) {
      const size = parseInt(match[2]);
      if (match[3]) {
        if (!VECTOR_TYPE_SHORTHANDS.includes(match[3]))
          throw new Error(`Invalid vector type specifier "${token.value}"`);
        dataType = new ScalarTypeSpecifierNode(SHORTHAND_TO_TYPE[match[3]]);
      } else {
        dataType = parseTemplateTypeSpecifier(state);
      }
      return new VectorTypeSpecifierNode(dataType, size);
    } else if ((match = token.value.match(MATRIX_TYPE_PATTERN))) {
      const size = [parseInt(match[2]), parseInt(match[3])];
      if (match[4]) {
        if (!MATRIX_TYPE_SHORTHANDS.includes(match[4]))
          throw new Error(`Invalid matrix type specifier "${token.value}"`);
        dataType = new ScalarTypeSpecifierNode(SHORTHAND_TO_TYPE[match[4]]);
      } else {
        dataType = parseTemplateTypeSpecifier(state);
      }
      return new MatrixTypeSpecifierNode(dataType, size);
    }
  } else if (token instanceof IdentifierToken) {
    const foundType = state.knownTypes.get(token.value);
    if (!foundType) {
      throw new Error(
        `Unknown type "${token.value}" in type specifier. Did you supply it as a known type?`
      );
    }
    return new StructReferenceNode(foundType);
  }
}

export default function Struct(def, knownTypes = []) {
  return parseStruct(new ParserState(tokenize(def), knownTypes));
}
