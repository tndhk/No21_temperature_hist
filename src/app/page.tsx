import Image from "next/image";
import { ETLButton } from "@/components/ETLButton";
import { PrismaClient } from "@prisma/client";
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { TemperatureChart } from "@/components/TemperatureChart";

const prisma = new PrismaClient();

export default async function Home() {
  // DBから存在するデータの年リストを取得
  const yearRecords = await prisma.temperatureHistory.findMany({
    select: { date: true },
    distinct: ['date'], // 年取得のため仮で日付のdistinctを利用
    orderBy: { date: 'desc' },
  });
  const availableYears = [
    ...new Set(yearRecords.map((r) => r.date.getFullYear())),
  ].sort((a, b) => b - a); // 重複削除し降順ソート

  return (
    <div className="container mx-auto p-4">
      <main className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">東京 気温履歴</h1>
        <ETLButton />

        {/* グラフ表示 */} 
        <TemperatureChart availableYears={availableYears} />
      </main>
    </div>
  );
}
