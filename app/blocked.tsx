import { Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function BlockedScreen() {
  const colors = useColors();
  const { user, logout } = useAuth();

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.headerBg, { backgroundColor: "#1B2A4A" }]}>
          <View style={styles.headerContent}>
            <View style={[styles.iconCircle, { backgroundColor: "#DC2626" }]}>
              <MaterialIcons name="lock" size={44} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle}>Acesso Bloqueado</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="warning" size={40} color="#DC2626" />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              Assinatura Inativa
            </Text>
            <Text style={[styles.cardDesc, { color: colors.muted }]}>
              Sua assinatura expirou ou ainda não foi ativada. Entre em contato com o administrador para renovar seu acesso.
            </Text>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.infoBlock}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Usuário:</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {user?.name || user?.email || "Não identificado"}
              </Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Status:</Text>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: "#DC2626" }]} />
                <Text style={styles.statusText}>Inadimplente</Text>
              </View>
            </View>
          </View>

          <View style={[styles.helpCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="help-outline" size={24} color="#C8A84E" />
            <View style={styles.helpTextWrap}>
              <Text style={[styles.helpTitle, { color: colors.foreground }]}>
                Como renovar?
              </Text>
              <Text style={[styles.helpDesc, { color: colors.muted }]}>
                Realize o pagamento da mensalidade e aguarde o administrador ativar sua assinatura. O acesso será liberado automaticamente.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={logout}
            activeOpacity={0.7}
          >
            <MaterialIcons name="logout" size={18} color="#DC2626" />
            <Text style={styles.logoutText}>Sair da conta</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBg: {
    paddingTop: 60,
    paddingBottom: 36,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: { alignItems: "center", gap: 14 },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
  },
  cardTitle: { fontSize: 20, fontWeight: "700" },
  cardDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  divider: { height: 1, width: "100%", marginVertical: 4 },
  infoBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 4,
  },
  infoLabel: { fontSize: 14, fontWeight: "500" },
  infoValue: { fontSize: 14, fontWeight: "600", flexShrink: 1, textAlign: "right" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: "600", color: "#DC2626" },
  helpCard: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  helpTextWrap: { flex: 1, gap: 4 },
  helpTitle: { fontSize: 14, fontWeight: "600" },
  helpDesc: { fontSize: 13, lineHeight: 18 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: 8,
  },
  logoutText: { fontSize: 15, fontWeight: "600", color: "#DC2626" },
});
