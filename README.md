# wgsl-struct-parser [EXPERIMENTAL]

## Introduction

The WebGPU API does not permit reflection on WGSL struct definitions so that the developer must manage memory layout and manually pack data into uniform or storage buffers.

Although the WebGPU API may eventually implement this, there are tools out there to fill this gap. See, for example, [webgpu-utils](https://github.com/greggman/webgpu-utils), [@timefold/webgpu](https://www.npmjs.com/package/@timefold/webgpu), or [TypeGPU](https://docs.swmansion.com/TypeGPU/).

I'm picky though, and I wanted as little machinery between me and WebGPU as possible, at least until I more fully learn the API and tools become an asset rather than a hindrance.

So this library implements a simple recursive-descent parser for WGSL struct definitions. It currently parses structs into an AST. It aims to present correct useful information about memory layout. It does not aim to be rigorously spec-compliant since validating WGSL code remains the job of the WebGPU device. Once it computes memory layout and assists packing data into buffers, the functionality of this module will be considered complete.

## Example

Parse WGSL struct definitions directly. If using nested structs, you must pass a parsed struct to any dependents.

```js
import parse from 'wgsl-struct-parser';

const PointLight = parse(`struct PointLight {
  position: vec3f,
  color: vec3f,
}`)

const Lighting = parse(`struct Lighting {
  ambient: vec3f,
  pointLights: array<PointLight>,
}`, [PointLight]);
```

Interpet the AST as needed:

```js
// PointLight =>
StructDeclNode {
  name: IdentifierNode { value: "PointLight" },
  members: [
    StructMemberNode {
      name: IdentifierNode { value: "position" },
      type: VectorTypeNode {
        type: ScalarTypeNode { type: "f32" },
        size: 3
      },
      attrs: []
    },
    StructMemberNode {
      name: IdentifierNode { value: "color" }
      type: VectorTypeNode {
        type: ScalarTypeNode { type: "f32" },
        size: 3
      },
      attrs: []
    }
  ]
}

// Lighting =>
StructDeclNode {
  name: IdentifierNode { value: "Lighting" }
  members: [
    StructMemberNode {
      name: IdentifierNode { value: "ambient" },
      type: VectorTypeNode {
        type: ScalarTypeNode {type: "f32"},
        size: 3
      },
      attrs: []
    },
    StructMemberNode {
      name: IdentifierNode { value: "pointLights" },
      type: RuntimeSizeArrayTypeNode {
        type: PointLight
      },
      attrs: []
    }
  ]
}
```

Re-serialize for inclusion in a shader:

```js
const code = `
${PointLight}
${Lighting}
...
`;
```

```wgsl
// code =>
struct PointLight {
  position: vec3<f32>,
  color: vec3<f32>,
}
struct Lighting {
  ambientColor: vec3<f32>,
  pointLights: array<PointLight>,
}
...
```

## License

&copy; 2025 Ricky Reusser. MIT License.
