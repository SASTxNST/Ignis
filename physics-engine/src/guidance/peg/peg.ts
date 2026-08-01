import { GuidanceState } from "../types";

import { GuidanceVector } from "../types";

import { MissionProfile } from "../mission";

import { buildPEGTarget } from "./pegTarget";

import { estimatePEGState } from "./pegMath";

import { Vector2 } from "../../types";

function normalize(

    v: Vector2

): Vector2 {

    const mag = Math.hypot(

        v.x,

        v.y

    );

    if (mag < 1e-8) {

        return {

            x: 0,

            y: 1

        };

    }

    return {

        x: v.x / mag,

        y: v.y / mag

    };

}

export function pegGuidance(

    state: GuidanceState,

    mission: MissionProfile

): GuidanceVector {

    const target =

        buildPEGTarget(

            mission

        );

    const peg =

        estimatePEGState(

            state,

            target.targetVelocity,

            target.targetRadius

        );

    const velocityDirection =

        normalize(

            state.velocity

        );

    let weight = 0;

    if (

        state.altitude >

        80000

    ) {

        weight = 0.3;

    }

    if (

        Math.abs(

            peg.velocityError

        ) < 300

    ) {

        weight = 0.6;

    }

    if (

        peg.remainingDeltaV <

        100

    ) {

        weight = 1.0;

    }

    return {

        direction:

            velocityDirection,

        weight

    };

}