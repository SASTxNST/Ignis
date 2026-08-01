import {

    EARTH_MU,

    EARTH_RADIUS

} from "./constants";

export function specificEnergy(

    altitude: number,

    velocity: number

): number {

    const r =

        EARTH_RADIUS +

        altitude;

    return velocity * velocity /2 - EARTH_MU /r;

}