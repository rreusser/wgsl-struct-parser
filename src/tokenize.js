import { wrap } from './util.js';
import {
  CommentToken,
  KeywordToken,
  DecimalIntToken,
  IdentifierToken,
  PunctuatorToken,
  UnknownToken
} from './token.js';

const TOKENS = [
  CommentToken,
  KeywordToken,
  DecimalIntToken,
  IdentifierToken,
  PunctuatorToken,
  UnknownToken
];

const WHITESPACE = /^\s+/;

export default function tokenize(input) {
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
