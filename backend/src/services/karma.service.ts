import { KarmaLookupResponse } from "../types";
import { toKarmaPhone } from "../utils/helpers";

const ADJUTOR_KARMA_URL =
  "https://adjutor.lendsqr.com/v2/verification/karma";

const getAdjutorApiKey = (): string => {
  const key = process.env.ADJUTOR_API_KEY || process.env.API_KEY;
  if (!key) {
    throw new Error("Adjutor API key is not configured.");
  }
  return key;
};

export const isKarmaHit = (response: KarmaLookupResponse): boolean =>
  response.status === "success" &&
  response.message === "Successful" &&
  response.data != null;

export const lookupKarmaIdentity = async (
  identity: string
): Promise<KarmaLookupResponse> => {
  const url = `${ADJUTOR_KARMA_URL}/${encodeURIComponent(identity)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${getAdjutorApiKey()}`,
        Accept: "application/json",
      },
    });
  } catch {
    throw new Error("Adjutor Karma lookup request failed.");
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("Adjutor rejected the API key or Karma scope.");
  }

  if (!response.ok && response.status !== 404) {
    throw new Error(`Adjutor Karma lookup failed with status ${response.status}.`);
  }

  try {
    return (await response.json()) as KarmaLookupResponse;
  } catch {
    return {};
  }
};

export const isRegistrationBlocked = async (
  email: string,
  phone: string
): Promise<boolean> => {
  const [emailResult, phoneResult] = await Promise.all([
    lookupKarmaIdentity(email),
    lookupKarmaIdentity(toKarmaPhone(phone)),
  ]);

  return isKarmaHit(emailResult) || isKarmaHit(phoneResult);
};
