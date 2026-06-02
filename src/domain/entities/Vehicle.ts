export type Vehicle = {
  id: number;
  clientId?: number | null;
  client: string;
  plate: string;
  brand: string;
  model: string;
  year?: number | null;
  km: number;
  vehicleType: string;
  lastServiceDate?: Date | null;
  nextServiceKm?: number | null;
  observations?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};
