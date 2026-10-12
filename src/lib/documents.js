import { ACCOUNT_TYPES, DOCUMENT_STATUSES, DOCUMENT_TYPES, USER_ROLES } from './constants';

/** The identity slot's `type` — not a backend type: it uploads as NATIONAL_ID or PASSPORT. */
export const IDENTITY_SLOT = 'IDENTITY';

/**
 * Which documents an account is asked for, driven by its account type
 * (the backend's `ownerType`) and whether it rents cars. Everyone supplies an
 * identity document (National ID or Passport — either one satisfies it) and
 * may add proof of address; only car renters are asked for a driving licence
 * (it's for self-drive bookings, so an owner-only account never sees it); a
 * BUSINESS account may also upload a registration certificate and a tax
 * certificate — both optional, since a business doesn't have to be a limited
 * company (sole traders and other unregistered businesses have neither). The
 * backend refuses those two for anyone whose owner profile isn't BUSINESS.
 *
 * @typedef {{ type: string, title: string, description: string, required: boolean, identity?: boolean, twoSided?: boolean }} DocumentSlot
 * @param {string} [accountType] — an ACCOUNT_TYPES value; anything else is treated as Individual
 * @param {{ isRenter?: boolean }} [options]
 * @returns {DocumentSlot[]}
 */
export function getDocumentSlots(accountType, { isRenter = false } = {}) {
  const slots = [
    {
      // One card for both: the person gives a National ID or a Passport, whichever they have.
      type: IDENTITY_SLOT,
      title: 'Identity Document',
      description: 'Required — a National ID or a Passport, plus a selfie holding it.',
      required: true,
      identity: true,
    },
    ...(isRenter
      ? [
          {
            type: DOCUMENT_TYPES.DRIVING_LICENSE,
            title: 'Driving Licence',
            description: 'Needed for self-drive bookings — a photo of the front and a photo of the back.',
            required: false,
            twoSided: true,
          },
        ]
      : []),
    {
      type: DOCUMENT_TYPES.PROOF_OF_ADDRESS,
      title: 'Proof of Address',
      description: 'Optional — a recent utility bill or bank statement.',
      required: false,
    },
  ];

  if (accountType === ACCOUNT_TYPES.BUSINESS) {
    slots.push(
      {
        type: DOCUMENT_TYPES.BUSINESS_REGISTRATION,
        title: 'Business Registration Certificate',
        description: 'Optional — only if your business is registered. Unregistered businesses and sole traders can skip this.',
        required: false,
      },
      {
        type: DOCUMENT_TYPES.TAX_CERTIFICATE,
        title: 'Tax Certificate (KRA PIN)',
        description: 'Optional — only if you have one.',
        required: false,
      }
    );
  }

  return slots;
}

/**
 * Whether an account rents cars: it holds the Renter role (the backend's
 * `CAR_RENTER`, normalised to `RENTER` in authStore) or the backend flags it
 * `isCarRenter`. An account can be both a renter and an owner.
 *
 * @param {{ roles?: string[], isCarRenter?: boolean } | null} [user]
 */
export function isRenterUser(user) {
  return !!user && (user.isCarRenter === true || (user.roles || []).includes(USER_ROLES.RENTER));
}

const counts = (doc) => !!doc && doc.status !== DOCUMENT_STATUSES.REJECTED;

/**
 * Names of the still-missing required documents. The only required one is an
 * identity document, for every account type: a National ID or a Passport
 * satisfies it, and a REJECTED upload doesn't count, so it must be
 * re-uploaded. Business documents are optional (a business needn't be a
 * limited company).
 *
 * @param {Array<{type: string, status: string}>} documents — normalised documents (see useDocuments)
 * @returns {string[]}
 */
export function missingRequiredDocuments(documents = []) {
  const has = (type) => counts(documents.find((d) => d.type === type));
  const missing = [];
  if (!has(DOCUMENT_TYPES.NATIONAL_ID) && !has(DOCUMENT_TYPES.PASSPORT)) missing.push('Identity document');
  return missing;
}
