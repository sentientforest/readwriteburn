export function randomUniqueKey(): string {
  return `${Math.floor(Date.now() * (Math.random() * 1000))}`;
}
