// ============================================================
// COLLISION SYSTEM
// ============================================================

export function rectCollision(a, b, margin) {
  return Math.abs(a.x - b.x) < margin + (b.width || 0) / 2 &&
         Math.abs(a.y - b.y) < margin + (b.height || 0) / 2;
}

export function circleCollision(a, b, radiusA, radiusB) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy < (radiusA + radiusB) * (radiusA + radiusB);
}

// Point inside rectangle (for boss component hit detection)
export function pointInRect(px, py, rx, ry, rw, rh) {
  return px >= rx - rw / 2 && px <= rx + rw / 2 &&
         py >= ry - rh / 2 && py <= ry + rh / 2;
}
