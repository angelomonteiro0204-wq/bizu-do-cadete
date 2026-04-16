import { useState, useCallback } from "react";
import {
  Text, View, TouchableOpacity, FlatList, ActivityIndicator,
  StyleSheet, Alert, TextInput, Modal, ScrollView, RefreshControl,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router as navRouter } from "expo-router";

type TabType = "users" | "payments" | "stats";

export default function AdminScreen() {
  const colors = useColors();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("stats");
  const [showSubModal, setShowSubModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState("");
  const [subDays, setSubDays] = useState("30");
  const [subPlan, setSubPlan] = useState("Mensal");
  const [subPrice, setSubPrice] = useState("29.90");
  const [subNotes, setSubNotes] = useState("");
  const [payAmount, setPayAmount] = useState("29.90");
  const [payMethod, setPayMethod] = useState("PIX");
  const [payNotes, setPayNotes] = useState("");

  const statsQuery = trpc.admin.stats.useQuery(undefined, { enabled: activeTab === "stats" });
  const usersQuery = trpc.admin.listUsers.useQuery(undefined, { enabled: activeTab === "users" });
  const paymentsQuery = trpc.admin.listPayments.useQuery(undefined, { enabled: activeTab === "payments" });

  const createSubMutation = trpc.admin.createSubscription.useMutation({
    onSuccess: () => {
      Alert.alert("Sucesso", "Assinatura criada com sucesso!");
      setShowSubModal(false);
      usersQuery.refetch();
      statsQuery.refetch();
    },
    onError: (err) => Alert.alert("Erro", err.message),
  });

  const cancelSubMutation = trpc.admin.cancelSubscription.useMutation({
    onSuccess: () => {
      Alert.alert("Sucesso", "Assinatura cancelada!");
      usersQuery.refetch();
      statsQuery.refetch();
    },
    onError: (err) => Alert.alert("Erro", err.message),
  });

  const recordPayMutation = trpc.admin.recordPayment.useMutation({
    onSuccess: () => {
      Alert.alert("Sucesso", "Pagamento registrado!");
      setShowPayModal(false);
      paymentsQuery.refetch();
      statsQuery.refetch();
    },
    onError: (err) => Alert.alert("Erro", err.message),
  });

  const openSubModal = (userId: number, userName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setSubDays("30");
    setSubPlan("Mensal");
    setSubPrice("29.90");
    setSubNotes("");
    setShowSubModal(true);
  };

  const openPayModal = (userId: number, userName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setPayAmount("29.90");
    setPayMethod("PIX");
    setPayNotes("");
    setShowPayModal(true);
  };

  const handleCreateSub = () => {
    if (!selectedUserId) return;
    createSubMutation.mutate({
      userId: selectedUserId,
      plan: subPlan,
      durationDays: parseInt(subDays) || 30,
      priceCents: Math.round(parseFloat(subPrice.replace(",", ".")) * 100) || 0,
      notes: subNotes || undefined,
    });
  };

  const handleRecordPay = () => {
    if (!selectedUserId) return;
    recordPayMutation.mutate({
      userId: selectedUserId,
      amountCents: Math.round(parseFloat(payAmount.replace(",", ".")) * 100) || 0,
      method: payMethod || undefined,
      notes: payNotes || undefined,
    });
  };

  const handleCancelSub = (subId: number, userName: string) => {
    Alert.alert(
      "Cancelar Assinatura",
      `Deseja cancelar a assinatura de ${userName}? O acesso será bloqueado imediatamente.`,
      [
        { text: "Não", style: "cancel" },
        { text: "Sim, cancelar", style: "destructive", onPress: () => cancelSubMutation.mutate({ subscriptionId: subId }) },
      ]
    );
  };

  const formatCurrency = (cents: number) => {
    return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const renderStats = () => {
    if (statsQuery.isLoading) return <ActivityIndicator size="large" color="#C8A84E" style={{ marginTop: 40 }} />;
    const s = statsQuery.data;
    if (!s) return null;

    return (
      <ScrollView
        contentContainerStyle={styles.statsContainer}
        refreshControl={<RefreshControl refreshing={statsQuery.isRefetching} onRefresh={() => statsQuery.refetch()} />}
      >
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: "#1B2A4A" }]}>
            <MaterialIcons name="people" size={28} color="#C8A84E" />
            <Text style={styles.statNumber}>{s.totalUsers}</Text>
            <Text style={styles.statLabel}>Usuários</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#166534" }]}>
            <MaterialIcons name="check-circle" size={28} color="#4ADE80" />
            <Text style={styles.statNumber}>{s.activeSubscriptions}</Text>
            <Text style={styles.statLabel}>Ativos</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#991B1B" }]}>
            <MaterialIcons name="cancel" size={28} color="#F87171" />
            <Text style={styles.statNumber}>{s.expiredSubscriptions}</Text>
            <Text style={styles.statLabel}>Expirados</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#854D0E" }]}>
            <MaterialIcons name="attach-money" size={28} color="#FBBF24" />
            <Text style={styles.statNumber}>{formatCurrency(s.totalRevenue)}</Text>
            <Text style={styles.statLabel}>Receita Total</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderUserItem = ({ item }: { item: any }) => {
    const hasSub = !!item.subscription;
    const isActive = hasSub && item.subscription.status === "active";

    return (
      <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
              {item.name || "Sem nome"}
            </Text>
            <Text style={[styles.userEmail, { color: colors.muted }]} numberOfLines={1}>
              {item.email || "Sem email"}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: isActive ? "#DCFCE7" : "#FEE2E2" }]}>
            <View style={[styles.badgeDot, { backgroundColor: isActive ? "#22C55E" : "#EF4444" }]} />
            <Text style={[styles.badgeText, { color: isActive ? "#166534" : "#991B1B" }]}>
              {isActive ? "Ativo" : "Inativo"}
            </Text>
          </View>
        </View>

        {hasSub && (
          <View style={styles.subInfo}>
            <Text style={[styles.subText, { color: colors.muted }]}>
              Plano: {item.subscription.plan} | Vence: {formatDate(item.subscription.endDate)}
            </Text>
          </View>
        )}

        <View style={styles.userActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#C8A84E" }]}
            onPress={() => openSubModal(item.id, item.name || item.email || "Usuário")}
            activeOpacity={0.7}
          >
            <MaterialIcons name="card-membership" size={16} color="#1B2A4A" />
            <Text style={styles.actionBtnText}>{hasSub ? "Renovar" : "Ativar"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#1B2A4A" }]}
            onPress={() => openPayModal(item.id, item.name || item.email || "Usuário")}
            activeOpacity={0.7}
          >
            <MaterialIcons name="payment" size={16} color="#C8A84E" />
            <Text style={[styles.actionBtnText, { color: "#C8A84E" }]}>Pagamento</Text>
          </TouchableOpacity>

          {hasSub && isActive && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#FEE2E2" }]}
              onPress={() => handleCancelSub(item.subscription.id, item.name || "Usuário")}
              activeOpacity={0.7}
            >
              <MaterialIcons name="block" size={16} color="#DC2626" />
              <Text style={[styles.actionBtnText, { color: "#DC2626" }]}>Bloquear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderUsers = () => {
    if (usersQuery.isLoading) return <ActivityIndicator size="large" color="#C8A84E" style={{ marginTop: 40 }} />;

    return (
      <FlatList
        data={usersQuery.data || []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderUserItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={usersQuery.isRefetching} onRefresh={() => usersQuery.refetch()} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="people-outline" size={48} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>Nenhum usuário cadastrado</Text>
          </View>
        }
      />
    );
  };

  const renderPayments = () => {
    if (paymentsQuery.isLoading) return <ActivityIndicator size="large" color="#C8A84E" style={{ marginTop: 40 }} />;

    return (
      <FlatList
        data={paymentsQuery.data || []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={paymentsQuery.isRefetching} onRefresh={() => paymentsQuery.refetch()} />}
        renderItem={({ item }) => (
          <View style={[styles.payCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.payHeader}>
              <Text style={[styles.payAmount, { color: "#22C55E" }]}>
                {formatCurrency(item.amountCents)}
              </Text>
              <Text style={[styles.payDate, { color: colors.muted }]}>
                {formatDate(item.paidAt)}
              </Text>
            </View>
            <Text style={[styles.payMethod, { color: colors.muted }]}>
              {item.method || "Não informado"} | Usuário #{item.userId}
            </Text>
            {item.notes && (
              <Text style={[styles.payNotes, { color: colors.muted }]} numberOfLines={2}>
                {item.notes}
              </Text>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="receipt-long" size={48} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>Nenhum pagamento registrado</Text>
          </View>
        }
      />
    );
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: "#1B2A4A" }]}>
          <TouchableOpacity onPress={() => navRouter.back()} style={styles.backBtn} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Painel Admin</Text>
          <TouchableOpacity onPress={logout} style={styles.backBtn} activeOpacity={0.7}>
            <MaterialIcons name="logout" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {([
            { key: "stats" as TabType, icon: "dashboard", label: "Dashboard" },
            { key: "users" as TabType, icon: "people", label: "Usuários" },
            { key: "payments" as TabType, icon: "receipt", label: "Pagamentos" },
          ]).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={tab.icon as any}
                size={20}
                color={activeTab === tab.key ? "#C8A84E" : colors.muted}
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === tab.key ? "#C8A84E" : colors.muted },
                activeTab === tab.key && styles.tabTextActive,
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <View style={styles.contentArea}>
          {activeTab === "stats" && renderStats()}
          {activeTab === "users" && renderUsers()}
          {activeTab === "payments" && renderPayments()}
        </View>

        {/* Subscription Modal */}
        <Modal visible={showSubModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                Ativar Assinatura
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
                {selectedUserName}
              </Text>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.foreground }]}>Plano</Text>
                <View style={styles.planRow}>
                  {["Mensal", "Trimestral", "Semestral", "Anual"].map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.planChip, subPlan === p && styles.planChipActive]}
                      onPress={() => setSubPlan(p)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.planChipText, subPlan === p && styles.planChipTextActive]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.foreground }]}>Duração (dias)</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={subDays}
                  onChangeText={setSubDays}
                  keyboardType="numeric"
                  placeholder="30"
                  placeholderTextColor={colors.muted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.foreground }]}>Valor (R$)</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={subPrice}
                  onChangeText={setSubPrice}
                  keyboardType="decimal-pad"
                  placeholder="29.90"
                  placeholderTextColor={colors.muted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.foreground }]}>Observações</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={subNotes}
                  onChangeText={setSubNotes}
                  placeholder="Opcional"
                  placeholderTextColor={colors.muted}
                  multiline
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.surface }]}
                  onPress={() => setShowSubModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: "#C8A84E" }]}
                  onPress={handleCreateSub}
                  disabled={createSubMutation.isPending}
                  activeOpacity={0.7}
                >
                  {createSubMutation.isPending ? (
                    <ActivityIndicator color="#1B2A4A" size="small" />
                  ) : (
                    <Text style={[styles.modalBtnText, { color: "#1B2A4A", fontWeight: "700" }]}>Ativar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Payment Modal */}
        <Modal visible={showPayModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                Registrar Pagamento
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
                {selectedUserName}
              </Text>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.foreground }]}>Valor (R$)</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={payAmount}
                  onChangeText={setPayAmount}
                  keyboardType="decimal-pad"
                  placeholder="29.90"
                  placeholderTextColor={colors.muted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.foreground }]}>Método</Text>
                <View style={styles.planRow}>
                  {["PIX", "Transferência", "Dinheiro", "Cartão"].map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.planChip, payMethod === m && styles.planChipActive]}
                      onPress={() => setPayMethod(m)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.planChipText, payMethod === m && styles.planChipTextActive]}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.foreground }]}>Observações</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={payNotes}
                  onChangeText={setPayNotes}
                  placeholder="Opcional"
                  placeholderTextColor={colors.muted}
                  multiline
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.surface }]}
                  onPress={() => setShowPayModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: "#22C55E" }]}
                  onPress={handleRecordPay}
                  disabled={recordPayMutation.isPending}
                  activeOpacity={0.7}
                >
                  {recordPayMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={[styles.modalBtnText, { color: "#FFFFFF", fontWeight: "700" }]}>Registrar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#C8A84E" },
  tabText: { fontSize: 13, fontWeight: "500" },
  tabTextActive: { fontWeight: "700" },
  contentArea: { flex: 1 },
  statsContainer: { padding: 16, gap: 16 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "47%",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    gap: 8,
    flexGrow: 1,
  },
  statNumber: { fontSize: 22, fontWeight: "800", color: "#FFFFFF" },
  statLabel: { fontSize: 12, fontWeight: "500", color: "#FFFFFF", opacity: 0.8 },
  listContent: { padding: 16, gap: 12 },
  userCard: {
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userInfo: { flex: 1, marginRight: 12 },
  userName: { fontSize: 15, fontWeight: "600" },
  userEmail: { fontSize: 12, marginTop: 2 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeDot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  subInfo: { paddingLeft: 2 },
  subText: { fontSize: 12 },
  userActions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: { fontSize: 12, fontWeight: "600", color: "#1B2A4A" },
  payCard: {
    borderRadius: 12,
    padding: 14,
    gap: 6,
    borderWidth: 1,
  },
  payHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  payAmount: { fontSize: 18, fontWeight: "700" },
  payDate: { fontSize: 12 },
  payMethod: { fontSize: 12 },
  payNotes: { fontSize: 12, fontStyle: "italic" },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14 },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
    maxHeight: "85%",
  },
  modalTitle: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  modalSubtitle: { fontSize: 14, textAlign: "center", marginTop: -8 },
  formGroup: { gap: 6 },
  formLabel: { fontSize: 14, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputMultiline: { minHeight: 60, textAlignVertical: "top" },
  planRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  planChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
  },
  planChipActive: { backgroundColor: "#C8A84E" },
  planChipText: { fontSize: 13, fontWeight: "500", color: "#374151" },
  planChipTextActive: { color: "#1B2A4A", fontWeight: "700" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  modalBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  modalBtnText: { fontSize: 15, fontWeight: "600" },
});
