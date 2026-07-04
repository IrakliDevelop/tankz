let counter = 0;

/** A fresh, process-unique entity id. */
export function nextId(): number {
  return ++counter;
}

/** Reset the counter — used by tests. */
export function resetIds(): void {
  counter = 0;
}
