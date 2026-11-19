export function slugifyState(state: string): string {
  return state.toLowerCase().trim().replace(/\s+/g, "-");
}
