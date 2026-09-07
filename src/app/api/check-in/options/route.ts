import { NextResponse } from "next/server";

import { PermissionDeniedError, requirePermission } from "@/auth/authorization";
import { getRequestSession } from "@/auth/runtime";
import { DatabaseCustomerStore } from "@/customers/store";
import { getDatabase } from "@/db/client";
import { DatabaseJobStore } from "@/jobs/store";
import { universalSearch } from "@/search/service";
import { DatabaseUserStore } from "@/users/store";
import { DatabaseVehicleStore } from "@/vehicles/store";

export async function GET(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "Sign in to search shop records." }, { status: 401 });
  }

  try {
    requirePermission(session, "customers:read");
    requirePermission(session, "jobs:write");
    const database = getDatabase();
    const customers = new DatabaseCustomerStore(database);
    const vehicles = new DatabaseVehicleStore(database);
    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

    const [results, technicians] = await Promise.all([
      universalSearch(
        session,
        { customers, vehicles, jobs: new DatabaseJobStore(database) },
        query,
      ),
      new DatabaseUserStore(database).listActiveTechnicians(session.user.shopId),
    ]);

    const customerIds = new Set(
      results.vehicles.map((vehicle) => vehicle.customerId).filter(Boolean),
    );
    const vehicleCustomers = await Promise.all(
      [...customerIds].map((id) => customers.findById(session.user.shopId, id!)),
    );
    const customerById = new Map(
      vehicleCustomers.filter(Boolean).map((customer) => [customer!.id, customer!]),
    );

    return NextResponse.json({
      customers: results.customers.map((customer) => ({
        id: customer.id,
        name: customer.displayName,
        phone: customer.phone,
        email: customer.email,
        address: customer.billingAddress?.line1,
        isDealer: customer.isDealer,
      })),
      vehicles: results.vehicles.map((vehicle) => ({
        id: vehicle.id,
        customerId: vehicle.customerId,
        customerName: vehicle.customerId
          ? customerById.get(vehicle.customerId)?.displayName
          : undefined,
        customer: vehicle.customerId
          ? (() => {
              const customer = customerById.get(vehicle.customerId!);
              return customer
                ? {
                    id: customer.id,
                    name: customer.displayName,
                    phone: customer.phone,
                    email: customer.email,
                    address: customer.billingAddress?.line1,
                    isDealer: customer.isDealer,
                  }
                : undefined;
            })()
          : undefined,
        vin: vehicle.vin,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        mileage: vehicle.mileage,
        licensePlate: vehicle.licensePlate,
      })),
      technicians: technicians.map((technician) => ({
        id: technician.id,
        name: technician.displayName,
      })),
    });
  } catch (error) {
    if (!(error instanceof PermissionDeniedError)) {
      return NextResponse.json(
        { error: "Shop records are temporarily unavailable." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "You do not have access to vehicle check-in." },
      { status: 403 },
    );
  }
}
