export interface IdSource {
  nextEntityId: number;
}

/** Allocate from simulation-owned state so replays never depend on module globals. */
export function takeId(source: IdSource): number {
  const id = source.nextEntityId;
  source.nextEntityId += 1;
  return id;
}
