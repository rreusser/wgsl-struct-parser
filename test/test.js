import test from 'tape';
import Struct from '../src/parse.js';

test('WGSLStruct', function (t) {
  const s = Struct(`struct Uniforms {
    a: bool,
    b: u32,
    c: i32,
    d: f32,
    e: f16
  }`)

  t.equal(s.toString(), `struct Uniforms {
  a: bool,
  b: u32,
  c: i32,
  d: f32,
  e: f16,
}`);

  t.end();
});
