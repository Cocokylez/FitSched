/** Format a FitToken amount to 2 decimal places with locale grouping. */
export function formatFT(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Convert kilograms → pounds (1 dp). */
export function kgToLbs(kg: number): number {
  return +(kg * 2.20462).toFixed(1)
}

/** Convert pounds → kilograms (1 dp). */
export function lbsToKg(lbs: number): number {
  return +(lbs / 2.20462).toFixed(1)
}
