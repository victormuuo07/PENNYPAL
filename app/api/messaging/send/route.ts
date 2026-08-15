import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Sends one SMS via Africa's Talking and logs the result to MESSAGE_HISTORY.
// AFRICASTALKING_API_KEY and AFRICASTALKING_USERNAME must be set as
// server-side env vars in Vercel (NOT prefixed with NEXT_PUBLIC_, so they're
// never sent to the browser). Get these from africastalking.com.
export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "owner") {
    return NextResponse.json({ error: "Only owners can send messages" }, { status: 403 });
  }

  const { phone_number, message, customer_id, message_id } = await request.json();

  if (!phone_number || !message) {
    return NextResponse.json({ error: "phone_number and message are required" }, { status: 400 });
  }

  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AFRICASTALKING_USERNAME;

  let delivered = false;
  let errorMessage: string | null = null;

  if (!apiKey || !username) {
    errorMessage = "AFRICASTALKING_API_KEY / AFRICASTALKING_USERNAME not set in Vercel env vars yet";
  } else {
    try {
      const res = await fetch("https://api.africastalking.com/version1/messaging", {
        method: "POST",
        headers: {
          apiKey,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({ username, to: phone_number, message }),
      });
      const data = await res.json();
      delivered = res.ok && data?.SMSMessageData?.Recipients?.[0]?.status === "Success";
      if (!delivered) errorMessage = JSON.stringify(data);
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Unknown send error";
    }
  }

  // Log the attempt either way, so you can see failures in Message History
  await supabase.from("MESSAGE_HISTORY").insert({
    customer_id: customer_id ?? null,
    message_id: message_id ?? null,
    phone_number,
    message_content: message,
    sent_date: new Date().toISOString(),
    was_delivered: delivered,
  });

  if (!delivered) {
    return NextResponse.json({ error: errorMessage ?? "Send failed" }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
