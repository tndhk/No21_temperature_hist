import { ETLButton } from "@/components/ETLButton";
import { PrismaClient } from "@prisma/client";
import { HomePageClient } from "./HomePageClient";

const prisma = new PrismaClient();

export default async function Home() {
  // DBから存在するデータの年リストを取得
  const yearRecords = await prisma.temperatureHistory.findMany({
    select: { date: true },
    distinct: ['date'],
    orderBy: { date: 'desc' },
  });
  const availableYears = [
    ...new Set(yearRecords.map((r) => r.date.getFullYear())),
  ].sort((a, b) => b - a); // 重複削除し降順ソート

  const data = await prisma.temperatureHistory.findMany({
    orderBy: { date: "desc" },
  });

  return (
    <div className="container mx-auto p-4">
      <main className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Temperature History Comparison in Tokyo</h1>

        <HomePageClient initialDbData={data} availableYears={availableYears} />
        <ETLButton />
      </main>
    </div>
  );
}
