// mathjs 15.2.0 exposes solveODE at runtime but ships no TypeScript
// declaration for it. This module augments the mathjs types with the real
// API (see node_modules/mathjs/lib/esm/function/numeric/solveODE.js).
//
// Import this module for its side effect of registering the augmentation
// (imported by src/integrator.ts).
import "mathjs";

declare module "mathjs" {
  export type SolveODEMethod = "RK23" | "RK45";

  export interface SolveODEOptions {
    /** RK45 (Dormand-Prince, default) or RK23 (Bogacki-Shampine) */
    method?: SolveODEMethod;
    /**
     * Numeric tolerance of the method. NOTE: mathjs uses a single scalar
     * `tol` with ABSOLUTE error control (per-component |embedded-solution
     * difference| must stay below tol). It has no separate rtol/atol knobs.
     */
    tol?: number;
    /** Initial step size (defaults to the whole span if unset) */
    firstStep?: number;
    /** Minimum allowed step size */
    minStep?: number;
    /** Maximum allowed step size */
    maxStep?: number;
    /** Minimum step-size change ratio (default 0.2) */
    minDelta?: number;
    /** Maximum step-size change ratio (default 5) */
    maxDelta?: number;
    /** Maximum number of solver iterations (default 10000) */
    maxIter?: number;
  }

  export interface SolveODEResult {
    /** Time nodes, length n */
    t: number[];
    /** State rows, length n, each row the state vector at t[i] */
    y: number[][];
  }

  export function solveODE(
    func: (t: number, y: number[]) => number[],
    tspan: [number, number],
    y0: number[],
    options?: SolveODEOptions,
  ): SolveODEResult;
}
