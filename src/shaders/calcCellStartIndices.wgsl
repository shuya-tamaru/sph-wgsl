struct GridParams {
  x: u32,
  y: u32,
  z: u32,
  total: u32
};

@binding(0) @group(0) var<storage, read_write> cellCounts: array<atomic<u32>>;
@binding(1) @group(0) var<storage, read_write> cellStartIndices: array<u32>;
@binding(2) @group(0) var<uniform> gp: GridParams;

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  if (global_id.x != 0u) { return; }
  var acc: u32 = 0u;

  var i: u32 = 0u;
  loop {
    if (i >= gp.total) { break; }
    cellStartIndices[i] = acc;              
    acc += atomicLoad(&cellCounts[i]);      
    i += 1u;
  }
}