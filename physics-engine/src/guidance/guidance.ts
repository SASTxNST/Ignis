import { Vector2 } from "../types";



import { pitchProgram } from "./pitchProgram";
import { rollProgram } from "./rollProgram";
import { velocityTurn } from "./velocityTurn";

import { guidanceMixer } from "./guidanceMixer";

import { GuidanceState, GuidanceVector } from "./types";

export function guidanceComputer(
    state: GuidanceState
): Vector2 {

    const pitch = pitchProgram(state);

    const roll = rollProgram(state);

    const velocity = velocityTurn(state);

    let pitchWeight = 1;
    let velocityWeight = 0;
    let rollWeight = 0;

    /*
        Mission phases

        Lift-off

        Pitch Program

        Gravity Turn

        Near Vacuum
    */

    if (state.altitude < 1000) {

        pitchWeight = 1.0;
        velocityWeight = 0.0;
        rollWeight = 0.0;

    }

    else if (state.altitude < 20000) {

        pitchWeight = 0.8;
        velocityWeight = 0.2;
        rollWeight = 0.0;

    }

    else if (state.altitude < 50000) {

        pitchWeight = 0.5;
        velocityWeight = 0.5;
        rollWeight = 0.0;

    }

    else {

        pitchWeight = 0.2;
        velocityWeight = 0.8;
        rollWeight = 0.0;

    }

    const guidanceVectors: GuidanceVector[] = [

        {
            direction: pitch,
            weight: pitchWeight
        },

        {
            direction: velocity,
            weight: velocityWeight
        },

        {
            direction: roll,
            weight: rollWeight
        }

    ];

    return guidanceMixer(guidanceVectors);

}