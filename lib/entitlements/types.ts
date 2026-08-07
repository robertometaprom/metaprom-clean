export type EntitlementKind = "commercial" | "advertising_asset";

export type EntitlementBalances = {
  userId: string;
  commercialsRemaining: number;
  advertisingAssetsRemaining: number;
};

export type GrantPackageResult = {
  granted: boolean;
  kind: EntitlementKind;
  quantity: number;
  productId: string;
  purchaseId: string | number;
};
