import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/create-plan
 *
 * Thin proxy that forwards the request body to the Supabase Edge Function
 * `create-plan` and pipes its SSE response back to the client.
 *
 * The client must supply an `Authorization: Bearer <jwt>` header so Supabase
 * can authenticate the request (same JWT that supabase-js holds in the browser).
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization") ?? "";

  // Body already validated by the edge function — just forward as-is.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_SUPABASE_URL is not configured" },
      { status: 500 },
    );
  }

  // Override the full URL or just the function name via env vars.
  // SUPABASE_CREATE_PLAN_URL  — full URL (highest priority)
  // SUPABASE_CREATE_PLAN_FN   — just the function name, e.g. "create_plan"
  //                             defaults to "create-plan"
  const fnName = process.env.SUPABASE_CREATE_PLAN_FN ?? "create_plan";
  const url =
    process.env.SUPABASE_CREATE_PLAN_URL ??
    `${supabaseUrl}/functions/v1/${fnName}`;

  console.log("[create-plan proxy] → ", url);

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(body),
      // @ts-expect-error — Node 18+ fetch supports this to keep the TCP connection
      duplex: "half",
    });
  } catch (err) {
    console.error("[create-plan proxy] fetch error:", err);
    return NextResponse.json(
      { error: "Failed to reach generation service" },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    console.error(
      `[create-plan proxy] upstream ${upstream.status} from ${url}:`,
      text.slice(0, 800),
    );
    return NextResponse.json(
      {
        error: `Generation service error: ${upstream.status}`,
        detail: text.slice(0, 400) || undefined,
        upstream_url: url,
      },
      { status: upstream.status },
    );
  }

  // Pipe the SSE stream straight through to the browser.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable Nginx buffering if deployed behind it
    },
  });
}
