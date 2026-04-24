import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useAuthGate } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";
import { useRouter } from "expo-router";
import { useState } from "react";
import { PaymentModal } from "@/components/payment-modal";

export default function MyAccountScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, subscription, logout, isAdmin, refreshSubscription } = useAuthGate();
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Fetch payment history
  const paymentsQuery = trpc.subscription.myPayments.useQuery();

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const getSubscriptionStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return colors.success;
      case "expired":
        return colors.error;
      case "cancelled":
        return colors.muted;
      default:
        return colors.muted;
    }
  };

  const getSubscriptionStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "Ativa";
      case "expired":
        return "Expirada";
      case "cancelled":
        return "Cancelada";
      default:
        return status || "Desconhecido";
    }
  };

  return (
    <ScreenContainer
      className="flex-1 bg-background"
      edges={["top", "left", "right"]}
      containerClassName="flex-1"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-6 pt-6 pb-4">
          <Text className="text-3xl font-bold text-foreground">Minha Conta</Text>
          <Text className="text-sm text-muted mt-1">Gerencie seu perfil e assinatura</Text>
        </View>

        {/* Profile Section */}
        <View className="px-6 mb-6">
          <View className="bg-surface rounded-2xl p-6 border border-border">
            <View className="flex-row items-center gap-4 mb-4">
              <View
                className="w-16 h-16 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.primary }}
              >
                <MaterialIcons name="person" size={32} color={colors.background} />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-semibold text-foreground">
                  {user?.name || "Cadete"}
                </Text>
                <Text className="text-sm text-muted mt-1">{user?.email || user?.openId || "—"}</Text>
              </View>
            </View>

            {isAdmin && (
              <View className="mt-4 pt-4 border-t border-border">
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="admin-panel-settings" size={16} color={colors.warning} />
                  <Text className="text-xs font-medium text-warning">Administrador</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Subscription Section */}
        <View className="px-6 mb-6">
          <Text className="text-base font-semibold text-foreground mb-3">Assinatura</Text>

          {subscription ? (
            <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
              {/* Status */}
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted">Status</Text>
                <View
                  className="flex-row items-center gap-2 px-3 py-1 rounded-full"
                  style={{ backgroundColor: getSubscriptionStatusColor(subscription.status) + "20" }}
                >
                  <View
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getSubscriptionStatusColor(subscription.status) }}
                  />
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: getSubscriptionStatusColor(subscription.status) }}
                  >
                    {getSubscriptionStatusLabel(subscription.status)}
                  </Text>
                </View>
              </View>

              {/* Plan */}
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted">Plano</Text>
                <Text className="text-sm font-medium text-foreground">{subscription.plan}</Text>
              </View>

              {/* Start Date */}
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted">Início</Text>
                <Text className="text-sm font-medium text-foreground">
                  {formatDate(subscription.startDate)}
                </Text>
              </View>

              {/* End Date */}
              <View className="flex-row items-center justify-between pb-4 border-b border-border">
                <Text className="text-sm text-muted">Vencimento</Text>
                <Text className="text-sm font-medium text-foreground">
                  {formatDate(subscription.endDate)}
                </Text>
              </View>

              {/* Days Remaining */}
              {subscription.status === "active" && (
                <View className="flex-row items-center gap-2 pt-3">
                  <MaterialIcons name="info" size={16} color={colors.warning} />
                  <Text className="text-xs text-muted flex-1">
                    Sua assinatura vence em{" "}
                    {Math.ceil(
                      (new Date(subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    )}{" "}
                    dias
                  </Text>
                </View>
              )}

              {/* Renew Button */}
              <TouchableOpacity
                onPress={() => setPaymentModalVisible(true)}
                disabled={isProcessingPayment}
                className="mt-4 bg-primary rounded-lg py-3 items-center flex-row justify-center gap-2 active:opacity-80"
                style={{ opacity: isProcessingPayment ? 0.6 : 1 }}
              >
                <MaterialIcons name="refresh" size={18} color={colors.background} />
                <Text className="text-base font-semibold text-background">Renovar Assinatura</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="bg-surface rounded-2xl p-6 border border-border items-center gap-3">
              <MaterialIcons name="info" size={24} color={colors.muted} />
              <Text className="text-sm text-muted text-center">
                Você não possui uma assinatura ativa no momento
              </Text>
            </View>
          )}
        </View>

        {/* Payment History Section */}
        <View className="px-6 mb-6">
          <Text className="text-base font-semibold text-foreground mb-3">Histórico de Pagamentos</Text>

          {paymentsQuery.isLoading ? (
            <View className="bg-surface rounded-2xl p-6 items-center">
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : paymentsQuery.data && paymentsQuery.data.length > 0 ? (
            <View className="gap-3">
              {paymentsQuery.data.map((payment: any, index: number) => (
                <View
                  key={payment.id || index}
                  className="bg-surface rounded-lg p-4 border border-border flex-row items-center justify-between"
                >
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-foreground">
                      {formatCurrency(payment.amountCents)}
                    </Text>
                    <Text className="text-xs text-muted mt-1">
                      {formatDate(payment.createdAt)} • {payment.method || "Método não especificado"}
                    </Text>
                    {payment.notes && (
                      <Text className="text-xs text-muted mt-1">{payment.notes}</Text>
                    )}
                  </View>
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center"
                    style={{ backgroundColor: colors.success + "20" }}
                  >
                    <MaterialIcons name="check-circle" size={16} color={colors.success} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="bg-surface rounded-2xl p-6 border border-border items-center gap-3">
              <MaterialIcons name="receipt" size={24} color={colors.muted} />
              <Text className="text-sm text-muted text-center">
                Nenhum pagamento registrado
              </Text>
            </View>
          )}
        </View>

        {/* Logout Button */}
        <View className="px-6 mb-6">
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-error rounded-lg py-4 items-center flex-row justify-center gap-2 active:opacity-80"
          >
            <MaterialIcons name="logout" size={20} color={colors.background} />
            <Text className="text-base font-semibold text-background">Sair</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <PaymentModal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        onSelectPaymentMethod={async (method) => {
          // Placeholder: In production, integrate with Stripe/PIX
          console.log("Payment method selected:", method);
          setPaymentModalVisible(false);
        }}
        isLoading={isProcessingPayment}
        planName="Mensal"
        planPrice={9900}
      />
    </ScreenContainer>
  );
}
