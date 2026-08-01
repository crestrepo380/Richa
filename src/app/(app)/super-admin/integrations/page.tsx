import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { requirePermission } from "@/lib/auth/dal";
import { getIntegrations } from "@/features/integrations/queries";
import { IntegrationCard } from "@/features/integrations/integration-card";

export const metadata: Metadata = { title: "Integrations" };

export default async function IntegrationsPage() {
  await requirePermission("integration:manage");
  const integrations = await getIntegrations();

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect the portal to the systems you already use. More coming soon."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.descriptor.provider}
            integration={integration}
          />
        ))}
      </div>
    </>
  );
}
