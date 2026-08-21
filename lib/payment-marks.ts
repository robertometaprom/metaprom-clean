import type { CSSProperties } from "react";

export type PaymentMarkId = "visa" | "mastercard" | "amex" | "oxxo";

export type PaymentMarkAsset = {
  id: PaymentMarkId;
  src: string;
  width: number;
  height: number;
  alt: string;
  style: CSSProperties;
};

/**
 * Owner-approved payment marks. Render with CSS sizing only —
 * do not crop, recolor, or convert these files.
 */
export const PAYMENT_MARKS: Record<PaymentMarkId, PaymentMarkAsset> = {
  visa: {
    id: "visa",
    src: "/logos/payments/visa.png",
    width: 580,
    height: 353,
    alt: "Visa",
    style: {
      display: "block",
      width: "auto",
      height: "auto",
      maxHeight: 78,
      maxWidth: "86%",
      minHeight: 0,
      minWidth: 0,
      objectFit: "contain",
    },
  },
  mastercard: {
    id: "mastercard",
    src: "/logos/payments/mastercard.png",
    width: 220,
    height: 156,
    alt: "Mastercard",
    style: {
      display: "block",
      width: "auto",
      height: "auto",
      maxHeight: 70,
      maxWidth: "78%",
      minHeight: 0,
      minWidth: 0,
      objectFit: "contain",
    },
  },
  amex: {
    id: "amex",
    src: "/logos/payments/amex.png",
    width: 500,
    height: 500,
    alt: "American Express",
    style: {
      display: "block",
      width: "auto",
      height: "auto",
      maxHeight: 54,
      maxWidth: 54,
      minHeight: 0,
      minWidth: 0,
      objectFit: "contain",
    },
  },
  oxxo: {
    id: "oxxo",
    src: "/logos/payments/oxxo-pay.png",
    width: 3776,
    height: 890,
    alt: "OXXO PAY",
    style: {
      display: "block",
      width: "auto",
      height: "auto",
      maxHeight: 52,
      maxWidth: "94%",
      minHeight: 0,
      minWidth: 0,
      objectFit: "contain",
    },
  },
};

export const CARD_PAYMENT_MARK_IDS: readonly PaymentMarkId[] = [
  "visa",
  "mastercard",
  "amex",
];
