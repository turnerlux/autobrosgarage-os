import { NextResponse } from "next/server";

import { PermissionDeniedError } from "@/auth/authorization";
import { getRequestSession } from "@/auth/runtime";
import { DatabaseCustomerStore } from "@/customers/store";
import { getDatabase } from "@/db/client";
import { listShopJobs } from "@/jobs/service";
import { DatabaseJobStore } from "@/jobs/store";
import { DatabaseUserStore } from "@/users/store";
import { DatabaseVehicleStore } from "@/vehicles/store";

/**
 * The job board: every job in the caller's shop, newest check-in first, with the customer,
 * vehicle, and assigned technician resolved to display names. Records are looked up by their
 * ids in a single pass rather than per row, so a full board is a handful of queries.
 */
export async function GET(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "Sign in to view the job board." }, { status: 401 });
  }

  try {
    const database = getDatabase();
    const customerStore = new DatabaseCustomerStore(database);
    const vehicleStore = new DatabaseVehicleStore(database);
    const userStore = new DatabaseUserStore(database);
    const shopId = session.user.shopId;

    const jobs = await listShopJobs(session, { jobs: new DatabaseJobStore(database) });

    const unique = (values: (string | undefined)[]) => [
      ...new Set(values.filter((value): value is string => Boolean(value))),
    ];

    const [customers, vehicles, technicians] = await Promise.all([
      Promise.all(
        unique(jobs.map((job) => job.customerId)).map((id) => customerStore.findById(shopId, id)),
      ),
      Promise.all(
        unique(jobs.map((job) => job.vehicleId)).map((id) => vehicleStore.findById(shopId, id)),
      ),
      Promise.all(
        unique(jobs.map((job) => job.assignedTechnicianId)).map((id) =>
          userStore.findById(shopId, id),
        ),
      ),
    ]);

    const customerById = new Map(customers.filter(Boolean).map((row) => [row!.id, row!]));
    const vehicleById = new Map(vehicles.filter(Boolean).map((row) => [row!.id, row!]));
    const technicianById = new Map(technicians.filter(Boolean).map((row) => [row!.id, row!]));

    return NextResponse.json({
      jobs: jobs.map((job) => {
        const vehicle = vehicleById.get(job.vehicleId);
        return {
          id: job.id,
          jobNumber: job.jobNumber,
          status: job.status,
          complaint: job.complaint,
          checkedInAt: job.checkedInAt,
          serviceMode: job.serviceMode,
          customerName: customerById.get(job.customerId)?.displayName,
          technicianName: job.assignedTechnicianId
            ? technicianById.get(job.assignedTechnicianId)?.displayName
            : undefined,
          vehicle: vehicle
            ? {
                id: vehicle.id,
                vin: vehicle.vin,
                year: vehicle.year,
                make: vehicle.make,
                model: vehicle.model,
                licensePlate: vehicle.licensePlate,
              }
            : undefined,
        };
      }),
    });
  } catch (error) {
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json(
        { error: "You do not have access to the job board." },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: "The job board is temporarily unavailable." },
      { status: 503 },
    );
  }
}
