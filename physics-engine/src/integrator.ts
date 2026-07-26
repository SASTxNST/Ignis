/**
 * Generic RK4 integrator over a plain number[] state vector.
 *
 * Deliberately generic (not rocket-aware) so it can be unit tested against
 * textbook ODEs independent of rocket-specific force logic in forces.ts.
 */
export type Derivative = (t: number, y: number[]) => number[];

export function rk4Step(f: Derivative, t: number, y: number[], dt: number): number[] {
  const n = y.length;
  const add = (a: number[], b: number[], scale = 1) => a.map((v, i) => v + b[i] * scale);

  const k1 = f(t, y);
  const k2 = f(t + dt / 2, add(y, k1, dt / 2));
  const k3 = f(t + dt / 2, add(y, k2, dt / 2));
  const k4 = f(t + dt, add(y, k3, dt));

  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = y[i] + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  }
  return out;
}
