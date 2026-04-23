import { ScrollView, Text, View, Pressable, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuthGate } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import { router } from "expo-router";

export default function DebugScreen() {
  const colors = useColors();
  const { user, isAdmin, subscription, loading } = useAuthGate();

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              🐛 Debug Info
            </Text>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.closeBtn,
                { backgroundColor: colors.error, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Loading State */}
          {loading && (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.foreground }}>Carregando informações...</Text>
            </View>
          )}

          {/* User Info */}
          {user && (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                👤 Usuário
              </Text>
              <Text style={[styles.value, { color: colors.muted }]}>
                ID: {user.id}
              </Text>
              <Text style={[styles.value, { color: colors.muted }]}>
                OpenID: {user.openId}
              </Text>
              <Text style={[styles.value, { color: colors.muted }]}>
                Email: {user.email || "N/A"}
              </Text>
            </View>
          )}

          {/* Admin Status */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: isAdmin ? colors.success : colors.error,
                opacity: 0.2,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: isAdmin ? colors.success : colors.error },
              ]}
            >
              {isAdmin ? "✓ ADMIN" : "✗ NÃO ADMIN"}
            </Text>
            <Text style={[styles.value, { color: colors.foreground }]}>
              Role: {user?.role || "unknown"}
            </Text>
          </View>

          {/* Subscription Info */}
          {subscription && (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                🎫 Assinatura
              </Text>
              <Text style={[styles.value, { color: colors.muted }]}>
                Status: {subscription.status}
              </Text>
              <Text style={[styles.value, { color: colors.muted }]}>
                Vencimento:{" "}
                {subscription.expiresAt
                  ? new Date(subscription.expiresAt).toLocaleDateString("pt-BR")
                  : "N/A"}
              </Text>
              <Text style={[styles.value, { color: colors.muted }]}>
                Ativa: {subscription.isActive ? "Sim" : "Não"}
              </Text>
            </View>
          )}

          {/* Environment Info */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              ⚙️ Ambiente
            </Text>
            <Text style={[styles.value, { color: colors.muted }]}>
              API: {process.env.EXPO_PUBLIC_API_URL || "N/A"}
            </Text>
            <Text style={[styles.value, { color: colors.muted }]}>
              Modo: {__DEV__ ? "Desenvolvimento" : "Produção"}
            </Text>
          </View>

          {/* Instructions */}
          <View style={[styles.card, { backgroundColor: colors.warning, opacity: 0.1 }]}>
            <Text style={[styles.label, { color: colors.warning }]}>
              ℹ️ Instruções
            </Text>
            <Text style={[styles.value, { color: colors.foreground }]}>
              Se você não está sendo reconhecido como admin, compartilhe as
              informações acima (OpenID e Role) com o suporte.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtnText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  card: {
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  value: {
    fontSize: 12,
    fontFamily: "monospace",
    lineHeight: 16,
  },
});
