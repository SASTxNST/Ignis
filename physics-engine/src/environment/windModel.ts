import { WindState } from "../types";

/**
 * Interface implemented by every wind model.
 */
export interface WindModel {

    /**
     * Returns the wind state at the requested altitude and time.
     */
    getWind(
        altitudeMeters: number,
        timeSeconds: number,
    ): WindState;

}