import { requirePermission } from "../auth/authorization";
import type { Session } from "../auth/model";
import { createAuditEvent } from "../audit/model";
import type { AuditStore } from "../audit/store";

import {
  applyBusinessSettingsUpdate,
  createDefaultBusinessSettings,
  type BusinessSettings,
  type BusinessSettingsPatch,
} from "./model";
import type { BusinessSettingsStore } from "./store";

export interface BusinessSettingsStores {
  settings: BusinessSettingsStore;
  audit: AuditStore;
}

/**
 * Returns the shop's business settings, creating (and persisting) the master-spec defaults
 * the first time a shop is read. Gated on `estimates:read` rather than a bespoke permission:
 * everyone who prices work (owner, manager, service advisor, bookkeeper) needs these values;
 * technicians do not have `estimates:read` and so do not get them through this path, which
 * matches the owner's rule that technicians never automatically gain financial visibility.
 */
export async function getBusinessSettingsRecord(
  session: Session,
  stores: BusinessSettingsStores,
  requestId?: string,
): Promise<BusinessSettings> {
  requirePermission(session, "estimates:read");
  const shopId = session.user.shopId;

  const existing = await stores.settings.findByShop(shopId);
  if (existing) return existing;

  const seeded = createDefaultBusinessSettings({ shopId });
  await stores.settings.insert(seeded);
  await stores.audit.append(
    createAuditEvent({
      shopId,
      actorType: "system",
      action: "business_settings.seeded",
      entityType: "business_settings",
      entityId: seeded.id,
      after: seeded,
      source: "web",
      requestId,
    }),
  );

  return seeded;
}

/**
 * Owner-only (`settings:manage`), matching the rest of the app's settings-management
 * boundary. This is the mechanism the owner can use to change business rules like labor
 * rate or diagnosis fee -- the change itself always still requires the owner's explicit
 * action; this function does not make the policy decision, only records it durably.
 */
export async function updateBusinessSettingsRecord(
  session: Session,
  stores: BusinessSettingsStores,
  patch: BusinessSettingsPatch,
  requestId?: string,
): Promise<BusinessSettings> {
  requirePermission(session, "settings:manage");
  const shopId = session.user.shopId;

  const existing = await getBusinessSettingsRecord(session, stores, requestId);
  const updated = applyBusinessSettingsUpdate(existing, patch, session.user.id);
  await stores.settings.update(shopId, updated);
  await stores.audit.append(
    createAuditEvent({
      shopId,
      actorType: "human",
      actorId: session.user.id,
      action: "business_settings.updated",
      entityType: "business_settings",
      entityId: updated.id,
      before: existing,
      after: updated,
      source: "web",
      requestId,
    }),
  );

  return updated;
}
