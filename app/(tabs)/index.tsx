import { useCallback, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getStats, getQuizzes, getAttempts, type AppStats } from "@/lib/quiz-store";
import type { Quiz, QuizAttempt } from "@/shared/quiz-types";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const brasaoImage = require("@/assets/images/brasao-apmbb.png");

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const [stats, setStats] = useState<AppStats>({
    totalQuizzes: 0,
    totalQuestions: 0,
    totalCorrect: 0,
    totalAnswered: 0,
  });
  const [recentQuizzes, setRecentQuizzes] = useState<Quiz[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<QuizAttempt[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [s, q, a] = await Promise.all([getStats(), getQuizzes(), getAttempts()]);
    setStats(s);
    setRecentQuizzes(q.slice(0, 3));
    setRecentAttempts(a.slice(0, 5));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const accuracy =
    stats.totalAnswered > 0
      ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100)
      : 0;

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header with Brasão */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.headerGreeting}>Academia Barro Branco</Text>
              <Text style={styles.headerTitle}>Bizu do Cadete</Text>
              <Text style={styles.headerSubtitle}>Polícia Militar do Estado de São Paulo</Text>
            </View>
            <View style={styles.brasaoContainer}>
              <Image
                source={brasaoImage}
                style={styles.brasaoImage}
                contentFit="contain"
              />
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="quiz" size={24} color={colors.primary} />
            <Text style={[styles.statNumber, { color: colors.foreground }]}>{stats.totalQuizzes}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Questionários</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="check-circle" size={24} color={colors.success} />
            <Text style={[styles.statNumber, { color: colors.foreground }]}>{stats.totalCorrect}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Acertos</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="percent" size={24} color={colors.warning} />
            <Text style={[styles.statNumber, { color: colors.foreground }]}>{accuracy}%</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Aproveitamento</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)/new-quiz" as any)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="add-circle" size={24} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Novo Questionário</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Recent Attempts */}
        {recentAttempts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Últimas Tentativas</Text>
            {recentAttempts.map((attempt) => {
              const pct = Math.round((attempt.score / attempt.totalQuestions) * 100);
              const isGood = pct >= 70;
              return (
                <View
                  key={attempt.id}
                  style={[styles.attemptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={styles.attemptInfo}>
                    <Text style={[styles.attemptTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {attempt.quizTitle}
                    </Text>
                    <Text style={[styles.attemptDate, { color: colors.muted }]}>
                      {new Date(attempt.completedAt).toLocaleDateString("pt-BR")}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.attemptScore,
                      { backgroundColor: isGood ? colors.success + "20" : colors.error + "20" },
                    ]}
                  >
                    <Text
                      style={[styles.attemptScoreText, { color: isGood ? colors.success : colors.error }]}
                    >
                      {attempt.score}/{attempt.totalQuestions}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Recent Quizzes */}
        {recentQuizzes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Questionários Salvos</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/history" as any)} activeOpacity={0.7}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>Ver todos</Text>
              </TouchableOpacity>
            </View>
            {recentQuizzes.map((quiz) => (
              <TouchableOpacity
                key={quiz.id}
                style={[styles.quizCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => router.push(`/quiz/${quiz.id}` as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.quizIcon, { backgroundColor: colors.primary + "15" }]}>
                  <MaterialIcons name="description" size={20} color={colors.primary} />
                </View>
                <View style={styles.quizInfo}>
                  <Text style={[styles.quizTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {quiz.title}
                  </Text>
                  <Text style={[styles.quizMeta, { color: colors.muted }]}>
                    {quiz.questions.length} questões
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty State with Brasão */}
        {recentQuizzes.length === 0 && recentAttempts.length === 0 && (
          <View style={styles.emptyState}>
            <Image
              source={brasaoImage}
              style={styles.emptyBrasao}
              contentFit="contain"
            />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Bem-vindo, Cadete!
            </Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Comece enviando um PDF ou PowerPoint para gerar seu primeiro questionário de estudos no estilo APMBB.
            </Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  headerGreeting: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "400",
    marginTop: 4,
  },
  brasaoContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  brasaoImage: {
    width: 60,
    height: 60,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: -12,
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
  },
  attemptCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  attemptInfo: {
    flex: 1,
  },
  attemptTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  attemptDate: {
    fontSize: 12,
    marginTop: 2,
  },
  attemptScore: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  attemptScoreText: {
    fontSize: 14,
    fontWeight: "700",
  },
  quizCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  quizIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  quizInfo: {
    flex: 1,
  },
  quizTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  quizMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 36,
    gap: 12,
  },
  emptyBrasao: {
    width: 120,
    height: 120,
    marginBottom: 8,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
