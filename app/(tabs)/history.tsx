import { useCallback, useState } from "react";
import {
  FlatList,
  Text,
  View,
  TouchableOpacity,
  Alert,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getQuizzes, deleteQuiz, getAttemptsByQuizId } from "@/lib/quiz-store";
import type { Quiz, QuizAttempt } from "@/shared/quiz-types";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

interface QuizWithAttempts extends Quiz {
  lastAttempt?: QuizAttempt;
  attemptCount: number;
}

export default function HistoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<QuizWithAttempts[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("Todas");

  const loadData = useCallback(async () => {
    const allQuizzes = await getQuizzes();
    const withAttempts: QuizWithAttempts[] = await Promise.all(
      allQuizzes.map(async (q) => {
        const attempts = await getAttemptsByQuizId(q.id);
        return {
          ...q,
          lastAttempt: attempts[0] || undefined,
          attemptCount: attempts.length,
        };
      })
    );
    setQuizzes(withAttempts);
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

  const handleDelete = (quiz: QuizWithAttempts) => {
    Alert.alert(
      "Excluir Questionário",
      `Deseja excluir "${quiz.title}" e todas as tentativas relacionadas?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            await deleteQuiz(quiz.id);
            await loadData();
          },
        },
      ]
    );
  };

  // Get unique subjects for filter
  const subjects = ["Todas", ...Array.from(new Set(quizzes.map((q) => q.subject).filter(Boolean) as string[]))];

  // Filter quizzes by selected subject
  const filteredQuizzes =
    selectedSubject === "Todas"
      ? quizzes
      : quizzes.filter((q) => q.subject === selectedSubject);

  const renderItem = ({ item }: { item: QuizWithAttempts }) => {
    const lastScore = item.lastAttempt
      ? Math.round((item.lastAttempt.score / item.lastAttempt.totalQuestions) * 100)
      : null;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => router.push(`/quiz/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <View style={[styles.cardIcon, { backgroundColor: colors.primary + "15" }]}>
            <MaterialIcons name="description" size={24} color={colors.primary} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.cardMetaRow}>
              <Text style={[styles.cardMeta, { color: colors.muted }]}>
                {item.questions.length} questões ·{" "}
                {new Date(item.createdAt).toLocaleDateString("pt-BR")}
              </Text>
            </View>
            {item.subject ? (
              <View style={[styles.subjectBadge, { backgroundColor: colors.primary + "15" }]}>
                <MaterialIcons name="school" size={12} color={colors.primary} />
                <Text style={[styles.subjectBadgeText, { color: colors.primary }]}>
                  {item.subject}
                </Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            style={styles.deleteButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="delete-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>

        {item.lastAttempt && (
          <View style={[styles.cardBottom, { borderTopColor: colors.border }]}>
            <View style={styles.cardStat}>
              <Text style={[styles.cardStatLabel, { color: colors.muted }]}>Última nota</Text>
              <Text
                style={[
                  styles.cardStatValue,
                  { color: lastScore !== null && lastScore >= 70 ? colors.success : colors.error },
                ]}
              >
                {item.lastAttempt.score}/{item.lastAttempt.totalQuestions} ({lastScore}%)
              </Text>
            </View>
            <View style={styles.cardStat}>
              <Text style={[styles.cardStatLabel, { color: colors.muted }]}>Tentativas</Text>
              <Text style={[styles.cardStatValue, { color: colors.foreground }]}>
                {item.attemptCount}
              </Text>
            </View>
            {item.lastAttempt.isSimulated ? (
              <View style={styles.cardStat}>
                <Text style={[styles.cardStatLabel, { color: colors.muted }]}>Modo</Text>
                <View style={[styles.simulatedTag, { backgroundColor: colors.warning + "20" }]}>
                  <MaterialIcons name="timer" size={11} color={colors.warning} />
                  <Text style={[styles.simulatedTagText, { color: colors.warning }]}>Simulado</Text>
                </View>
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push(`/quiz/${item.id}` as any)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="play-arrow" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>
              {item.attemptCount > 0 ? "Refazer" : "Iniciar"}
            </Text>
          </TouchableOpacity>
          {item.attemptCount > 0 && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }]}
              onPress={() => router.push(`/quiz/${item.id}?review=true` as any)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="visibility" size={18} color={colors.primary} />
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>Revisar</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>Histórico</Text>
            <Text style={styles.headerSubtitle}>
              {filteredQuizzes.length} questionário{filteredQuizzes.length !== 1 ? "s" : ""} salvo
              {filteredQuizzes.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <MaterialIcons name="history" size={32} color="#FFFFFF" />
          </View>
        </View>
      </View>

      {/* Subject Filter */}
      {subjects.length > 1 && (
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {subjects.map((subj) => (
              <TouchableOpacity
                key={subj}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selectedSubject === subj ? colors.primary : colors.surface,
                    borderColor: selectedSubject === subj ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedSubject(subj)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: selectedSubject === subj ? "#FFFFFF" : colors.foreground },
                  ]}
                >
                  {subj}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {filteredQuizzes.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="folder-open" size={64} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {selectedSubject !== "Todas"
              ? `Nenhum questionário em "${selectedSubject}"`
              : "Nenhum questionário ainda"}
          </Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            {selectedSubject !== "Todas"
              ? "Tente selecionar outra matéria ou gere um novo questionário."
              : 'Gere seu primeiro questionário na aba "Novo" para começar a estudar.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredQuizzes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTextBlock: { flex: 1, paddingRight: 12 },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#FFFFFF" },
  headerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  filterContainer: { paddingTop: 12, paddingBottom: 4 },
  filterScroll: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: { fontSize: 13, fontWeight: "600" },
  list: { padding: 16, gap: 12 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 4 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 12 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "600", lineHeight: 20 },
  cardMetaRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  cardMeta: { fontSize: 12 },
  subjectBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  subjectBadgeText: { fontSize: 11, fontWeight: "600" },
  deleteButton: { padding: 4 },
  cardBottom: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 24,
  },
  cardStat: { gap: 2 },
  cardStatLabel: { fontSize: 11, fontWeight: "500" },
  cardStatValue: { fontSize: 14, fontWeight: "700" },
  simulatedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  simulatedTagText: { fontSize: 11, fontWeight: "600" },
  cardActions: { flexDirection: "row", padding: 14, paddingTop: 4, gap: 10 },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionButtonText: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
