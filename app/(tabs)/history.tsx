import { useCallback, useState } from "react";
import {
  FlatList,
  Text,
  View,
  TouchableOpacity,
  Alert,
  StyleSheet,
  RefreshControl,
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
            <Text style={[styles.cardMeta, { color: colors.muted }]}>
              {item.questions.length} questões ·{" "}
              {new Date(item.createdAt).toLocaleDateString("pt-BR")}
            </Text>
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
        <Text style={styles.headerTitle}>Histórico</Text>
        <Text style={styles.headerSubtitle}>
          {quizzes.length} questionário{quizzes.length !== 1 ? "s" : ""} salvo
          {quizzes.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {quizzes.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="history" size={64} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Nenhum questionário ainda
          </Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Gere seu primeiro questionário na aba "Novo" para começar a estudar.
          </Text>
        </View>
      ) : (
        <FlatList
          data={quizzes}
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
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 4,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 12,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  cardMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  deleteButton: {
    padding: 4,
  },
  cardBottom: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 24,
  },
  cardStat: {
    gap: 2,
  },
  cardStatLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  cardStatValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  cardActions: {
    flexDirection: "row",
    padding: 14,
    paddingTop: 4,
    gap: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
