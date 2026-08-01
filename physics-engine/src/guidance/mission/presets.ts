import { MissionProfile } from "./mission";
import { OrbitType } from "./orbit";

export const LEO_500KM: MissionProfile = {

    name: "500 km LEO",

    description: "Circular Low Earth Orbit",

    orbit: {

        type: OrbitType.LEO,

        apogeeM: 500000,

        perigeeM: 500000,

        inclinationDeg: 28.5

    },

    launchSite: {

        name: "Cape Canaveral",

        latitudeDeg: 28.3922,

        longitudeDeg: -80.6077,

        elevationM: 3

    },

    payloadMassKg: 1000

};

export const SSO_550KM: MissionProfile = {

    name: "550 km Sun Synchronous",

    description: "Sun Synchronous Orbit",

    orbit: {

        type: OrbitType.SSO,

        apogeeM: 550000,

        perigeeM: 550000,

        inclinationDeg: 97.6

    },

    launchSite: {

        name: "Satish Dhawan Space Centre",

        latitudeDeg: 13.7199,

        longitudeDeg: 80.2304,

        elevationM: 5

    },

    payloadMassKg: 500

};
