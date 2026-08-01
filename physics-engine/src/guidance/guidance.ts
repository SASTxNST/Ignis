import { Vector2 } from "../types";




import { pitchProgram } from "./pitchProgram";

import { rollProgram } from "./rollProgram";
import { velocityTurn } from "./velocityTurn";

import { guidanceMixer } from "./guidanceMixer";

import { GuidanceState, GuidanceVector } from "./types";
import { pegGuidance } from "./peg/peg";

import { MissionProfile } from "./mission";


export function guidanceComputer(
    state: GuidanceState,
    mission: MissionProfile
): Vector2 {

    const pitch = pitchProgram(state);

    const roll = rollProgram(state);

    const velocity = velocityTurn(state);

    const peg = pegGuidance(state, mission);


    const guidanceVectors: GuidanceVector[] = [

        {

            direction: pitch,

            weight: 1.0 - peg.weight

        },

        {

            direction: velocity,

            weight: 0.4

        },

        {

            direction: roll,

            weight: 0

        },

        peg

    ];

    return guidanceMixer(guidanceVectors);

    }