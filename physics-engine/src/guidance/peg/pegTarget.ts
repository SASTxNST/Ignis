import { MissionProfile } from "../mission";

import {

    EARTH_RADIUS,
    EARTH_MU

} from "../../orbital";

export interface PEGTarget {

    targetRadius: number;

    targetVelocity: number;

    targetEnergy: number;

}

export function buildPEGTarget(

    mission: MissionProfile

): PEGTarget {

    const radius =

        EARTH_RADIUS +

        mission.orbit.apogeeM;

    const velocity =

        Math.sqrt(

            EARTH_MU /

            radius

        );

    const energy =

        velocity * velocity / 2 -

        EARTH_MU / radius;

    return {

        targetRadius: radius,

        targetVelocity: velocity,

        targetEnergy: energy

    };

}