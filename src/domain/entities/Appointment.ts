export type Appointment = {
  id: number;
  date: Date;
  plate?: string | null;
  client?: string | null;
  subject?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};
