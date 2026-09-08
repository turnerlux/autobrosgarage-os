import { NextResponse } from "next/server";

import { PermissionDeniedError } from "@/auth/authorization";
import { getRequestSession } from "@/auth/runtime";
import { DatabaseCustomerStore } from "@/customers/store";
import { getDatabase } from "@/db/client";
import { ApplicationError } from "@/lib/errors/public-error";
import { listCustomerVehicles } from "@/vehicles/service";
import { DatabaseVehicleStore } from "@/vehicles/store";

/**
 * Vehicles already on file for one customer. Called by the check-in screen the moment a
 * returning customer is selected, so a repeat visit can tap a saved vehicle instead of
 * re-typing a VIN. Tenant scoping and permissions are enforced in `listCustomerVehicles`,
 * not here -- this route only translates HTTP to that service call and back.
 */
export async function GET(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "Sign in to search shop records." }, { status: 401 });
  }

  const customerId = new URL(request.url).searchParams.get("customerId")?.trim();
  if (!customerId) {
    return NextResponse.json({ error: "A customer is required." }, { status: 400 });
  }

  try {
    const database = getDatabase();
    const vehicles = await listCustomerVehicles(
      session,
      {
        vehicles: new DatabaseVehicleStore(database),
        customers: new DatabaseCustomerStore(database),
      },
      customerId,
    );

    return NextResponse.json({
      vehicles: vehicles.map((vehicle) => ({
        id: vehicle.id,
        vin: vehicle.vin,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        mileage: vehicle.mileage,
        licensePlate: vehicle.licensePlate,
      })),
    });
  } catch (error) {
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json(
        { error: "You do not have access to vehicle records." },
        { status: 403 },
      );
    }
    // A missing or cross-shop customer is reported the same way, so this route never
    // confirms whether a record exists in another shop.
    if (error instanceof ApplicationError) {
      return NextResponse.json({ vehicles: [] });
    }
    return NextResponse.json(
      { error: "Shop records are temporarily unavailable." },
      { status: 503 },
    );
  }
}
