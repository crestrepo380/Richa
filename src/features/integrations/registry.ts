import type { IntegrationProvider } from "@prisma/client";
import type { ProviderDescriptor } from "./types";

/**
 * The registry: descriptive metadata for every provider, driving the
 * integrations UI (cards, capability chips, config forms). Adding a provider
 * means adding an entry here and a connector class — nothing else.
 *
 * Config fields describe what each provider *will* need; because connectors are
 * deferred, these are the shape of the future settings, stored as-is today.
 */
export const PROVIDER_REGISTRY: Record<IntegrationProvider, ProviderDescriptor> = {
  SHOPIFY: {
    provider: "SHOPIFY",
    name: "Shopify",
    category: "E-commerce",
    description:
      "Import products and pull sales orders to auto-derive units sold; push replenishment back as stock adjustments.",
    capabilities: ["product.import", "inventory.push", "inventory.pull", "order.import"],
    configFields: [
      { key: "shop", label: "Shop domain", type: "text", required: true, placeholder: "your-store.myshopify.com" },
      { key: "accessToken", label: "Admin API access token", type: "password", required: true, secret: true },
    ],
    docsUrl: "https://shopify.dev/docs/api/admin",
  },
  FISHBOWL: {
    provider: "FISHBOWL",
    name: "Fishbowl",
    category: "Inventory",
    description: "Two-way inventory sync with Fishbowl warehouse management.",
    capabilities: ["product.import", "inventory.pull", "inventory.push"],
    configFields: [
      { key: "host", label: "Server host", type: "text", required: true, placeholder: "fishbowl.example.com" },
      { key: "username", label: "Username", type: "text", required: true },
      { key: "password", label: "Password", type: "password", required: true, secret: true },
    ],
  },
  HUBSPOT: {
    provider: "HUBSPOT",
    name: "HubSpot",
    category: "CRM",
    description: "Sync dealers as CRM contacts/companies for the sales team.",
    capabilities: ["contact.sync"],
    configFields: [
      { key: "accessToken", label: "Private app token", type: "password", required: true, secret: true },
    ],
    docsUrl: "https://developers.hubspot.com/docs/api/overview",
  },
  QUICKBOOKS: {
    provider: "QUICKBOOKS",
    name: "QuickBooks",
    category: "Accounting",
    description: "Import items and keep product records aligned with accounting.",
    capabilities: ["product.import"],
    configFields: [
      { key: "realmId", label: "Company (realm) ID", type: "text", required: true },
      { key: "clientId", label: "Client ID", type: "text", required: true },
      { key: "clientSecret", label: "Client secret", type: "password", required: true, secret: true },
    ],
    docsUrl: "https://developer.intuit.com/app/developer/qbo/docs/get-started",
  },
  UPS: {
    provider: "UPS",
    name: "UPS",
    category: "Shipping",
    description: "Fetch shipping rates and tracking for replenishment shipments.",
    capabilities: ["shipping.rates"],
    configFields: [
      { key: "clientId", label: "Client ID", type: "text", required: true },
      { key: "clientSecret", label: "Client secret", type: "password", required: true, secret: true },
    ],
    docsUrl: "https://developer.ups.com/",
  },
  FEDEX: {
    provider: "FEDEX",
    name: "FedEx",
    category: "Shipping",
    description: "Fetch shipping rates and tracking for replenishment shipments.",
    capabilities: ["shipping.rates"],
    configFields: [
      { key: "apiKey", label: "API key", type: "text", required: true },
      { key: "secretKey", label: "Secret key", type: "password", required: true, secret: true },
    ],
    docsUrl: "https://developer.fedex.com/",
  },
};

export const PROVIDER_ORDER: IntegrationProvider[] = [
  "SHOPIFY",
  "FISHBOWL",
  "HUBSPOT",
  "QUICKBOOKS",
  "UPS",
  "FEDEX",
];

export function getDescriptor(provider: IntegrationProvider): ProviderDescriptor {
  return PROVIDER_REGISTRY[provider];
}

/** Keys of secret config fields for a provider — never returned to the client. */
export function secretKeys(provider: IntegrationProvider): Set<string> {
  return new Set(
    PROVIDER_REGISTRY[provider].configFields
      .filter((f) => f.secret)
      .map((f) => f.key),
  );
}
