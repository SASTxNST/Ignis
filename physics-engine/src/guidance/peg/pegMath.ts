import { GuidanceState } from "../types";

import { predictPEG } from "./pegPredictor";

export interface PEGEstimate {

    remainingDeltaV: number;

    velocityError: number;

    radiusError: number;

}

export function estimatePEGState(

    state: GuidanceState,

    targetVelocity: number,

    targetRadius: number

): PEGEstimate {

    const prediction =

        predictPEG(state);

    const orbit =

        prediction.orbitalState.orbit;

    return {

        remainingDeltaV:

            Math.max(

                targetVelocity -

                orbit.velocity,

                0

            ),

        velocityError:

            targetVelocity -

            orbit.velocity,

        radiusError:

            targetRadius -

            orbit.radius

    };

}