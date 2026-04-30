import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { startOAuthLogin } from "@/constants/oauth";
import { useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBg: {
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerContent: {
    alignItems: "center",
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
    color: "#FFFFFF",
  },
  appSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  loginArea: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  card: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  loginBtn: {
    backgroundColor: "#C8A84E",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  loginBtnText: {
    color: "#1B2A4A",
    fontSize: 16,
    fontWeight: "600",
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  oauthBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  oauthBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  infoSection: {
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  priceTag: {
    backgroundColor: "#C8A84E",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 12,
  },
  priceText: {
    color: "#1B2A4A",
    fontWeight: "700",
    fontSize: 14,
  },
});

export default function LoginScreen() {
  const colors = useColors();
  const [email, setEmail] = useState("teste@test.com");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);

  const handleOAuthLogin = async () => {
    setLoading(true);
    try {
      await startOAuthLogin();
    } catch (err) {
      console.error("[Login] Error:", err);
      Alert.alert("Erro", "Falha ao fazer login com Manus");
    } finally {
      setTimeout(() => setLoading(false), 3000);
    }
  };

  const handleEmailLogin = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Erro", "Por favor, preencha email e senha");
      return;
    }
    Alert.alert("Sucesso", `Login com ${email}\n\nFuncionalidade de email/senha em desenvolvimento.\nUse o botão 'Entrar com Manus' para testar.`);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
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
              Fazer Login
            </Text>
            <Text style={[styles.cardDesc, { color: colors.muted }]}>
              Faça login para acessar os questionários
            </Text>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.foreground }]}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: colors.border,
                    color: colors.foreground,
                    backgroundColor: colors.background,
                  },
                ]}
                placeholder="seu@email.com"
                placeholderTextColor={colors.muted}
                value={email}
                onChangeText={setEmail}
                editable={!loading}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.foreground }]}>Senha</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: colors.border,
                    color: colors.foreground,
                    backgroundColor: colors.background,
                  },
                ]}
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
                secureTextEntry
              />
            </View>

            {/* Email Login Button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleEmailLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#1B2A4A" size="small" />
              ) : (
                <>
                  <MaterialIcons name="login" size={20} color="#1B2A4A" />
                  <Text style={styles.loginBtnText}>Entrar com Email</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* OAuth Login Button */}
            <TouchableOpacity
              style={[styles.oauthBtn, { borderColor: colors.border }]}
              onPress={handleOAuthLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <MaterialIcons name="login" size={20} color="#C8A84E" />
              <Text style={[styles.oauthBtnText, { color: colors.foreground }]}>
                Entrar com Manus (Google/GitHub)
              </Text>
            </TouchableOpacity>

            {/* Price Tag */}
            <View style={styles.priceTag}>
              <Text style={styles.priceText}>💳 Assinatura: R$ 5,00/mês</Text>
            </View>
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <MaterialIcons name="verified-user" size={18} color="#C8A84E" />
              <Text style={[styles.infoText, { color: colors.muted }]}>
                Acesso seguro com autenticação
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="credit-card" size={18} color="#C8A84E" />
              <Text style={[styles.infoText, { color: colors.muted }]}>
                Múltiplas formas de pagamento
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="block" size={18} color="#C8A84E" />
              <Text style={[styles.infoText, { color: colors.muted }]}>
                Acesso bloqueado se assinatura expirar
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
