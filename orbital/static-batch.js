// Batch only fixed, non-interactive architecture after its lightmap is applied.
// Keep broad spatial cells so off-camera walls can still be culled.
export function batchArchitecture(THREE, root) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert(), groups = new Map();
  const meshes = [];
  root.traverse(mesh => { if (mesh.isMesh && mesh.userData.bakedIrradiance && !Array.isArray(mesh.material) && !mesh.material.transparent) meshes.push(mesh); });
  for (const mesh of meshes) {
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld));
    geometry.computeBoundingBox(); const center = geometry.boundingBox.getCenter(new THREE.Vector3());
    const cell = center.z < -4 ? 'front' : center.z > 4 ? 'rear' :
      center.x < -6 ? 'left-wing' : center.x > 6 ? 'right-wing' : 'interior';
    const attrs = Object.keys(geometry.attributes).sort().join(':');
    const key = [mesh.material.uuid, cell, attrs, mesh.castShadow, mesh.receiveShadow, mesh.renderOrder].join('|');
    if (!groups.has(key)) groups.set(key, { source: mesh, entries: [] });
    groups.get(key).entries.push({ mesh, geometry });
  }
  let replaced = 0, batches = 0;
  for (const { source, entries } of groups.values()) {
    if (entries.length < 2) { entries[0].geometry.dispose(); continue; }
    const merged = new THREE.BufferGeometry();
    for (const name of Object.keys(entries[0].geometry.attributes)) {
      const first = entries[0].geometry.getAttribute(name);
      const array = new first.array.constructor(entries.reduce((sum, e) => sum + e.geometry.getAttribute(name).array.length, 0));
      let offset = 0;
      for (const entry of entries) { const data = entry.geometry.getAttribute(name).array; array.set(data, offset); offset += data.length; }
      merged.setAttribute(name, new THREE.BufferAttribute(array, first.itemSize, first.normalized));
    }
    merged.computeBoundingSphere(); merged.computeBoundingBox();
    const mesh = new THREE.Mesh(merged, source.material);
    mesh.name = 'Static cabin batch'; mesh.castShadow = source.castShadow; mesh.receiveShadow = source.receiveShadow; mesh.renderOrder = source.renderOrder;
    mesh.userData.sourceNames = entries.map(e => e.mesh.name); mesh.userData.bakedIrradiance = true;
    root.add(mesh);
    for (const entry of entries) { entry.mesh.removeFromParent(); entry.mesh.geometry.dispose(); entry.geometry.dispose(); }
    replaced += entries.length; batches++;
  }
  root.userData.batchStats = { original: meshes.length, replaced, batches, remaining: meshes.length - replaced + batches };
  return root.userData.batchStats;
}
