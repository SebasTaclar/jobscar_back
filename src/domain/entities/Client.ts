export type Client = {
  id: number;
  name: string;
  phone: string;
  email: string;
  notes?: string | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};
