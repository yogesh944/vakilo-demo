import {
  AlertCircle,
  Check,
  CheckCheck,
  FileText,
  MessageSquare,
  Paperclip,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  getAdminMessages,
  getAdminMessageStats,
  type AdminChatMessage,
  type ChatMessageStats,
} from "../../services/adminApi";

export default function Messages() {
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [stats, setStats] = useState<ChatMessageStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(true);
  const [readFilter, setReadFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const isReadParam =
        readFilter === "true"
          ? true
          : readFilter === "false"
          ? false
          : undefined;

      const [messagesData, statsData] = await Promise.all([
        getAdminMessages({
          skip: (page - 1) * limit,
          limit,
          is_read: isReadParam,
        }),
        getAdminMessageStats().catch(() => null),
      ]);

      setMessages(messagesData.items || []);
      setTotal(messagesData.total || 0);
      if (statsData) setStats(statsData);
    } catch (err: any) {
      console.error("Failed to load messages:", err);
      setError(err?.message || "Failed to load chat records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, readFilter]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#171717]">
            Communication Logs
          </h2>
          <p className="text-sm text-[#66615A]">
            Audit trails of client-lawyer case messaging and exchanged attachments ({total} total).
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadData()}
          className="inline-flex items-center gap-2 rounded border border-[#D7CFBF] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#171717] hover:bg-[#FBF9F4]"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-4 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#66615A]">
            Total Messages
          </p>
          <p className="mt-1 font-serif text-2xl font-bold text-[#171717]">
            {stats?.total_messages || 0}
          </p>
        </div>
        <div className="rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-4 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#66615A]">
            Read By Recipient
          </p>
          <p className="mt-1 font-serif text-2xl font-bold text-emerald-800">
            {stats?.read_messages || 0}
          </p>
        </div>
        <div className="rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-4 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#66615A]">
            Unread Delivered
          </p>
          <p className="mt-1 font-serif text-2xl font-bold text-amber-700">
            {stats?.unread_messages || 0}
          </p>
        </div>
        <div className="rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-4 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#66615A]">
            With Attachments
          </p>
          <p className="mt-1 font-serif text-2xl font-bold text-[#17352D]">
            {stats?.messages_with_attachments || 0}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#66615A]">
            Read Status:
          </span>
          <select
            value={readFilter}
            onChange={(e) => {
              setReadFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by read status"
            className="rounded border border-[#D7CFBF] bg-white px-3 py-1.5 text-sm text-[#171717] outline-none focus:border-[#C9A227]"
          >
            <option value="">All Messages</option>
            <option value="true">Read Only</option>
            <option value="false">Unread Only</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-[#D7CFBF] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#171717]">
            <thead className="border-b border-[#D7CFBF] bg-[#FBF9F4] text-xs font-semibold uppercase tracking-wider text-[#66615A]">
              <tr>
                <th className="px-4 py-3.5">ID</th>
                <th className="px-4 py-3.5">Case Reference</th>
                <th className="px-4 py-3.5">Sender</th>
                <th className="px-4 py-3.5">Receiver</th>
                <th className="px-4 py-3.5">Attachment</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE3D5]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#66615A]">
                    <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-[#C9A227] border-t-transparent" />
                    Loading communication logs...
                  </td>
                </tr>
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#66615A]">
                    No chat records found.
                  </td>
                </tr>
              ) : (
                messages.map((msg) => (
                  <tr key={msg.id} className="hover:bg-[#FBF9F4]/70">
                    <td className="px-4 py-3 font-mono text-xs text-[#8A847B]">
                      #{msg.id}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-[#17352D]">
                      Case #{msg.case_id}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#66615A]">
                      User #{msg.sender_id}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#66615A]">
                      User #{msg.receiver_id}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {msg.attachment_name ? (
                        <span className="inline-flex items-center gap-1 rounded bg-[#F4F0E8] px-2 py-0.5 text-[#55504A]">
                          <Paperclip size={12} />
                          {msg.attachment_name}
                        </span>
                      ) : (
                        <span className="text-[#8A847B]">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {msg.is_read ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <CheckCheck size={14} /> Read
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700">
                          <Check size={14} /> Unread
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#66615A]">
                      {new Date(msg.created_at).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-[#D7CFBF] bg-[#FBF9F4] px-4 py-3 text-xs text-[#66615A]">
          <div>
            Showing {messages.length} of {total} messages
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-[#D7CFBF] bg-white px-3 py-1 font-medium text-[#171717] hover:bg-[#F0EBE1] disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-[#D7CFBF] bg-white px-3 py-1 font-medium text-[#171717] hover:bg-[#F0EBE1] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
