import { useState, type ReactNode } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Card, IconButton, StatusPill, type IconName } from "@/components/cwaax-ui";
import { CWAAX } from "@/constants/cwaax";
import { notify } from "@/lib/_core/native-alert";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

const TABS = ["نظرة عامة", "المستخدمون", "الإيداعات", "السحوبات", "الإشعارات"] as const;
type Tab = (typeof TABS)[number];

const LEVEL_COLORS = [CWAAX.green, CWAAX.gold, CWAAX.purple];

function fmt(n: number | string | undefined | null) {
  const v = Number(n ?? 0);
  return v.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export default function AdminScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("نظرة عامة");
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  type PendingRequestAction = {
    kind: "approveDeposit" | "rejectDeposit" | "approveWithdrawal" | "rejectWithdrawal";
    id: number;
    title: string;
    message: string;
    danger?: boolean;
  };
  const [pendingRequestAction, setPendingRequestAction] = useState<PendingRequestAction | null>(null);
  const [busyRequestKey, setBusyRequestKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  // يقبل جميع صيغ الدور لتفادي مشاكل اختلاف الحالة بين السيرفر والعميل
  const isAdmin = ["admin", "owner", "superadmin", "administrator"].includes(
    String(user?.role ?? "").toLowerCase().trim()
  );

  const utils = trpc.useUtils();

  // ====== Mutations first (so isMutating can gate refetchInterval) ======
  const approveDeposit = trpc.admin.approveDeposit.useMutation({
    onMutate: async ({ requestId }) => {
      await utils.admin.deposits.cancel();
      const prev = utils.admin.deposits.getData();
      utils.admin.deposits.setData(undefined, (old: any) =>
        (old || []).filter((x: any) => x.request.id !== requestId)
      );
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) utils.admin.deposits.setData(undefined, ctx.prev);
    },
    onSettled: async () => {
      await utils.admin.deposits.invalidate();
      utils.admin.stats.invalidate();
      utils.wallet.balances.invalidate();
    },
  });

  const rejectDeposit = trpc.admin.rejectDeposit.useMutation({
    onMutate: async ({ requestId }) => {
      await utils.admin.deposits.cancel();
      const prev = utils.admin.deposits.getData();
      utils.admin.deposits.setData(undefined, (old: any) =>
        (old || []).filter((x: any) => x.request.id !== requestId)
      );
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) utils.admin.deposits.setData(undefined, ctx.prev);
    },
    onSettled: async () => {
      await utils.admin.deposits.invalidate();
      utils.admin.stats.invalidate();
    },
  });

  const approveWithdrawal = trpc.admin.approveWithdrawal.useMutation({
    onMutate: async ({ requestId }) => {
      await utils.admin.withdrawals.cancel();
      const prev = utils.admin.withdrawals.getData();
      utils.admin.withdrawals.setData(undefined, (old: any) =>
        (old || []).filter((x: any) => x.request.id !== requestId)
      );
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) utils.admin.withdrawals.setData(undefined, ctx.prev);
    },
    onSettled: async () => {
      await utils.admin.withdrawals.invalidate();
      utils.admin.stats.invalidate();
      utils.wallet.balances.invalidate();
    },
  });

  const rejectWithdrawal = trpc.admin.rejectWithdrawal.useMutation({
    onMutate: async ({ requestId }) => {
      await utils.admin.withdrawals.cancel();
      const prev = utils.admin.withdrawals.getData();
      utils.admin.withdrawals.setData(undefined, (old: any) =>
        (old || []).filter((x: any) => x.request.id !== requestId)
      );
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) utils.admin.withdrawals.setData(undefined, ctx.prev);
    },
    onSettled: async () => {
      await utils.admin.withdrawals.invalidate();
      utils.admin.stats.invalidate();
    },
  });

  const isMutating =
    approveDeposit.isPending ||
    rejectDeposit.isPending ||
    approveWithdrawal.isPending ||
    rejectWithdrawal.isPending;

  // ====== Queries (auto-refresh, paused while mutating) ======
  const stats = trpc.admin.stats.useQuery(undefined, {
    enabled: isAdmin,
    refetchInterval: isMutating ? false : 15000,
    refetchOnWindowFocus: true,
  });

  const users = trpc.admin.users.useQuery(
    { search: query || undefined },
    { enabled: isAdmin, refetchInterval: isMutating ? false : 20000, refetchOnWindowFocus: true }
  );

  const deposits = trpc.admin.deposits.useQuery(undefined, {
    enabled: isAdmin,
    refetchInterval: isMutating ? false : 10000,
    refetchOnWindowFocus: true,
  });

  const withdrawals = trpc.admin.withdrawals.useQuery(undefined, {
    enabled: isAdmin,
    refetchInterval: isMutating ? false : 10000,
    refetchOnWindowFocus: true,
  });

  const adminNotifications = trpc.admin.listNotifications.useQuery(undefined, {
    enabled: isAdmin && tab === "الإشعارات",
  });

  const deleteNotification = trpc.admin.deleteNotification.useMutation({
    onSuccess: () => {
      utils.admin.listNotifications.invalidate();
      notify("تم الحذف", "تم حذف الإشعار بنجاح.");
    },
    onError: (e) => notify("تعذر الحذف", e.message),
  });

  if (authLoading || !user) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={CWAAX.green} />
        </View>
      </ScreenContainer>
    );
  }
  if (!isAdmin) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text style={styles.denied}>ليس لديك صلاحية الوصول إلى لوحة الإدارة.</Text>
          <Pressable onPress={() => router.replace("/(tabs)")} style={styles.button}>
            <Text style={styles.buttonText}>العودة للرئيسية</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const pendingDeposits = (deposits.data || []).filter((x: any) => x.request.status === "pending");
  const pendingWithdrawals = (withdrawals.data || []).filter(
    (x: any) => x.request.status === "pending"
  );

  const requestAction = (kind: "dep" | "wd", id: number, operation: "approve" | "reject") => {
    const label = kind === "dep" ? "الإيداع" : "السحب";
    const verb = operation === "approve" ? "قبول" : "رفض";
    setPendingRequestAction({
      kind:
        operation === "approve"
          ? kind === "dep"
            ? "approveDeposit"
            : "approveWithdrawal"
          : kind === "dep"
          ? "rejectDeposit"
          : "rejectWithdrawal",
      id,
      title: `تأكيد ${verb} ${label}`,
      message: `هل أنت متأكد من ${verb} الطلب رقم #${id}؟${
        operation === "approve" ? " سيتم تنفيذ العملية وتحديث البيانات." : ""
      }`,
      danger: operation === "reject",
    });
  };

  const executePendingRequest = () => {
    if (!pendingRequestAction || busyRequestKey) return;

    const current = pendingRequestAction;
    const key = `${current.kind}:${current.id}`;
    setBusyRequestKey(key);

    const mutation =
      current.kind === "approveDeposit"
        ? approveDeposit
        : current.kind === "rejectDeposit"
        ? rejectDeposit
        : current.kind === "approveWithdrawal"
        ? approveWithdrawal
        : rejectWithdrawal;

    // إعادة محاولة تلقائية عند خطأ الصلاحية (10002) الناتج عن سباق التوكِن
    const runOnce = (attempt: number) => {
      mutation.mutate(
        { requestId: current.id },
        {
          onSuccess: () => {
            setPendingRequestAction(null);
          },
          onError: (e: any) => {
            const msg = String(e?.message ?? "");
            // 10003 = a transient connection error while checking the
            // session (safe and expected to retry). 10002 is kept here
            // too for backward compatibility with already-deployed
            // clients, but after the server-side fix it should no
            // longer be thrown for connection issues.
            const isTransientErr =
              msg.includes("10003") || msg.includes("10002") || msg.toLowerCase().includes("permission");
            if (attempt < 3 && isTransientErr) {
              // إعادة المحاولة بدون إزعاج المستخدم
              setTimeout(() => runOnce(attempt + 1), 700 * (attempt + 1));
              return;
            }
            setFeedback({ title: "تعذر التنفيذ", message: msg });
            setPendingRequestAction(null);
          },
          onSettled: () => {
            // فقط آخر محاولة تُنهي حالة busy
            if (attempt === 0) {
              setBusyRequestKey(null);
            }
          },
        }
      );
    };
    runOnce(0);
  };

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton icon="arrow-forward" label="رجوع" onPress={() => router.back()} />
          <View>
            <Text style={styles.kicker}>CwaAX Control Center</Text>
            <Text style={styles.title}>لوحة الإدارة</Text>
          </View>
          <View style={styles.adminBadge}>
            <MaterialIcons name="admin-panel-settings" size={20} color={CWAAX.green} />
          </View>
        </View>

        <View style={styles.tabs}>
          {TABS.map((item) => (
            <Pressable
              key={item}
              onPress={() => setTab(item)}
              style={[styles.tab, tab === item && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        {tab === "نظرة عامة" ? (
          <>
            <View style={styles.grid}>
              <Metric icon="people" label="إجمالي المستخدمين" value={String(stats.data?.users ?? 0)} />
              <Metric
                icon="block"
                label="حسابات محظورة"
                value={String(stats.data?.bannedUsers ?? 0)}
                tone={CWAAX.red}
              />
              <Metric
                icon="south-west"
                label="إيداعات معلقة"
                value={String(stats.data?.pendingDeposits ?? 0)}
              />
              <Metric
                icon="north-east"
                label="سحوبات معلقة"
                value={String(stats.data?.pendingWithdrawals ?? 0)}
              />
              <Metric
                icon="card-giftcard"
                label="إجمالي أرباح الإحالة"
                value={fmt(stats.data?.totalReferralPayout)}
                tone={CWAAX.gold}
                wide
              />
              <Metric
                icon="security"
                label="الحساب الحالي"
                value={user.username || user.email || "Admin"}
              />
            </View>

            <Pressable
              onPress={() => setBroadcastOpen(true)}
              style={({ pressed }) => [styles.broadcastBtn, pressed && styles.pressed]}
            >
              <MaterialIcons name="campaign" size={19} color={CWAAX.white} />
              <Text style={styles.broadcastText}>إرسال إشعار لجميع المستخدمين</Text>
            </Pressable>

            <Text style={styles.section}>طلبات الإيداع المعلقة</Text>
            <Card>
              {pendingDeposits.length ? (
                pendingDeposits.slice(0, 8).map((x: any) => (
                  <RequestRow
                    key={x.request.id}
                    row={x}
                    type="dep"
                    busyKey={busyRequestKey}
                    onApprove={() => requestAction("dep", x.request.id, "approve")}
                    onReject={() => requestAction("dep", x.request.id, "reject")}
                  />
                ))
              ) : (
                <Text style={styles.empty}>لا توجد طلبات معلقة.</Text>
              )}
            </Card>

            <Text style={styles.section}>طلبات السحب المعلقة</Text>
            <Card>
              {pendingWithdrawals.length ? (
                pendingWithdrawals.slice(0, 8).map((x: any) => (
                  <RequestRow
                    key={x.request.id}
                    row={x}
                    type="wd"
                    busyKey={busyRequestKey}
                    onApprove={() => requestAction("wd", x.request.id, "approve")}
                    onReject={() => requestAction("wd", x.request.id, "reject")}
                  />
                ))
              ) : (
                <Text style={styles.empty}>لا توجد طلبات معلقة.</Text>
              )}
            </Card>
          </>
        ) : tab === "المستخدمون" ? (
          <>
            <View style={styles.search}>
              <MaterialIcons name="search" size={19} color={CWAAX.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="ابحث بالاسم أو البريد أو اسم المستخدم"
                placeholderTextColor="#9CA8A1"
                style={styles.searchInput}
              />
            </View>
            <Card>
              {(users.data || []).length ? (
                (users.data as any[]).map((u) => (
                  <UserRow key={u.id} user={u} onPress={() => setSelectedUserId(u.id)} />
                ))
              ) : (
                <Text style={styles.empty}>لا يوجد مستخدمون مطابقون.</Text>
              )}
            </Card>
          </>
        ) : tab === "الإشعارات" ? (
          <>
            <Pressable
              onPress={() => setBroadcastOpen(true)}
              style={({ pressed }) => [styles.broadcastBtn, pressed && styles.pressed]}
            >
              <MaterialIcons name="campaign" size={19} color={CWAAX.white} />
              <Text style={styles.broadcastText}>إرسال إشعار لجميع المستخدمين</Text>
            </Pressable>
            <Text style={styles.section}>جميع الإشعارات</Text>
            <Card>
              {adminNotifications.isLoading ? (
                <ActivityIndicator color={CWAAX.green} style={{ marginVertical: 20 }} />
              ) : (adminNotifications.data || []).length ? (
                (adminNotifications.data as any[]).map((n) => (
                  <View key={n.id} style={styles.notifRow}>
                    <View style={styles.notifCopy}>
                      <Text style={styles.notifTitle}>{n.title}</Text>
                      <Text style={styles.notifMsg} numberOfLines={2}>
                        {n.message}
                      </Text>
                      <Text style={styles.notifMeta}>
                        {n.userId ? `مستخدم #${n.userId}` : "للجميع"} ·{" "}
                        {new Date(n.createdAt).toLocaleString("ar")}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() =>
                        deleteNotification.mutate({ notificationId: n.id })
                      }
                      disabled={deleteNotification.isPending}
                      style={({ pressed }) => [
                        styles.notifDeleteBtn,
                        pressed && styles.pressed,
                      ]}
                    >
                      <MaterialIcons name="delete-outline" size={20} color={CWAAX.red} />
                    </Pressable>
                  </View>
                ))
              ) : (
                <Text style={styles.empty}>لا توجد إشعارات.</Text>
              )}
            </Card>
          </>
        ) : (
          <>
            <View style={styles.search}>
              <MaterialIcons name="search" size={19} color={CWAAX.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="ابحث برقم الطلب"
                placeholderTextColor="#9CA8A1"
                style={styles.searchInput}
              />
            </View>
            <Card>
              {(tab === "الإيداعات" ? deposits.data || [] : withdrawals.data || []).map((x: any) => (
                <RequestRow
                  key={x.request.id}
                  row={x}
                  type={tab === "الإيداعات" ? "dep" : "wd"}
                  busyKey={busyRequestKey}
                  onApprove={() =>
                    requestAction(tab === "الإيداعات" ? "dep" : "wd", x.request.id, "approve")
                  }
                  onReject={() =>
                    requestAction(tab === "الإيداعات" ? "dep" : "wd", x.request.id, "reject")
                  }
                />
              ))}
            </Card>
          </>
        )}
      </ScrollView>

      {selectedUserId != null && (
        <UserDetailModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}
      <BroadcastModal visible={broadcastOpen} onClose={() => setBroadcastOpen(false)} />

      <ConfirmModal
        visible={!!pendingRequestAction}
        title={pendingRequestAction?.title || ""}
        message={pendingRequestAction?.message || ""}
        danger={pendingRequestAction?.danger}
        busy={!!busyRequestKey}
        onCancel={() => !busyRequestKey && setPendingRequestAction(null)}
        onConfirm={executePendingRequest}
      />

      <FeedbackModal
        visible={!!feedback}
        title={feedback?.title || ""}
        message={feedback?.message || ""}
        onClose={() => setFeedback(null)}
      />
    </ScreenContainer>
  );
}

function ConfirmModal({
  visible,
  title,
  message,
  onCancel,
  onConfirm,
  busy,
  danger,
}: {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
  danger?: boolean;
}) {
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.confirmOverlay}>
        <View style={styles.confirmCard}>
          <View style={[styles.confirmIcon, danger && styles.confirmIconDanger]}>
            <MaterialIcons
              name={danger ? "warning" : "help-outline"}
              size={24}
              color={danger ? CWAAX.red : CWAAX.green}
            />
          </View>
          <Text style={styles.confirmTitle}>{title}</Text>
          <Text style={styles.confirmMessage}>{message}</Text>
          <View style={styles.confirmActions}>
            <Pressable onPress={onCancel} disabled={busy} style={styles.confirmCancel}>
              <Text style={styles.confirmCancelText}>إلغاء</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={busy}
              style={[styles.confirmOk, danger && styles.confirmOkDanger, busy && { opacity: 0.65 }]}
            >
              {busy ? (
                <ActivityIndicator color={CWAAX.white} size="small" />
              ) : (
                <Text style={styles.confirmOkText}>تأكيد</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FeedbackModal({
  visible,
  title,
  message,
  onClose,
}: {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.confirmOverlay}>
        <View style={styles.confirmCard}>
          <View style={[styles.confirmIcon, styles.confirmIconDanger]}>
            <MaterialIcons name="error-outline" size={24} color={CWAAX.red} />
          </View>
          <Text style={styles.confirmTitle}>{title}</Text>
          <Text style={styles.confirmMessage}>{message}</Text>
          <Pressable onPress={onClose} style={styles.confirmOk}>
            <Text style={styles.confirmOkText}>حسناً</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Metric({
  icon,
  label,
  value,
  tone,
  wide,
}: {
  icon: IconName;
  label: string;
  value: string;
  tone?: string;
  wide?: boolean;
}) {
  return (
    <Card style={[styles.metric, wide && styles.metricWide]}>
      <View style={[styles.metricIcon, tone ? { backgroundColor: `${tone}22` } : null]}>
        <MaterialIcons name={icon} size={18} color={tone || CWAAX.green} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue} numberOfLines={1}>
        {value}
      </Text>
    </Card>
  );
}

function RequestRow({
  row,
  type,
  busyKey,
  onApprove,
  onReject,
}: {
  row: any;
  type: "dep" | "wd";
  busyKey?: string | null;
  onApprove: () => void;
  onReject: () => void;
}) {
  const r = row.request;
  const u = row.user;
  const pending = r.status === "pending";
  const approveKey = `${type === "dep" ? "approveDeposit" : "approveWithdrawal"}:${r.id}`;
  const rejectKey = `${type === "dep" ? "rejectDeposit" : "rejectWithdrawal"}:${r.id}`;
  const approveBusy = busyKey === approveKey;
  const rejectBusy = busyKey === rejectKey;
  const rowBusy = !!busyKey;
  return (
    <View style={styles.request}>
      <View style={styles.requestIcon}>
        <MaterialIcons
          name={type === "dep" ? "south-west" : "north-east"}
          size={18}
          color={type === "dep" ? CWAAX.green : CWAAX.red}
        />
      </View>
      <View style={styles.requestCopy}>
        <Text style={styles.requestId}>
          #{r.id} · {type === "dep" ? "إيداع" : "سحب"}
        </Text>
        <Text style={styles.requestUser}>
          {u?.name || u?.username || "مستخدم"} · {u?.email || ""}
        </Text>
        <Text style={styles.requestAmount}>
          {fmt(r.amount)} {r.currency}
          {r.network ? ` · ${r.network}` : ""}
        </Text>
        {type === "wd" && <Text style={styles.requestAddress}>{r.address}</Text>}
      </View>
      <View style={styles.requestActions}>
        {pending ? (
          <>
            <Pressable
              onPress={onApprove}
              disabled={rowBusy}
              style={[styles.approve, rowBusy && styles.disabledButton]}
            >
              {approveBusy ? (
                <ActivityIndicator size="small" color={CWAAX.green} />
              ) : (
                <Text style={styles.approveText}>قبول</Text>
              )}
            </Pressable>
            <Pressable
              onPress={onReject}
              disabled={rowBusy}
              style={[styles.reject, rowBusy && styles.disabledButton]}
            >
              {rejectBusy ? (
                <ActivityIndicator size="small" color={CWAAX.red} />
              ) : (
                <Text style={styles.rejectText}>رفض</Text>
              )}
            </Pressable>
          </>
        ) : (
          <StatusPill tone={r.status === "approved" ? "success" : "danger"}>{r.status}</StatusPill>
        )}
      </View>
    </View>
  );
}

function UserRow({ user, onPress }: { user: any; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.userRow, pressed && styles.pressed]}
    >
      <View style={[styles.userAvatar, user.isBanned && styles.userAvatarBanned]}>
        <Text style={styles.userLetter}>
          {(user.name || user.username || user.email || "U")[0].toUpperCase()}
        </Text>
      </View>
      <View style={styles.userCopy}>
        <Text style={styles.userName} numberOfLines={1}>
          {user.name || user.username || "بدون اسم"}
          {user.role === "admin" ? " · Admin" : ""}
        </Text>
        <Text style={styles.userEmail} numberOfLines={1}>
          {user.email || user.openId}
        </Text>
        <View style={styles.userChips}>
          <View style={styles.chip}>
            <MaterialIcons name="group-add" size={11} color={CWAAX.green} />
            <Text style={styles.chipText}>{user.directReferrals ?? 0} إحالة</Text>
          </View>
          <View style={[styles.chip, styles.chipGold]}>
            <MaterialIcons name="paid" size={11} color={CWAAX.gold} />
            <Text style={[styles.chipText, { color: CWAAX.gold }]}>
              {fmt(user.totalReferralEarnings)}
            </Text>
          </View>
          {user.isBanned && (
            <View style={[styles.chip, styles.chipRed]}>
              <MaterialIcons name="block" size={11} color={CWAAX.red} />
              <Text style={[styles.chipText, { color: CWAAX.red }]}>محظور</Text>
            </View>
          )}
        </View>
      </View>
      <MaterialIcons name="chevron-left" size={20} color={CWAAX.muted} />
    </Pressable>
  );
}

/* =========================
   USER DETAIL MODAL
========================= */

type PanelMode = "detail" | "ban" | "password" | "balance" | "notify" | "level";

function UserDetailModal({ userId, onClose }: { userId: number; onClose: () => void }) {
  const [mode, setMode] = useState<PanelMode>("detail");
  const [confirmUnban, setConfirmUnban] = useState(false);
  const [levelSelected, setLevelSelected] = useState<1 | 2 | 3>(1);
  const detail = trpc.admin.userDetail.useQuery({ userId });
  const utils = trpc.useUtils();

  const refreshAll = () => {
    utils.admin.userDetail.invalidate({ userId });
    utils.admin.users.invalidate();
    utils.admin.stats.invalidate();
  };

  const banMutation = trpc.admin.banUser.useMutation({
    onSuccess: () => {
      refreshAll();
      setMode("detail");
    },
  });
  const unbanMutation = trpc.admin.unbanUser.useMutation({ onSuccess: refreshAll });
  const passwordMutation = trpc.admin.setUserPassword.useMutation({
    onSuccess: () => setMode("detail"),
  });
  const balanceMutation = trpc.admin.adjustBalance.useMutation({
    onSuccess: () => {
      refreshAll();
      setMode("detail");
    },
  });
  const notifyMutation = trpc.admin.sendNotification.useMutation({
    onSuccess: () => setMode("detail"),
  });

  const u = detail.data?.user;
  const referral = detail.data?.referral;
  const balances = detail.data?.balances || [];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          {detail.isLoading || !u ? (
            <View style={styles.center}>
              <ActivityIndicator color={CWAAX.green} />
            </View>
          ) : mode === "detail" ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.sheetHeader}>
                <View
                  style={[
                    styles.userAvatar,
                    styles.avatarLg,
                    u.isBanned && styles.userAvatarBanned,
                  ]}
                >
                  <Text style={[styles.userLetter, { fontSize: 20 }]}>
                    {(u.name || u.username || "U")[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetName}>{u.name || u.username || "بدون اسم"}</Text>
                  <Text style={styles.sheetSub}>{u.email || u.openId}</Text>
                  <View style={styles.userChips}>
                    <StatusPill tone={u.role === "admin" ? "success" : "warning"}>
                      {u.role}
                    </StatusPill>
                    {u.isBanned && <StatusPill tone="danger">محظور</StatusPill>}
                  </View>
                </View>
                <Pressable onPress={onClose} hitSlop={10}>
                  <MaterialIcons name="close" size={22} color={CWAAX.muted} />
                </Pressable>
              </View>

              {u.isBanned && !!u.bannedReason && (
                <View style={styles.banNotice}>
                  <Text style={styles.banNoticeText}>سبب الحظر: {u.bannedReason}</Text>
                </View>
              )}

              <Text style={styles.sheetSection}>الإحالات</Text>
              <View style={styles.levelRow}>
                {[0, 1, 2].map((i) => (
                  <Pressable
                    key={i}
                    onPress={() => { setLevelSelected((i + 1) as 1 | 2 | 3); setMode("level"); }}
                    style={[styles.levelCard, { borderColor: `${LEVEL_COLORS[i]}33` }]}
                  >
                    <Text style={[styles.levelTitle, { color: LEVEL_COLORS[i] }]}>
                      مستوى {i + 1}
                    </Text>
                    <Text style={styles.levelCount}>{referral?.levelCounts?.[i] ?? 0}</Text>
                    <Text style={styles.levelEarn}>{fmt(referral?.levelEarnings?.[i])}</Text>
                    <Text style={[styles.levelDetails, { color: LEVEL_COLORS[i] }]}>عرض التفاصيل ‹</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.totalsRow}>
                <View style={styles.totalBox}>
                  <Text style={styles.totalLabel}>إجمالي المُحالين</Text>
                  <Text style={styles.totalValue}>{referral?.totalReferred ?? 0}</Text>
                </View>
                <View style={styles.totalBox}>
                  <Text style={styles.totalLabel}>إجمالي أرباح الإحالة</Text>
                  <Text style={[styles.totalValue, { color: CWAAX.gold }]}>
                    {fmt(referral?.totalEarned)}
                  </Text>
                </View>
              </View>

              <Text style={styles.sheetSection}>الأرصدة</Text>
              <Card>
                {balances.length ? (
                  balances.map((b: any) => (
                    <View key={b.id} style={styles.balanceRow}>
                      <Text style={styles.balanceCurrency}>{b.currency}</Text>
                      <Text style={styles.balanceAmount}>{fmt(b.amount)}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.empty}>لا يوجد رصيد بعد.</Text>
                )}
              </Card>

              <Text style={styles.sheetSection}>إجراءات الإدارة</Text>
              <View style={styles.actionsGrid}>
                <ActionBtn
                  icon="lock-reset"
                  label="تغيير كلمة المرور"
                  onPress={() => setMode("password")}
                />
                <ActionBtn
                  icon="account-balance-wallet"
                  label="تعديل الرصيد"
                  onPress={() => setMode("balance")}
                />
                <ActionBtn
                  icon="notifications-active"
                  label="إرسال إشعار"
                  onPress={() => setMode("notify")}
                />
                <ActionBtn
                  icon={u.isBanned ? "lock-open" : "block"}
                  label={u.isBanned ? "رفع الحظر" : "حظر الحساب"}
                  tone={u.isBanned ? CWAAX.green : CWAAX.red}
                  onPress={() => (u.isBanned ? setConfirmUnban(true) : setMode("ban"))}
                />
              </View>
            </ScrollView>
          ) : mode === "level" ? (
            <LevelDetailPanel userId={userId} level={levelSelected} onCancel={() => setMode("detail")} />
          ) : mode === "ban" ? (
            <BanPanel
              busy={banMutation.isPending}
              onCancel={() => setMode("detail")}
              onConfirm={(reason) =>
                banMutation.mutate(
                  { userId, reason: reason || undefined },
                  { onError: (e) => notify("تعذر الحظر", e.message) }
                )
              }
            />
          ) : mode === "password" ? (
            <PasswordPanel
              busy={passwordMutation.isPending}
              onCancel={() => setMode("detail")}
              onConfirm={(pw) =>
                passwordMutation.mutate(
                  { userId, newPassword: pw },
                  { onError: (e) => notify("تعذر التغيير", e.message) }
                )
              }
            />
          ) : mode === "balance" ? (
            <BalancePanel
              busy={balanceMutation.isPending}
              onCancel={() => setMode("detail")}
              onConfirm={(v) =>
                balanceMutation.mutate(
                  { userId, ...v },
                  { onError: (e) => notify("تعذر التنفيذ", e.message) }
                )
              }
            />
          ) : (
            <NotifyPanel
              busy={notifyMutation.isPending}
              onCancel={() => setMode("detail")}
              onConfirm={(title, message) =>
                notifyMutation.mutate(
                  { userId, title, message },
                  { onError: (e) => notify("تعذر الإرسال", e.message) }
                )
              }
            />
          )}

          <ConfirmModal
            visible={confirmUnban}
            title="تأكيد رفع الحظر"
            message="هل أنت متأكد من رفع الحظر عن هذا الحساب؟"
            busy={unbanMutation.isPending}
            onCancel={() => !unbanMutation.isPending && setConfirmUnban(false)}
            onConfirm={() =>
              unbanMutation.mutate(
                { userId },
                {
                  onSuccess: () => setConfirmUnban(false),
                  onError: (e) => notify("تعذر رفع الحظر", e.message),
                }
              )
            }
          />
        </View>
      </View>
    </Modal>
  );
}

function ActionBtn({
  icon,
  label,
  onPress,
  tone,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
    >
      <MaterialIcons name={icon} size={18} color={tone || CWAAX.ink} />
      <Text style={[styles.actionBtnText, tone ? { color: tone } : null]}>{label}</Text>
    </Pressable>
  );
}

function PanelShell({
  title,
  children,
  onCancel,
  onConfirm,
  confirmLabel = "تأكيد",
  busy,
  danger,
}: {
  title: string;
  children: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  busy?: boolean;
  danger?: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <View>
      <View style={styles.panelHeader}>
        <Pressable onPress={onCancel} hitSlop={10}>
          <MaterialIcons name="arrow-forward" size={20} color={CWAAX.ink} />
        </Pressable>
        <Text style={styles.panelTitle}>{title}</Text>
        <View style={{ width: 20 }} />
      </View>
      <View style={styles.panelBody}>{children}</View>
      <View style={styles.panelActions}>
        <Pressable
          onPress={() => setConfirmOpen(true)}
          disabled={busy}
          style={[styles.panelConfirm, danger && styles.panelConfirmDanger, busy && { opacity: 0.6 }]}
        >
          {busy ? (
            <ActivityIndicator color={CWAAX.white} size="small" />
          ) : (
            <Text style={styles.panelConfirmText}>{confirmLabel}</Text>
          )}
        </Pressable>
      </View>

      <ConfirmModal
        visible={confirmOpen}
        title={`تأكيد ${confirmLabel}`}
        message={`هل أنت متأكد من تنفيذ عملية «${confirmLabel}»؟`}
        danger={danger}
        busy={!!busy}
        onCancel={() => !busy && setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          onConfirm();
        }}
      />
    </View>
  );
}

function BanPanel({
  onCancel,
  onConfirm,
  busy,
}: {
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  busy?: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <PanelShell
      title="حظر الحساب"
      onCancel={onCancel}
      onConfirm={() => onConfirm(reason.trim())}
      confirmLabel="تأكيد الحظر"
      danger
      busy={busy}
    >
      <Text style={styles.fieldLabel}>سبب الحظر (اختياري)</Text>
      <TextInput
        value={reason}
        onChangeText={setReason}
        placeholder="مثال: مخالفة شروط الاستخدام"
        placeholderTextColor="#9CA8A1"
        style={[styles.input, styles.inputMultiline]}
        multiline
      />
    </PanelShell>
  );
}

function PasswordPanel({
  onCancel,
  onConfirm,
  busy,
}: {
  onCancel: () => void;
  onConfirm: (pw: string) => void;
  busy?: boolean;
}) {
  const [pw, setPw] = useState("");
  const valid = pw.length >= 8;
  return (
    <PanelShell
      title="تغيير كلمة المرور"
      onCancel={onCancel}
      onConfirm={() => valid && onConfirm(pw)}
      confirmLabel="حفظ"
      busy={busy}
    >
      <Text style={styles.fieldLabel}>كلمة المرور الجديدة</Text>
      <TextInput
        value={pw}
        onChangeText={setPw}
        placeholder="8 أحرف على الأقل"
        placeholderTextColor="#9CA8A1"
        secureTextEntry
        style={styles.input}
      />
      {!!pw && !valid && <Text style={styles.fieldError}>يجب أن تكون 8 أحرف على الأقل.</Text>}
    </PanelShell>
  );
}

const CURRENCIES = ["USDT", "TRX", "XRP", "DOGE", "XLM", "BTC"];

function BalancePanel({
  onCancel,
  onConfirm,
  busy,
}: {
  onCancel: () => void;
  onConfirm: (v: {
    currency: string;
    amount: number;
    direction: "credit" | "debit";
    note?: string;
  }) => void;
  busy?: boolean;
}) {
  const [currency, setCurrency] = useState("USDT");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [note, setNote] = useState("");
  const parsed = Number(amount);
  const valid = parsed > 0;
  return (
    <PanelShell
      title="تعديل الرصيد"
      onCancel={onCancel}
      onConfirm={() =>
        valid && onConfirm({ currency, amount: parsed, direction, note: note.trim() || undefined })
      }
      confirmLabel={direction === "credit" ? "تعبئة الرصيد" : "سحب من الرصيد"}
      busy={busy}
    >
      <View style={styles.directionRow}>
        <Pressable
          onPress={() => setDirection("credit")}
          style={[styles.directionBtn, direction === "credit" && styles.directionActiveGreen]}
        >
          <MaterialIcons
            name="add-circle-outline"
            size={16}
            color={direction === "credit" ? CWAAX.white : CWAAX.green}
          />
          <Text style={[styles.directionText, direction === "credit" && { color: CWAAX.white }]}>
            تعبئة
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setDirection("debit")}
          style={[styles.directionBtn, direction === "debit" && styles.directionActiveRed]}
        >
          <MaterialIcons
            name="remove-circle-outline"
            size={16}
            color={direction === "debit" ? CWAAX.white : CWAAX.red}
          />
          <Text style={[styles.directionText, direction === "debit" && { color: CWAAX.white }]}>
            سحب
          </Text>
        </Pressable>
      </View>

      <Text style={styles.fieldLabel}>العملة</Text>
      <View style={styles.currencyRow}>
        {CURRENCIES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCurrency(c)}
            style={[styles.currencyChip, currency === c && styles.currencyChipActive]}
          >
            <Text
              style={[styles.currencyChipText, currency === c && styles.currencyChipTextActive]}
            >
              {c}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.fieldLabel}>المبلغ</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        placeholderTextColor="#9CA8A1"
        keyboardType="decimal-pad"
        style={styles.input}
      />

      <Text style={styles.fieldLabel}>ملاحظة (اختياري)</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="سبب التعديل"
        placeholderTextColor="#9CA8A1"
        style={[styles.input, styles.inputMultiline]}
        multiline
      />
    </PanelShell>
  );
}

function NotifyPanel({
  onCancel,
  onConfirm,
  busy,
}: {
  onCancel: () => void;
  onConfirm: (title: string, message: string) => void;
  busy?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const valid = title.trim().length > 0 && message.trim().length > 0;
  return (
    <PanelShell
      title="إرسال إشعار"
      onCancel={onCancel}
      onConfirm={() => valid && onConfirm(title.trim(), message.trim())}
      confirmLabel="إرسال"
      busy={busy}
    >
      <Text style={styles.fieldLabel}>العنوان</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="عنوان الإشعار"
        placeholderTextColor="#9CA8A1"
        style={styles.input}
      />
      <Text style={styles.fieldLabel}>الرسالة</Text>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="نص الإشعار"
        placeholderTextColor="#9CA8A1"
        style={[styles.input, styles.inputMultiline]}
        multiline
      />
    </PanelShell>
  );
}

const LEVEL_LABELS = { 1: "مستوى 1 (مباشر)", 2: "مستوى 2", 3: "مستوى 3" } as const;

function LevelDetailPanel({ userId, level, onCancel }: { userId: number; level: 1 | 2 | 3; onCancel: () => void }) {
  const list = trpc.admin.referralsAtLevel.useQuery({ userId, level });
  const accounts = list.data || [];

  return (
    <View>
      <View style={styles.panelHeader}>
        <Pressable onPress={onCancel} hitSlop={10}>
          <MaterialIcons name="arrow-forward" size={20} color={CWAAX.ink} />
        </Pressable>
        <Text style={styles.panelTitle}>{LEVEL_LABELS[level]}</Text>
        <View style={{ width: 20 }} />
      </View>

      {list.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={CWAAX.green} />
        </View>
      ) : accounts.length === 0 ? (
        <Text style={styles.empty}>لا يوجد حسابات مُحالة على هذا المستوى.</Text>
      ) : (
        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
          {accounts.map((a: any) => (
            <View key={a.id} style={styles.levelUserRow}>
              <View style={[styles.userAvatar, a.isBanned && styles.userAvatarBanned]}>
                <Text style={styles.userLetter}>{(a.name || a.username || a.email || "U")[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName} numberOfLines={1}>{a.name || a.username || "بدون اسم"}</Text>
                <Text style={styles.userEmail} numberOfLines={1}>{a.email || a.openId}</Text>
                {a.isBanned && (
                  <View style={[styles.chip, styles.chipRed, { marginTop: 5 }]}>
                    <MaterialIcons name="block" size={11} color={CWAAX.red} />
                    <Text style={[styles.chipText, { color: CWAAX.red }]}>محظور</Text>
                  </View>
                )}
              </View>
              <Text style={styles.levelUserEarn}>{fmt(a.earningsContributed)}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function BroadcastModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const mutation = trpc.admin.sendNotification.useMutation({
    onSuccess: () => {
      setTitle("");
      setMessage("");
      onClose();
    },
    onError: (e) => notify("تعذر الإرسال", e.message),
  });
  const valid = title.trim().length > 0 && message.trim().length > 0;
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <PanelShell
            title="إشعار لجميع المستخدمين"
            onCancel={onClose}
            onConfirm={() =>
              valid && mutation.mutate({ userId: null, title: title.trim(), message: message.trim() })
            }
            confirmLabel="إرسال للجميع"
            busy={mutation.isPending}
          >
            <Text style={styles.fieldLabel}>العنوان</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="عنوان الإشعار"
              placeholderTextColor="#9CA8A1"
              style={styles.input}
            />
            <Text style={styles.fieldLabel}>الرسالة</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="نص الإشعار"
              placeholderTextColor="#9CA8A1"
              style={[styles.input, styles.inputMultiline]}
              multiline
            />
          </PanelShell>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 430,
    backgroundColor: CWAAX.surface,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: CWAAX.border,
  },
  confirmIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: CWAAX.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  confirmIconDanger: { backgroundColor: `${CWAAX.red}18` },
  confirmTitle: {
    color: CWAAX.ink,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  confirmMessage: {
    color: CWAAX.muted,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 20,
  },
  confirmActions: { flexDirection: "row", gap: 10 },
  confirmCancel: {
    flex: 1,
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: CWAAX.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: CWAAX.border,
  },
  confirmCancelText: { color: CWAAX.ink, fontWeight: "800" },
  confirmOk: {
    flex: 1,
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: CWAAX.green,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmOkDanger: { backgroundColor: CWAAX.red },
  confirmOkText: { color: CWAAX.white, fontWeight: "900" },
  content: { paddingTop: 12, paddingBottom: 30 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  denied: {
    textAlign: "center",
    color: CWAAX.ink,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 18,
  },
  button: {
    backgroundColor: CWAAX.green,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: { color: CWAAX.white, fontWeight: "900" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 21,
  },
  kicker: { color: CWAAX.green, textAlign: "right", fontSize: 10, fontWeight: "800" },
  title: { color: CWAAX.ink, fontSize: 22, fontWeight: "900", textAlign: "right", marginTop: 3 },
  adminBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: CWAAX.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: { flexDirection: "row-reverse", gap: 6, marginBottom: 16 },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: CWAAX.surface,
  },
  tabActive: { backgroundColor: CWAAX.green },
  tabText: { color: CWAAX.muted, fontSize: 9, fontWeight: "800" },
  tabTextActive: { color: CWAAX.white },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginBottom: 14 },
  metric: { width: "48%", borderRadius: 17, padding: 12 },
  metricWide: { width: "100%" },
  metricIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: CWAAX.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  metricLabel: { color: CWAAX.muted, fontSize: 9, textAlign: "right" },
  metricValue: {
    color: CWAAX.ink,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 5,
  },
  broadcastBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: CWAAX.green,
    borderRadius: 14,
    paddingVertical: 13,
    marginBottom: 18,
  },
  broadcastText: { color: CWAAX.white, fontWeight: "900", fontSize: 12 },
  section: {
    color: CWAAX.muted,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
    marginTop: 14,
    marginBottom: 9,
  },
  empty: { color: CWAAX.muted, textAlign: "center", padding: 20, fontSize: 11 },
  request: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderBottomWidth: 1,
    borderBottomColor: CWAAX.line,
    paddingVertical: 12,
  },
  requestIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: CWAAX.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  requestCopy: { flex: 1 },
  requestId: { color: CWAAX.ink, fontSize: 11, fontWeight: "900", textAlign: "right" },
  requestUser: { color: CWAAX.muted, fontSize: 9, textAlign: "right", marginTop: 3 },
  requestAmount: {
    color: CWAAX.ink,
    fontSize: 10,
    fontWeight: "800",
    textAlign: "right",
    marginTop: 3,
  },
  requestAddress: { color: CWAAX.muted, fontSize: 8, textAlign: "right", marginTop: 3 },
  requestActions: { alignItems: "flex-end", gap: 5 },
  approve: {
    backgroundColor: CWAAX.greenSoft,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  approveText: { color: CWAAX.green, fontSize: 9, fontWeight: "900" },
  reject: { paddingHorizontal: 8, paddingVertical: 2 },
  rejectText: { color: CWAAX.red, fontSize: 9, fontWeight: "800" },
  disabledButton: { opacity: 0.55 },
  search: {
    height: 47,
    borderWidth: 1,
    borderColor: CWAAX.line,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: CWAAX.ink, fontSize: 11, textAlign: "right" },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: CWAAX.line,
  },
  userAvatar: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: CWAAX.green,
    justifyContent: "center",
    alignItems: "center",
  },
  userAvatarBanned: { backgroundColor: CWAAX.red },
  avatarLg: { width: 48, height: 48, borderRadius: 16 },
  userLetter: { color: CWAAX.white, fontWeight: "900" },
  userCopy: { flex: 1 },
  userName: { color: CWAAX.ink, textAlign: "right", fontSize: 11, fontWeight: "800" },
  userEmail: { color: CWAAX.muted, textAlign: "right", fontSize: 8, marginTop: 2 },
  userChips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6, marginTop: 6 },
  chip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 3,
    backgroundColor: CWAAX.greenSoft,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  chipGold: { backgroundColor: "#FFF5DE" },
  chipRed: { backgroundColor: "#FBE8E7" },
  chipText: { color: CWAAX.green, fontSize: 8, fontWeight: "800" },
  pressed: { opacity: 0.6 },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(16,26,22,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: CWAAX.white,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 26,
    maxHeight: "88%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: CWAAX.line,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  sheetName: { color: CWAAX.ink, fontSize: 16, fontWeight: "900", textAlign: "right" },
  sheetSub: { color: CWAAX.muted, fontSize: 10, textAlign: "right", marginTop: 2 },
  sheetSection: {
    color: CWAAX.muted,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "right",
    marginTop: 16,
    marginBottom: 8,
  },
  banNotice: { backgroundColor: "#FBE8E7", borderRadius: 12, padding: 10, marginBottom: 4 },
  banNoticeText: { color: CWAAX.red, fontSize: 10, textAlign: "right", fontWeight: "700" },
  levelRow: { flexDirection: "row", gap: 8 },
  levelCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    alignItems: "center",
    backgroundColor: CWAAX.surface,
  },
  levelTitle: { fontSize: 9, fontWeight: "900", marginBottom: 4 },
  levelCount: { color: CWAAX.ink, fontSize: 15, fontWeight: "900" },
  levelEarn: { color: CWAAX.muted, fontSize: 9, marginTop: 2 },
  levelDetails: { fontSize: 8, fontWeight: "800", marginTop: 6 },
  levelUserRow: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: CWAAX.line },
  levelUserEarn: { color: CWAAX.gold, fontSize: 11, fontWeight: "900" },
  totalsRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  totalBox: {
    flex: 1,
    backgroundColor: CWAAX.surface,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
  },
  totalLabel: { color: CWAAX.muted, fontSize: 9, textAlign: "center" },
  totalValue: { color: CWAAX.ink, fontSize: 16, fontWeight: "900", marginTop: 4 },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: CWAAX.line,
  },
  balanceCurrency: { color: CWAAX.ink, fontWeight: "800", fontSize: 11 },
  balanceAmount: { color: CWAAX.ink, fontWeight: "800", fontSize: 11 },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionBtn: {
    width: "48%",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    backgroundColor: CWAAX.surface,
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  actionBtnText: { color: CWAAX.ink, fontSize: 10.5, fontWeight: "800" },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  panelTitle: { color: CWAAX.ink, fontSize: 15, fontWeight: "900" },
  panelBody: { gap: 4 },
  fieldLabel: {
    color: CWAAX.muted,
    fontSize: 10,
    fontWeight: "800",
    textAlign: "right",
    marginTop: 10,
    marginBottom: 6,
  },
  fieldError: { color: CWAAX.red, fontSize: 9, textAlign: "right", marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: CWAAX.line,
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: CWAAX.ink,
    fontSize: 12,
    textAlign: "right",
  },
  inputMultiline: { minHeight: 70, textAlignVertical: "top" },
  panelActions: { marginTop: 18 },
  panelConfirm: {
    backgroundColor: CWAAX.green,
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 14,
  },
  panelConfirmDanger: { backgroundColor: CWAAX.red },
  panelConfirmText: { color: CWAAX.white, fontWeight: "900", fontSize: 12 },
  directionRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  directionBtn: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: CWAAX.line,
    borderRadius: 12,
    paddingVertical: 11,
  },
  directionActiveGreen: { backgroundColor: CWAAX.green, borderColor: CWAAX.green },
  directionActiveRed: { backgroundColor: CWAAX.red, borderColor: CWAAX.red },
  directionText: { fontSize: 11, fontWeight: "800", color: CWAAX.ink },
  currencyRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  currencyChip: {
    borderWidth: 1,
    borderColor: CWAAX.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  currencyChipActive: { backgroundColor: CWAAX.green, borderColor: CWAAX.green },
  currencyChipText: { color: CWAAX.ink, fontSize: 10, fontWeight: "800" },
  currencyChipTextActive: { color: CWAAX.white },
  notifRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: CWAAX.line,
  },
  notifCopy: { flex: 1 },
  notifTitle: {
    color: CWAAX.ink,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right",
  },
  notifMsg: {
    color: CWAAX.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
    textAlign: "right",
  },
  notifMeta: {
    color: "#A1AAA5",
    fontSize: 9,
    marginTop: 6,
    textAlign: "right",
  },
  notifDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FEECEC",
    alignItems: "center",
    justifyContent: "center",
  },
});
