import { View, Text, TouchableOpacity, ActivityIndicator, Modal, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";
import { useState } from "react";

export interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPaymentMethod: (method: "card" | "pix") => Promise<void>;
  isLoading?: boolean;
  planName?: string;
  planPrice?: number; // in cents
}

export function PaymentModal({
  visible,
  onClose,
  onSelectPaymentMethod,
  isLoading = false,
  planName = "Mensal",
  planPrice = 9900,
}: PaymentModalProps) {
  const colors = useColors();
  const [selectedMethod, setSelectedMethod] = useState<"card" | "pix" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePaymentMethodSelect = async (method: "card" | "pix") => {
    setSelectedMethod(method);
    setIsProcessing(true);
    try {
      await onSelectPaymentMethod(method);
    } finally {
      setIsProcessing(false);
      setSelectedMethod(null);
    }
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50">
        <View
          className="flex-1 mt-auto rounded-t-3xl bg-background p-6"
          style={{ maxHeight: "85%" }}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-2xl font-bold text-foreground">Renovar Assinatura</Text>
              <TouchableOpacity
                onPress={onClose}
                disabled={isProcessing}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.surface }}
              >
                <MaterialIcons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            {/* Plan Summary */}
            <View className="bg-surface rounded-2xl p-4 mb-6 border border-border">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm text-muted">Plano</Text>
                <Text className="text-sm font-semibold text-foreground">{planName}</Text>
              </View>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm text-muted">Duração</Text>
                <Text className="text-sm font-semibold text-foreground">30 dias</Text>
              </View>
              <View
                className="h-px bg-border my-3"
              />
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-bold text-foreground">Total</Text>
                <Text
                  className="text-lg font-bold"
                  style={{ color: colors.primary }}
                >
                  {formatPrice(planPrice)}
                </Text>
              </View>
            </View>

            {/* Payment Methods */}
            <Text className="text-base font-semibold text-foreground mb-3">
              Escolha o método de pagamento
            </Text>

            {/* Credit Card Option */}
            <TouchableOpacity
              onPress={() => handlePaymentMethodSelect("card")}
              disabled={isProcessing}
              className={cn(
                "rounded-2xl p-4 mb-3 flex-row items-center gap-4 border-2",
                selectedMethod === "card"
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface"
              )}
              style={{ opacity: isProcessing && selectedMethod !== "card" ? 0.5 : 1 }}
            >
              <View
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{
                  backgroundColor:
                    selectedMethod === "card" ? colors.primary : colors.border,
                }}
              >
                <MaterialIcons
                  name="credit-card"
                  size={24}
                  color={selectedMethod === "card" ? colors.background : colors.muted}
                />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">
                  Cartão de Crédito
                </Text>
                <Text className="text-xs text-muted mt-1">
                  Visa, Mastercard, American Express
                </Text>
              </View>
              {selectedMethod === "card" && isProcessing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <MaterialIcons
                  name={selectedMethod === "card" ? "check-circle" : "chevron-right"}
                  size={24}
                  color={selectedMethod === "card" ? colors.primary : colors.muted}
                />
              )}
            </TouchableOpacity>

            {/* PIX Option */}
            <TouchableOpacity
              onPress={() => handlePaymentMethodSelect("pix")}
              disabled={isProcessing}
              className={cn(
                "rounded-2xl p-4 mb-6 flex-row items-center gap-4 border-2",
                selectedMethod === "pix"
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface"
              )}
              style={{ opacity: isProcessing && selectedMethod !== "pix" ? 0.5 : 1 }}
            >
              <View
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{
                  backgroundColor:
                    selectedMethod === "pix" ? colors.primary : colors.border,
                }}
              >
                <MaterialIcons
                  name="qr-code-2"
                  size={24}
                  color={selectedMethod === "pix" ? colors.background : colors.muted}
                />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">PIX</Text>
                <Text className="text-xs text-muted mt-1">Instantâneo e sem taxas</Text>
              </View>
              {selectedMethod === "pix" && isProcessing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <MaterialIcons
                  name={selectedMethod === "pix" ? "check-circle" : "chevron-right"}
                  size={24}
                  color={selectedMethod === "pix" ? colors.primary : colors.muted}
                />
              )}
            </TouchableOpacity>

            {/* Info Box */}
            <View className="bg-warning/10 rounded-lg p-3 flex-row gap-3 mb-4">
              <MaterialIcons name="info" size={20} color={colors.warning} />
              <Text className="text-xs text-muted flex-1">
                Seu pagamento é processado de forma segura. Você receberá um recibo por email.
              </Text>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={onClose}
              disabled={isProcessing}
              className="rounded-lg py-3 items-center border border-border"
              style={{ opacity: isProcessing ? 0.5 : 1 }}
            >
              <Text className="text-base font-semibold text-foreground">Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
