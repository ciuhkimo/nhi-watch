import { describe, it, expect } from "vitest";

const BASE = "http://localhost:3000";

// 這些測試需要 dev server 在跑 (npm run dev)
// 跑測試前確保有資料 (npx tsx scripts/sync-daily.ts)

describe.skipIf(!process.env.TEST_API)("API Endpoints (需啟動 dev server)", () => {
  describe("GET /api/stats", () => {
    it("回傳統計數據", async () => {
      const res = await fetch(`${BASE}/api/stats`);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.data).toHaveProperty("drugCount");
      expect(json.data).toHaveProperty("deviceCount");
      expect(json.data).toHaveProperty("paymentCount");
      expect(json.data).toHaveProperty("todayChanges");
      expect(typeof json.data.drugCount).toBe("number");
    });
  });

  describe("GET /api/drugs", () => {
    it("回傳分頁藥品資料", async () => {
      const res = await fetch(`${BASE}/api/drugs?limit=5`);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.data).toBeInstanceOf(Array);
      expect(json.pagination).toHaveProperty("page");
      expect(json.pagination).toHaveProperty("total");
      expect(json.pagination).toHaveProperty("totalPages");
    });

    it("搜尋功能", async () => {
      const res = await fetch(`${BASE}/api/drugs?search=aspirin&limit=5`);
      const json = await res.json();

      expect(json.success).toBe(true);
      if (json.data.length > 0) {
        const names = json.data.map((d: { name: string }) => d.name.toLowerCase());
        const generics = json.data.map((d: { generic: string }) => (d.generic || "").toLowerCase());
        const hasMatch = names.some((n: string) => n.includes("aspirin")) ||
                         generics.some((g: string) => g.includes("aspirin"));
        expect(hasMatch).toBe(true);
      }
    });

    it("分類篩選", async () => {
      const res = await fetch(`${BASE}/api/drugs?category=${encodeURIComponent("口服")}&limit=5`);
      const json = await res.json();

      expect(json.success).toBe(true);
      for (const d of json.data) {
        expect(d.category).toBe("口服");
      }
    });

    it("limit 上限為 100", async () => {
      const res = await fetch(`${BASE}/api/drugs?limit=200`);
      const json = await res.json();

      expect(json.pagination.limit).toBeLessThanOrEqual(100);
    });
  });

  describe("GET /api/devices", () => {
    it("回傳特材資料", async () => {
      const res = await fetch(`${BASE}/api/devices?limit=5`);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.data).toBeInstanceOf(Array);
      if (json.data.length > 0) {
        expect(json.data[0]).toHaveProperty("code");
        expect(json.data[0]).toHaveProperty("price");
      }
    });
  });

  describe("GET /api/payments", () => {
    it("回傳診療支付資料", async () => {
      const res = await fetch(`${BASE}/api/payments?limit=5`);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.data).toBeInstanceOf(Array);
      if (json.data.length > 0) {
        expect(json.data[0]).toHaveProperty("code");
        expect(json.data[0]).toHaveProperty("price");
      }
    });
  });

  describe("GET /api/changes", () => {
    it("回傳異動紀錄", async () => {
      const res = await fetch(`${BASE}/api/changes?limit=5`);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.data).toBeInstanceOf(Array);
    });

    it("類型篩選", async () => {
      const res = await fetch(`${BASE}/api/changes?type=${encodeURIComponent("新增")}&limit=5`);
      const json = await res.json();

      expect(json.success).toBe(true);
      for (const c of json.data) {
        expect(c.changeType).toBe("新增");
      }
    });

    it("日期範圍篩選", async () => {
      const res = await fetch(`${BASE}/api/changes?from=2026-03-28&to=2026-03-28&limit=5`);
      const json = await res.json();

      expect(json.success).toBe(true);
      for (const c of json.data) {
        expect(c.date).toBe("2026-03-28");
      }
    });
  });
});
