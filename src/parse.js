import tokenize from './tokenize.js';
import {
  CommentToken,
  KeywordToken,
  DecimalIntToken,
  IdentifierToken,
  PunctuatorToken,
  UnknownToken
} from './token.js';
import { 
  StructDeclNode,
  AlignAttrNode,
  SizeAttrNode,
  StructMemberNode,
  IdentifierNode,
  RuntimeSizeArrayTypeNode,
  FixedSizedArrayTypeNode,
  ScalarTypeNode,
  VectorTypeNode,
  MatrixTypeNode,
  DecimalIntNode

} from './ast.js';

class ParserState {
  constructor(tokens, knownTypes = []) {
    this.index = 0;
    this.tokens = tokens;
    this.known = new Map();
    for (const type of knownTypes) {
      this.known.set(type.name.value, type);
    }
  }
  get next() {
    return this.tokens[this.index];
  }
  peek(expectedType = null, expectedValue = null) {
    const token = this.tokens[this.index];
    if (!token.isMatch(expectedType, expectedValue)) return null;
    return token;
  }
  consume(expectedType = null, expectedValue = null) {
    const token = this.tokens[this.index++];
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
  const type = parseType(state);
  return new StructMemberNode(
    new IdentifierNode(name.value), type, attrs);
}

function parseTemplateType(state) {
  state.consume(PunctuatorToken, "<");
  const type = parseType(state);
  state.consume(PunctuatorToken, ">");
  return type;
}

function parseArrayType(state) {
  state.consume(PunctuatorToken, "<");
  const type = parseType(state);
  if (state.peek(PunctuatorToken, ",")) {
    state.consume();
    const size = new DecimalIntNode(state.consume(DecimalIntToken));
    state.consume(PunctuatorToken, ">");
    return new FixedSizedArrayTypeNode(type, size);
  } else {
    state.consume(PunctuatorToken, ">");
    return new RuntimeSizeArrayTypeNode(type);
  }
}

const SCALAR_TYPE_PATTERN = /^(bool|i32|u32|f32|f16\b)/;
const VECTOR_TYPE_PATTERN = /^(vec([234])([iufh])?)\b/;
const MATRIX_TYPE_PATTERN = /^(mat([234])x([234])([fh])?)\b/;
const SHORTHAND_TO_TYPE = { h: "f16", f: "f32", i: "i32", u: "u32" };
const VECTOR_TYPE_SHORTHANDS = 'hfiu';
const MATRIX_TYPE_SHORTHANDS = 'hf';

function parseType(state) {
  let dataType, match;
  const token = state.consume([KeywordToken, IdentifierToken]);

  if (token instanceof KeywordToken) {
    if (token.value === "array") {
      return parseArrayType(state);
    } else if ((match = token.value.match(SCALAR_TYPE_PATTERN))) {
      return new ScalarTypeNode(match[0]);
    } else if ((match = token.value.match(VECTOR_TYPE_PATTERN))) {
      const size = parseInt(match[2]);
      if (match[3]) {
        if (!VECTOR_TYPE_SHORTHANDS.includes(match[3]))
          throw new Error(`Invalid vector type specifier "${token.value}"`);
        dataType = new ScalarTypeNode(SHORTHAND_TO_TYPE[match[3]]);
      } else {
        dataType = parseTemplateType(state);
      }
      return new VectorTypeNode(dataType, size);
    } else if ((match = token.value.match(MATRIX_TYPE_PATTERN))) {
      const size = [parseInt(match[2]), parseInt(match[3])];
      if (match[4]) {
        if (!MATRIX_TYPE_SHORTHANDS.includes(match[4]))
          throw new Error(`Invalid matrix type specifier "${token.value}"`);
        dataType = new ScalarTypeNode(SHORTHAND_TO_TYPE[match[4]]);
      } else {
        dataType = parseTemplateType(state);
      }
      return new MatrixTypeNode(dataType, size);
    }
  } else if (token instanceof IdentifierToken) {
    const foundType = state.known.get(token.value);
    if (!foundType) {
      throw new Error(
        `Unknown type "${token.value}" in type specifier. Did you supply it as a known type?`
      );
    }
    return foundType;
  }
}

export default function Struct(def, knownTypes = []) {
  const tokens = tokenize(def);
  const state = new ParserState(tokens);
  return parseStruct(state, knownTypes);
}
