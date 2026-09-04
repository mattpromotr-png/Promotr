export const TABLE_HOLD_MINUTES = 30;

export type TablePackage = {
  id: string;
  code: string;
  name: string;
  zone: string;
  capacity: number;
  minimumSpendCad: number;
  depositCad: number;
  x: number;
  y: number;
  shape: "round" | "booth";
};

const id = (number: number) =>
  `10000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
const table = (
  number: number,
  code: string,
  zone: string,
  capacity: number,
  minimumSpendCad: number,
  depositCad: number,
  x: number,
  y: number,
  shape: "round" | "booth" = "round",
): TablePackage => ({
  id: id(number),
  code,
  name: `${zone} ${code}`,
  zone,
  capacity,
  minimumSpendCad,
  depositCad,
  x,
  y,
  shape,
});

export const tablePackages: TablePackage[] = [
  table(1, "L1", "Lounge", 6, 600, 150, 8, 28, "booth"),
  table(2, "L2", "Lounge", 6, 600, 150, 8, 50, "booth"),
  table(3, "P1", "Premium VIP", 8, 1200, 300, 86, 28, "booth"),
  table(4, "P2", "Premium VIP", 8, 1200, 300, 86, 50, "booth"),
  table(5, "D1", "Dance floor", 6, 900, 225, 32, 35),
  table(6, "D2", "Dance floor", 6, 900, 225, 44, 35),
  table(7, "S1", "Stage VIP", 10, 2000, 500, 34, 17, "booth"),
  table(8, "S2", "Stage VIP", 10, 2000, 500, 47, 17, "booth"),
  table(9, "S3", "Stage VIP", 10, 2000, 500, 60, 17, "booth"),
  table(10, "S4", "Stage VIP", 10, 2000, 500, 73, 17, "booth"),
  table(11, "D3", "Dance floor", 6, 900, 225, 56, 35),
  table(12, "D4", "Dance floor", 6, 900, 225, 68, 35),
  table(13, "D5", "Dance floor", 6, 900, 225, 32, 49),
  table(14, "D6", "Dance floor", 6, 900, 225, 44, 49),
  table(15, "D7", "Dance floor", 6, 900, 225, 56, 49),
  table(16, "D8", "Dance floor", 6, 900, 225, 68, 49),
  table(17, "D9", "Dance floor", 8, 1100, 275, 32, 63),
  table(18, "D10", "Dance floor", 8, 1100, 275, 44, 63),
  table(19, "D11", "Dance floor", 8, 1100, 275, 56, 63),
  table(20, "D12", "Dance floor", 8, 1100, 275, 68, 63),
  table(21, "L3", "Lounge", 6, 600, 150, 8, 72, "booth"),
  table(22, "L4", "Lounge", 6, 600, 150, 18, 28, "booth"),
  table(23, "L5", "Lounge", 6, 600, 150, 18, 50, "booth"),
  table(24, "L6", "Lounge", 6, 600, 150, 18, 72, "booth"),
  table(25, "P3", "Premium VIP", 8, 1200, 300, 76, 28, "booth"),
  table(26, "P4", "Premium VIP", 8, 1200, 300, 76, 50, "booth"),
  table(27, "P5", "Premium VIP", 8, 1200, 300, 76, 72, "booth"),
  table(28, "P6", "Premium VIP", 8, 1200, 300, 86, 72, "booth"),
  table(29, "B1", "Back lounge", 10, 1500, 400, 42, 82, "booth"),
  table(30, "B2", "Back lounge", 10, 1500, 400, 58, 82, "booth"),
];
