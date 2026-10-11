import nairobiSkyline from '../assets/destinations/nairobi-skyline.jpg';
import dianiBeach from '../assets/destinations/diani-beach.jpg';
import dianiReefResort from '../assets/destinations/diani-reef-resort.jpg';
import coastalLodge from '../assets/destinations/coastal-lodge.jpg';
import executiveResidence from '../assets/destinations/executive-residence.webp';

/**
 * The places Ramellian actually takes clients (Nairobi, the coast), in the order they're shown — used by the
 * home page's hero slideshow and by any page backdrop that cycles through them (`PageBackdrop`'s `images`).
 */
export const DESTINATION_PHOTOS = [nairobiSkyline, dianiBeach, executiveResidence, dianiReefResort, coastalLodge];
