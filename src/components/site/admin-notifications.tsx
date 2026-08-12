import { useEffect, useRef, useState } from "react";
import { Bell, BellRing, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

type AdminNotification = {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  reservation_id: string | null;
};

export function AdminNotificationBell() {
  const { t } = useI18n();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("admin_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    if (!error && data) setNotifications(data as AdminNotification[]);
  };

  useEffect(() => {
    fetchNotifications();

    // Real-time subscription for new notifications
    const channel = supabase
      .channel("admin-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_notifications" },
        (payload) => {
          const newNotif = payload.new as AdminNotification;
          setNotifications((prev) => [newNotif, ...prev]);

          // Show browser notification if permission granted
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification(newNotif.title, {
              body: newNotif.body,
              icon: "/icons/icon-192x192.png",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Request notification permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase
      .from("admin_notifications")
      .update({ is_read: true })
      .in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const markOneRead = async (id: string) => {
    await supabase.from("admin_notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${Math.floor(hours / 24)}j`;
  };

  const BellIcon = unread > 0 ? BellRing : Bell;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        id="admin-notification-bell"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("admin.notifications")}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <BellIcon className={`h-4 w-4 ${unread > 0 ? "text-coral animate-[wiggle_0.4s_ease-in-out]" : ""}`} />
        {unread > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-coral text-[10px] font-bold text-coral-foreground"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-lg animate-rise">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-medium text-primary">{t("admin.notifications")}</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-primary"
              >
                <Check className="h-3 w-3" /> {t("admin.markAllRead")}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                {t("admin.noNotifications")}
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markOneRead(n.id)}
                  className={[
                    "flex w-full flex-col gap-0.5 border-b border-border/60 px-4 py-3 text-start transition-colors last:border-b-0",
                    n.is_read
                      ? "bg-card hover:bg-secondary/50"
                      : "bg-coral/5 hover:bg-coral/10",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-sm font-medium ${n.is_read ? "text-foreground/70" : "text-primary"}`}>
                      {n.title}
                    </span>
                    {!n.is_read && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-coral" />
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground line-clamp-2">{n.body}</span>
                  <span className="num mt-1 text-[10px] text-muted-foreground/60">
                    {relativeTime(n.created_at)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
