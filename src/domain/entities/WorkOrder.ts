export type WorkOrder = {
  id: number;
  vehicleId: number;
  mechanicId?: number | null;
  status?: string;
  services?: string[];
  gases?: boolean;
  escaner?: boolean;
  observations?: string | null;
  diagnosis?: string | null;
  deliveryDate?: Date | null;
  garantia?: number | null;
  total?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
};
