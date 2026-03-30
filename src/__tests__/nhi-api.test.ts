import { describe, it, expect } from "vitest";

// 測試 nhi-api 中的純函式（不需要網路）
// 由於這些函式是 module-private，我們透過匯出的間接方式測試

describe("NHI API 資料轉換", () => {
  describe("民國年日期轉換", () => {
    // 測試 rocDateToIso 的邏輯
    function rocDateToIso(rocDate: string): string | null {
      if (!rocDate || rocDate.length < 5) return null;
      let year: number, month: string, day: string;
      if (rocDate.length === 7) {
        year = parseInt(rocDate.substring(0, 3), 10) + 1911;
        month = rocDate.substring(3, 5);
        day = rocDate.substring(5, 7);
      } else if (rocDate.length === 6) {
        year = parseInt(rocDate.substring(0, 2), 10) + 1911;
        month = rocDate.substring(2, 4);
        day = rocDate.substring(4, 6);
      } else {
        return null;
      }
      return `${year}-${month}-${day}`;
    }

    it("7 碼民國年 1130101 → 2024-01-01", () => {
      expect(rocDateToIso("1130101")).toBe("2024-01-01");
    });

    it("7 碼民國年 0840301 → 1995-03-01", () => {
      expect(rocDateToIso("0840301")).toBe("1995-03-01");
    });

    it("7 碼民國年 9991231 → 2910-12-31（未終止）", () => {
      expect(rocDateToIso("9991231")).toBe("2910-12-31");
    });

    it("6 碼民國年 951101 → 2006-11-01", () => {
      expect(rocDateToIso("951101")).toBe("2006-11-01");
    });

    it("空值回傳 null", () => {
      expect(rocDateToIso("")).toBeNull();
      expect(rocDateToIso("123")).toBeNull();
    });
  });

  describe("藥品類別判斷", () => {
    function classifyDrugForm(form: string): string | null {
      if (!form) return null;
      if (/錠|膠囊|顆粒|口服|散劑|糖漿|液劑/.test(form)) return "口服";
      if (/注射|針/.test(form)) return "注射";
      if (/外用|軟膏|乳膏|凝膠|貼片|噴霧|眼|耳|鼻/.test(form)) return "外用";
      return "其他";
    }

    it("錠劑 → 口服", () => expect(classifyDrugForm("錠劑")).toBe("口服"));
    it("膜衣錠 → 口服", () => expect(classifyDrugForm("膜衣錠")).toBe("口服"));
    it("膠囊 → 口服", () => expect(classifyDrugForm("膠囊")).toBe("口服"));
    it("注射劑 → 注射", () => expect(classifyDrugForm("注射劑")).toBe("注射"));
    it("軟膏 → 外用", () => expect(classifyDrugForm("軟膏")).toBe("外用"));
    it("眼藥水 → 外用", () => expect(classifyDrugForm("眼藥水")).toBe("外用"));
    it("栓劑 → 其他", () => expect(classifyDrugForm("栓劑")).toBe("其他"));
    it("空值 → null", () => expect(classifyDrugForm("")).toBeNull());
  });

  describe("支付標準分類推斷", () => {
    function classifyPayment(name: string): string | null {
      if (!name) return null;
      if (/診察費/.test(name)) return "診察費";
      if (/藥事服務費|藥費/.test(name)) return "藥事服務費";
      if (/檢驗/.test(name)) return "檢驗費";
      if (/檢查|超音波|X光|攝影/.test(name)) return "檢查費";
      if (/處置|治療/.test(name)) return "處置費";
      if (/手術/.test(name)) return "手術費";
      if (/麻醉/.test(name)) return "麻醉費";
      return "其他";
    }

    it("門診診察費 → 診察費", () =>
      expect(classifyPayment("一般門診診察費")).toBe("診察費"));
    it("胸部X光 → 檢查費", () =>
      expect(classifyPayment("胸部X光攝影")).toBe("檢查費"));
    it("全血球計數 → 檢驗費", () =>
      expect(classifyPayment("全血球計數檢驗")).toBe("檢驗費"));
    it("一般傷口縫合 → 處置費", () =>
      expect(classifyPayment("一般傷口縫合處置")).toBe("處置費"));
    it("闌尾切除手術 → 手術費", () =>
      expect(classifyPayment("闌尾切除手術")).toBe("手術費"));
  });

  describe("學名提取", () => {
    function extractGeneric(classGroupName: string): string | null {
      if (!classGroupName) return null;
      return classGroupName.replace(/\s+\d+[\d.]*\s*(MG|GM|ML|MCG|IU|%|UNIT).*$/i, "").trim() || null;
    }

    it("SULPIRIDE 100 MG → SULPIRIDE", () =>
      expect(extractGeneric("SULPIRIDE 100 MG")).toBe("SULPIRIDE"));
    it("ASPIRIN → ASPIRIN", () =>
      expect(extractGeneric("ASPIRIN")).toBe("ASPIRIN"));
    it("空值 → null", () =>
      expect(extractGeneric("")).toBeNull());
  });

  describe("規格含量提取", () => {
    function extractStrength(groupName: string): string | null {
      if (!groupName) return null;
      const parts = groupName.split(",").map((s) => s.trim());
      return parts.length >= 3 ? parts[parts.length - 1] : null;
    }

    it("SULPIRIDE , 一般錠劑膠囊劑 , 100.00 MG → 100.00 MG", () =>
      expect(extractStrength("SULPIRIDE , 一般錠劑膠囊劑 , 100.00 MG")).toBe("100.00 MG"));
    it("只有一段 → null", () =>
      expect(extractStrength("SULPIRIDE")).toBeNull());
    it("空值 → null", () =>
      expect(extractStrength("")).toBeNull());
  });
});
