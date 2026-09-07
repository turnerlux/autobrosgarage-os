import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { DatabaseAuditStore } from "@/audit/store";
import { AuthenticationRequiredError, PermissionDeniedError } from "@/auth/authorization";
import { getRequestSession } from "@/auth/runtime";
import { DatabaseCustomerStore } from "@/customers/store";
import { PossibleDuplicateCustomerError } from "@/customers/service";
import { getDatabase, type Database } from "@/db/client";
import { DatabaseJobNumberCounterStore } from "@/jobs/job-number";
import { DatabaseJobStore } from "@/jobs/store";
import { createCheckIn, VehicleCustomerConflictError } from "@/intake/service";
import { ApplicationError, toPublicError } from "@/lib/errors/public-error";
import { DatabaseShopStore } from "@/tenancy/store";
import { DatabaseUserStore } from "@/users/store";
import { DatabaseVehicleStore } from "@/vehicles/store";

export async function POST(request: Request) {
  const reference = randomUUID();

  try {
    const session = await getRequestSession(request);
    if (!session) throw new AuthenticationRequiredError();
    const input = await request.json();
    const database = getDatabase();

    const result = await database.transaction(async (transaction) => {
      // Drizzle's transaction object exposes the same query methods used by each store. Keeping the
      // cast here makes the transactional boundary explicit without weakening store APIs globally.
      const tx = transaction as unknown as Database;
      return createCheckIn(
        session,
        {
          customers: new DatabaseCustomerStore(tx),
          vehicles: new DatabaseVehicleStore(tx),
          jobs: new DatabaseJobStore(tx),
          jobNumberCounters: new DatabaseJobNumberCounterStore(tx),
          shops: new DatabaseShopStore(tx),
          users: new DatabaseUserStore(tx),
          audit: new DatabaseAuditStore(tx),
        },
        input,
        reference,
      );
    });

    return NextResponse.json(
      {
        job: {
          id: result.job.id,
          jobNumber: result.job.jobNumber,
          status: result.job.status,
        },
        customer: { id: result.customer.id, name: result.customer.displayName },
        vehicle: {
          id: result.vehicle.id,
          vin: result.vehicle.vin,
          year: result.vehicle.year,
          make: result.vehicle.make,
          model: result.vehicle.model,
        },
        createdCustomer: result.createdCustomer,
        createdVehicle: result.createdVehicle,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: "Sign in to start a check-in." }, { status: 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Check the required fields and try again." },
        { status: 400 },
      );
    }
    if (error instanceof VehicleCustomerConflictError) {
      return NextResponse.json(
        {
          error: error.safeMessage,
          code: error.code,
          customerId: error.existingCustomerId,
          vin: error.vehicle.vin,
        },
        { status: error.status },
      );
    }
    if (error instanceof PossibleDuplicateCustomerError) {
      return NextResponse.json(
        {
          error: error.safeMessage,
          code: error.code,
          kind: "customer_duplicate",
          candidates: error.candidates.map((customer) => ({
            id: customer.id,
            name: customer.displayName,
            phone: customer.phone,
            email: customer.email,
            address: customer.billingAddress?.line1,
            isDealer: customer.isDealer,
          })),
        },
        { status: error.status },
      );
    }

    const publicError = toPublicError(
      error instanceof ApplicationError ? error : new Error("check-in failed"),
      reference,
    );
    return NextResponse.json(
      { error: publicError.message, code: publicError.code, reference: publicError.reference },
      { status: publicError.status },
    );
  }
}
