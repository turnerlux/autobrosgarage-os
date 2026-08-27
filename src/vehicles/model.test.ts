import { describe, expect, it } from "vitest";

import { applyVehicleUpdate, createVehicle } from "./model";

const shopId = "1e8f8732-e5bc-47db-b811-ffd67944dc92";

describe("vehicle records", () => {
  it("accepts a vehicle identified by VIN", () => {
    const vehicle = createVehicle({ shopId, vin: "1gnskbe07dr123456" });
    expect(vehicle.vin).toBe("1GNSKBE07DR123456");
  });

  it("accepts a vehicle identified by year/make/model without a VIN", () => {
    const vehicle = createVehicle({ shopId, year: 2018, make: "Chevrolet", model: "Tahoe" });
    expect(vehicle.make).toBe("Chevrolet");
  });

  it("rejects an invalid VIN", () => {
    expect(() => createVehicle({ shopId, vin: "not-a-real-vin" })).toThrow();
  });

  it("rejects a vehicle with no identifying information", () => {
    expect(() => createVehicle({ shopId })).toThrow();
  });

  it("updates mileage while preserving other fields", () => {
    const vehicle = createVehicle({ shopId, vin: "1GNSKBE07DR123456" });
    const updated = applyVehicleUpdate(vehicle, { mileage: 142_801 });
    expect(updated.mileage).toBe(142_801);
    expect(updated.vin).toBe(vehicle.vin);
  });
});
