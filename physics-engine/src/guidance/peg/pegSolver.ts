import { PEGState } from "./pegState";

import { Vector2 } from "../../types";

export interface PEGSolution {

    direction: Vector2;

}

export function solvePEG(

    state: PEGState

): PEGSolution {

    /*
        Placeholder.

        This will later contain the real
        Powered Explicit Guidance solver.

        It will compute:

        - Time-to-go
        - Steering constants
        - Desired thrust direction
    */

    return {

        direction: {

            x: 0,

            y: 1

        }

    };

}