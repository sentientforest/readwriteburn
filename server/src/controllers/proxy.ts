import { Request, Response } from "express";

export async function proxy(req: Request, res: Response) {
  const apiBase = process.env.CHAIN_API ?? "";
  const channel = req.params.channel;
  const contract = req.params.contract;
  const method = req.params.method;

  if (!apiBase) {
    const msg = "Missing CHAIN_API environment variable";
    console.log(msg);
    return res.status(500).json({ error: msg });
  }

  const url = `${apiBase}/api/${channel}/${contract}/${method}`;

  console.log(`proxy request to: ${url}`);

  const dto = req.body;

  console.log(`proxy request dto: ${JSON.stringify(dto)}`);

  const chainRes = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(dto)
  });

  if (!chainRes.ok) {
    console.log(`proxy request failed: ${chainRes.status}`);

    return res.status(chainRes.status ?? 500).json({
      status: chainRes.status,
      data: await chainRes.json(),
      headers: chainRes.headers
    });
  }

  const chainResData = await chainRes.json();

  return res.status(chainRes.status).json(chainResData);
}
