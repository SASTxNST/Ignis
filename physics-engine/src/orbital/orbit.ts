import {

    EARTH_RADIUS,

    EARTH_MU

} from "./constants";

import {

    specificEnergy

} from "./energy";

export interface OrbitState {

    radius: number;

    velocity: number;

    circularVelocity: number;

    escapeVelocity: number;

    orbitalEnergy: number;

}

export function computeOrbitState(

    altitude: number,

    velocity: number

): OrbitState {

    const radius =

        EARTH_RADIUS +

        altitude;

    const circularVelocity =

        Math.sqrt(

            EARTH_MU /

            radius

        );

    const escapeVelocity =

        Math.sqrt(

            2 *

            EARTH_MU /

            radius

        );

    return {

        radius,

        velocity,

        circularVelocity,

        escapeVelocity,

        orbitalEnergy:

            specificEnergy(

                altitude,

                velocity

            )

    };

}