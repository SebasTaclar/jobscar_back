export type MoneyMovement = {
  id: number;
  reference?: string;
  name: string;
  concept: string;
  movement: string;
  amount: number;
  account?: string;
  observation?: string;
  createdAt?: Date;
  updatedAt?: Date;
};
