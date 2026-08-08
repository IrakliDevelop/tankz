export interface RngSource {
  rngState: number;
}

/** Numerical Recipes LCG: small, serializable, and identical in every JS runtime. */
export function randomUnit(source: RngSource): number {
  source.rngState = (Math.imul(1_664_525, source.rngState) + 1_013_904_223) >>> 0;
  return source.rngState / 0x1_0000_0000;
}

export function shuffledIndices(source: RngSource, length: number): number[] {
  const indices = Array.from({ length }, (_, index) => index);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(randomUnit(source) * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}
