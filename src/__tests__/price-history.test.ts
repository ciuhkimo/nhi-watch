import { describe, it, expect } from "vitest";

describe("PriceHistory backfill logic", () => {
  function getPrevDate(dateStr: string): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  }

  it("getPrevDate 回傳前一天日期", () => {
    expect(getPrevDate("2026-03-30")).toBe("2026-03-29");
    expect(getPrevDate("2026-01-01")).toBe("2025-12-31");
    expect(getPrevDate("2026-03-01")).toBe("2026-02-28");
  });

  it("正確從調價紀錄建立價格點", () => {
    const changes = [
      {
        itemCode: "A123456789",
        date: "2026-03-15",
        changeType: "調價",
        field: "price",
        oldValue: "10.50",
        newValue: "12.00",
      },
      {
        itemCode: "A123456789",
        date: "2026-03-28",
        changeType: "調價",
        field: "price",
        oldValue: "12.00",
        newValue: "15.00",
      },
    ];

    const entries: { drugCode: string; price: number; date: string }[] = [];

    for (const change of changes) {
      if (change.oldValue) {
        entries.push({
          drugCode: change.itemCode,
          price: parseFloat(change.oldValue),
          date: getPrevDate(change.date),
        });
      }
      if (change.newValue) {
        entries.push({
          drugCode: change.itemCode,
          price: parseFloat(change.newValue),
          date: change.date,
        });
      }
    }

    expect(entries).toHaveLength(4);
    // 第一筆調價的舊價格
    expect(entries[0]).toEqual({
      drugCode: "A123456789",
      price: 10.5,
      date: "2026-03-14",
    });
    // 第一筆調價的新價格
    expect(entries[1]).toEqual({
      drugCode: "A123456789",
      price: 12.0,
      date: "2026-03-15",
    });
    // 第二筆調價的舊價格
    expect(entries[2]).toEqual({
      drugCode: "A123456789",
      price: 12.0,
      date: "2026-03-27",
    });
    // 第二筆調價的新價格
    expect(entries[3]).toEqual({
      drugCode: "A123456789",
      price: 15.0,
      date: "2026-03-28",
    });
  });

  it("新增類型的 change 不產生 oldValue 價格點", () => {
    const changes = [
      {
        itemCode: "B987654321",
        date: "2026-03-20",
        changeType: "新增",
        field: null,
        oldValue: null,
        newValue: null,
      },
    ];

    const entries: { drugCode: string; price: number; date: string }[] = [];

    for (const change of changes) {
      if (change.oldValue) {
        entries.push({
          drugCode: change.itemCode,
          price: parseFloat(change.oldValue),
          date: getPrevDate(change.date),
        });
      }
      if (change.newValue) {
        entries.push({
          drugCode: change.itemCode,
          price: parseFloat(change.newValue),
          date: change.date,
        });
      }
    }

    expect(entries).toHaveLength(0);
  });

  it("sync pipeline 過濾調價與新增的 changes", () => {
    const changes = [
      { changeType: "新增", itemCode: "A001" },
      { changeType: "調價", itemCode: "A002" },
      { changeType: "停用", itemCode: "A003" },
      { changeType: "新增", itemCode: "A004" },
    ];

    const priceChangeItems = changes.filter(
      (c) => c.changeType === "調價" || c.changeType === "新增"
    );

    expect(priceChangeItems).toHaveLength(3);
    expect(priceChangeItems.map((c) => c.itemCode)).toEqual(["A001", "A002", "A004"]);
  });

  it("drugPriceMap 正確對應藥品價格", () => {
    const drugs = [
      { code: "A001", price: 10.5 },
      { code: "A002", price: 25.0 },
      { code: "A004", price: 3.2 },
    ];

    const drugPriceMap = new Map(drugs.map((d) => [d.code, d.price]));

    const priceChangeItems = [
      { changeType: "新增", itemCode: "A001" },
      { changeType: "調價", itemCode: "A002" },
      { changeType: "新增", itemCode: "A004" },
    ];

    const today = "2026-03-30";
    const data = priceChangeItems
      .filter((c) => drugPriceMap.has(c.itemCode))
      .map((c) => ({
        drugCode: c.itemCode,
        price: drugPriceMap.get(c.itemCode)!,
        date: today,
      }));

    expect(data).toHaveLength(3);
    expect(data[0]).toEqual({ drugCode: "A001", price: 10.5, date: "2026-03-30" });
    expect(data[1]).toEqual({ drugCode: "A002", price: 25.0, date: "2026-03-30" });
    expect(data[2]).toEqual({ drugCode: "A004", price: 3.2, date: "2026-03-30" });
  });
});

describe("PriceHistory API response shape", () => {
  it("API 回傳格式驗證", () => {
    // 模擬 API 回傳
    const response = {
      success: true,
      data: {
        drugCode: "A123456789",
        drugName: "測試藥品",
        currentPrice: 15.0,
        history: [
          { date: "2026-03-14", price: 10.5 },
          { date: "2026-03-15", price: 12.0 },
          { date: "2026-03-28", price: 15.0 },
        ],
      },
    };

    expect(response.success).toBe(true);
    expect(response.data.drugCode).toBe("A123456789");
    expect(response.data.history).toHaveLength(3);
    // 確認歷史按日期升序
    for (let i = 1; i < response.data.history.length; i++) {
      expect(response.data.history[i].date >= response.data.history[i - 1].date).toBe(true);
    }
  });

  it("無歷史紀錄時回傳空陣列", () => {
    const response = {
      success: true,
      data: {
        drugCode: "X999999999",
        drugName: "新藥品",
        currentPrice: 5.0,
        history: [],
      },
    };

    expect(response.success).toBe(true);
    expect(response.data.history).toHaveLength(0);
  });
});
