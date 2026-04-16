import { Text, View, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { startOAuthLogin } from "@/constants/oauth";
import { useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function LoginScreen() {
  const colors = useColors();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await startOAuthLogin();
    } catch (err) {
      console.error("[Login] Error:", err);
    } finally {
      setTimeout(() => setLoading(false), 3000);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header with gradient-like effect */}
        <View style={[styles.headerBg, { backgroundColor: "#1B2A4A" }]}>
          <View style={styles.headerContent}>
            <View style={[styles.logoCircle, { backgroundColor: "#C8A84E" }]}>
              <MaterialIcons name="school" size={48} color="#1B2A4A" />
            </View>
            <Text style={styles.appTitle}>Bizu do Cadete</Text>
            <Text style={styles.appSubtitle}>Questões e Gabaritos Comentados</Text>
          </View>
        </View>

        {/* Login area */}
        <View style={styles.loginArea}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="lock-outline" size={32} color="#C8A84E" />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              Acesso Restrito
            </Text>
            <Text style={[styles.cardDesc, { color: colors.muted }]}>
              Faça login para acessar os questionários. O acesso é liberado mediante assinatura ativa.
            </Text>

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#1B2A4A" size="small" />
              ) : (
                <>
                  <MaterialIcons name="login" size={20} color="#1B2A4A" />
                  <Text style={styles.loginBtnText}>Entrar com Manus</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <MaterialIcons name="verified-user" size={18} color="#C8A84E" />
              <Text style={[styles.infoText, { color: colors.muted }]}>
                Acesso seguro e criptografado
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="credit-card" size={18} color="#C8A84E" />
              <Text style={[styles.infoText, { color: colors.muted }]}>
                Assinatura mensal gerenciada pelo administrador
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="block" size={18} color="#C8A84E" />
              <Text style={[styles.infoText, { color: colors.muted }]}>
                Acesso bloqueado automaticamente por inadimplência
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBg: {
    paddingTop: 60,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: { alignItems: "center", gap: 12 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  appSubtitle: {
    fontSize: 14,
    color: "#C8A84E",
    fontWeight: "500",
  },
  loginArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 24,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  cardDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#C8A84E",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 8,
    width: "100%",
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B2A4A",
  },
  infoSection: { gap: 12, paddingHorizontal: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoText: { fontSize: 13, flex: 1 },
});
