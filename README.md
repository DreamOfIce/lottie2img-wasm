# lottie2img-wasm

Convert lottie/tgs file to image. Based on WebAssembly.  
Features:

- Written in TypeScript
- Native ESM
- Out-of-the-box cross-platform support without annoying `node-gyp`
- Non-blocking async support

# TODO

[x] Node.js demo  
[ ] Browser demo  
[ ] Complete readme  
[ ] Add tests  
[ ] GIF support  
[ ] Use wasm exception(expected after wider support)  

# Requirement

This module require ES2020 syntax and bulk memory operations and threads support for WebAssembly.  
The following versions are known to work, lower versions may also (with certain flags added) work, but are not guaranteed:

- Node.js >= 16

# License

lottie2img itself is licensed under the MIT license, but some of the core dependencies (located in packages/core/third_party) are licensed under (like) the BSD 2/3-Clause license and are packaged together in wasm.  
[details](./LICENSE)
