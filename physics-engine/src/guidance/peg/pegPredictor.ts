import { GuidanceState } from "../types";

import { computeOrbitalState } from "../../orbital/state";

export interface PEGPrediction {

    orbitalState: ReturnType<

        typeof computeOrbitalState

    >;

    speed: number;

}

export function predictPEG(

    state: GuidanceState

): PEGPrediction {

    const speed =

        Math.hypot(

            state.velocity.x,

            state.velocity.y

        );

    return {

        orbitalState:

            computeOrbitalState(

                state.altitude,

                speed

            ),

        speed

    };

}