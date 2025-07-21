import terser from '@rollup/plugin-terser';

export default [{
  input: 'src/parse.js',
  output: {
    file: 'dist/wgsl-struct-parser.min.js',
    format: 'umd',
    name: 'WGSLStruct',
  },
  plugins: [
    terser()
  ]
}];
