import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 恆春旅遊醫院常見特材品項（參考健保署醫材比價網公開資料）
const devices = [
  { code: "FABA01CT1Q", name: "人工水晶體-單焦非球面", category: "眼科", price: 2744, selfPay: 0, unit: "個" },
  { code: "FABA02CT1A", name: "多焦點人工水晶體", category: "眼科", price: 2744, selfPay: 87000, unit: "個" },
  { code: "FABA03CT1E", name: "散光矯正人工水晶體", category: "眼科", price: 2744, selfPay: 65000, unit: "個" },
  { code: "FBHA01CTBA", name: "金屬人工髖關節組（全套）", category: "骨科", price: 53000, selfPay: 0, unit: "組" },
  { code: "FBHA02CTBA", name: "陶瓷人工髖關節組（全套）", category: "骨科", price: 53000, selfPay: 55000, unit: "組" },
  { code: "FBKA01CT1A", name: "人工膝關節組（全套）", category: "骨科", price: 55000, selfPay: 0, unit: "組" },
  { code: "FBKA02CT1A", name: "高交聯聚乙烯人工膝關節", category: "骨科", price: 55000, selfPay: 30000, unit: "組" },
  { code: "FBSA01CT1A", name: "脊椎鋼釘內固定器（1節）", category: "骨科", price: 31000, selfPay: 0, unit: "組" },
  { code: "FBSA02CT1B", name: "椎間盤護架（PEEK）", category: "骨科", price: 28000, selfPay: 35000, unit: "個" },
  { code: "FCAA01CT1A", name: "塗藥心臟支架", category: "心臟內科", price: 0, selfPay: 45000, unit: "支" },
  { code: "FCAA02CT1A", name: "一般心臟支架（裸金屬）", category: "心臟內科", price: 17000, selfPay: 0, unit: "支" },
  { code: "FCBA01CT1A", name: "心臟節律器（單腔）", category: "心臟內科", price: 120000, selfPay: 0, unit: "組" },
  { code: "FCBA02CT1A", name: "心臟節律器（雙腔）", category: "心臟內科", price: 156000, selfPay: 0, unit: "組" },
  { code: "FDAA01CT1A", name: "全瓷牙冠", category: "牙科", price: 0, selfPay: 15000, unit: "顆" },
  { code: "FDAA02CT1A", name: "金屬烤瓷牙冠", category: "牙科", price: 0, selfPay: 8000, unit: "顆" },
  { code: "FEAA01CT1A", name: "人工電子耳（單側）", category: "耳鼻喉科", price: 600000, selfPay: 0, unit: "組" },
  { code: "FGAA01CT1A", name: "腹腔鏡手術組合包", category: "一般外科", price: 12000, selfPay: 0, unit: "組" },
  { code: "FGAA02CT1A", name: "自動縫合器（含釘匣）", category: "一般外科", price: 8500, selfPay: 0, unit: "個" },
  { code: "FGBA01CT1A", name: "生物組織補片（疝氣）", category: "一般外科", price: 18000, selfPay: 25000, unit: "片" },
  { code: "FHAA01CT1A", name: "顱內動脈瘤線圈", category: "神經外科", price: 25000, selfPay: 0, unit: "個" },
  { code: "FIAA01CT1A", name: "可吸收止血紗布", category: "一般外科", price: 3500, selfPay: 0, unit: "片" },
  { code: "FJAA01CT1A", name: "連續血糖監測器", category: "內分泌科", price: 0, selfPay: 3500, unit: "個" },
  { code: "FKAA01CT1A", name: "負壓傷口治療器", category: "一般外科", price: 8000, selfPay: 0, unit: "組" },
  { code: "FLAA01CT1A", name: "矽膠引流管（胸腔）", category: "胸腔外科", price: 2500, selfPay: 0, unit: "條" },
  { code: "FMAA01CT1A", name: "微創椎間盤切除器械", category: "骨科", price: 15000, selfPay: 20000, unit: "組" },
];

async function main() {
  console.log("=== 特材示範資料 Seed ===");

  for (const d of devices) {
    await prisma.device.upsert({
      where: { code: d.code },
      update: {
        name: d.name,
        category: d.category,
        price: d.price,
        selfPay: d.selfPay,
        unit: d.unit,
        status: "給付中",
        startDate: "2024-01-01",
      },
      create: {
        code: d.code,
        name: d.name,
        category: d.category,
        price: d.price,
        selfPay: d.selfPay,
        unit: d.unit,
        status: "給付中",
        startDate: "2024-01-01",
      },
    });
  }

  console.log(`已寫入 ${devices.length} 筆特材資料`);
}

main()
  .catch((e) => {
    console.error("Seed 失敗:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
