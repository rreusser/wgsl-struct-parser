import { wrap } from './util.js';

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

export class CommentToken extends Token {
  static pattern = /^\/\/.*/;
  static name = "Comment";
}

export class KeywordToken extends Token {
  static pattern =
    /^(struct|size|align|array|bool|i32|u32|f32|f16|vec[234][iufh]?|mat[234]x[234][fh]?)\b/;
  static name = "Keyword";
}

export class DecimalIntToken extends Token {
  static pattern = /^(0[iu]?|[1-9][0-9]*[iu]?)/;
  static name = "DecimalInt";
}

export class IdentifierToken extends Token {
  static pattern = /^[a-zA-Z_][a-zA-Z0-9_]*/;
  static name = "Identifier";
}

export class PunctuatorToken extends Token {
  static pattern = /^(\:|\,|\{|\}|@|\(|\)|>|<)/;
  static name = "Punctuator";
}

export class UnknownToken extends Token {
  static pattern = /^\S/;
  static name = "Unknown";
}

