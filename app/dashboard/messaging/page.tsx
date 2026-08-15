import { createClient } from "@/lib/supabase/server";
import ContactsPanel from "./components/ContactsPanel";
import AutomatedMessagesPanel from "./components/AutomatedMessagesPanel";
import MessageHistoryPanel from "./components/MessageHistoryPanel";

export default async function MessagingPage() {
  const supabase = createClient();

  const [{ data: contacts }, { data: automatedMessages }, { data: history }] = await Promise.all([
    supabase.from("CUSTOMER_CONTACTS").select("*").order("customer_name"),
    supabase.from("AUTOMATED_MESSAGES").select("*").order("message_name"),
    supabase.from("MESSAGE_HISTORY").select("*").order("sent_date", { ascending: false }).limit(50),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-maroon">Customer Messaging</h1>
        <p className="text-ink-soft text-sm">Contacts, automated messages, and send history</p>
      </div>

      <div className="bg-gold/10 border border-gold/30 rounded-card-lg p-4 text-sm text-ink-soft">
        📱 Sending SMS requires your Africa&apos;s Talking API key set as a server-side{" "}
        <code className="bg-white px-1 rounded">AFRICASTALKING_API_KEY</code> env var (never exposed to the
        browser — it goes in Vercel&apos;s environment variables, not <code>.env.local</code>&apos;s{" "}
        <code>NEXT_PUBLIC_</code> vars). Until that&apos;s set, contacts and message rules save fine, but
        &quot;Send now&quot; won&apos;t actually deliver.
      </div>

      <ContactsPanel contacts={contacts ?? []} />
      <AutomatedMessagesPanel messages={automatedMessages ?? []} />
      <MessageHistoryPanel history={history ?? []} />
    </div>
  );
}
