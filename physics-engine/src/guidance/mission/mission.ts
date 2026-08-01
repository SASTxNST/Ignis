import { OrbitTarget } from "./orbit";
import { LaunchSite } from "./launchSite";

export interface MissionProfile {

    name: string;

    description: string;

    orbit: OrbitTarget;

    launchSite: LaunchSite;

    payloadMassKg: number;

}