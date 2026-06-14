// 책고슴도치 분양 신청 → Notion '책고슴도치 분양 신청' DB에 저장
// Vercel 서버리스 함수. 환경변수 NOTION_TOKEN 필요(Notion 내부 인티그레이션 시크릿).
// DB(분양 신청) 데이터베이스 ID — 이 DB를 인티그레이션에 '연결'해 두어야 함.
const APPLICATIONS_DB = "eb111f88cc0f4c3c8b6cc10fca991705";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }
  try {
    // req.body가 문자열로 올 수 있어 방어적으로 파싱
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const name = (body.name || "").toString().trim();
    const phone = (body.phone || "").toString().trim();
    const address = (body.address || "").toString().trim();
    const book = (body.book || "").toString().trim();

    if (!name || !phone || !address) {
      return res.status(400).json({ ok: false, error: "missing_fields" });
    }

    const token = process.env.NOTION_TOKEN;
    if (!token) return res.status(500).json({ ok: false, error: "no_token" });

    const r = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: APPLICATIONS_DB },
        properties: {
          "신청자": { title: [{ text: { content: name } }] },
          "연락처": { rich_text: [{ text: { content: phone } }] },
          "배송지주소": { rich_text: [{ text: { content: address } }] },
          "신청책": { rich_text: [{ text: { content: book } }] },
          "상태": { select: { name: "접수" } },
        },
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      return res.status(502).json({ ok: false, error: "notion_error", detail });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "server_error", detail: String(e) });
  }
}
