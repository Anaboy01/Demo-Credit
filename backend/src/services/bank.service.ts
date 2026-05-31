import { EligibleBank } from "../types";

const ELIGIBLE_BANKS: EligibleBank[] = [
  { code: "033", name: "UBA", slug: "uba" },
  { code: "100004", name: "OPay", slug: "opay" },
  { code: "100033", name: "PalmPay", slug: "palmpay" },
];

export const getEligibleBanks = async (): Promise<EligibleBank[]> => {
  // Swap this for a payment-provider bank list API (e.g. Paystack, Flutterwave) when integrated.
  return ELIGIBLE_BANKS;
};

export const findEligibleBank = async (
  bankCode: string
): Promise<EligibleBank | undefined> => {
  const normalized = bankCode.trim().toLowerCase();
  const banks = await getEligibleBanks();

  return banks.find(
    (bank) =>
      bank.code === bankCode ||
      bank.slug === normalized ||
      bank.name.toLowerCase() === normalized
  );
};

export const isValidNuban = (accountNumber: string): boolean =>
  /^\d{10}$/.test(accountNumber.trim());
