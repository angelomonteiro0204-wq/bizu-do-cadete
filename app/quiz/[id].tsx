import { useCallback, useEffect, useRef, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getQuizById, saveAttempt, getAttemptsByQuizId } from "@/lib/quiz-store";
import type { Quiz, QuizQuestion, QuizAttempt } from "@/shared/quiz-types";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";

type AnswerLetter = "A" | "B" | "C" | "D" | "E";

export default function QuizScreen() {
  const { id, review, simulated, timeLimit } = useLocalSearchParams<{
    id: string;
    review?: string;
    simulated?: string;
    timeLimit?: string;
  }>();
  const colors = useColors();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerLetter>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [selectedAnswer, setSelectedAnswer] = useState<AnswerLetter | null>(null);
  const [startTime] = useState(Date.now());
  const [isReview, setIsReview] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // Simulated mode state
  const isSimulated = simulated === "true";
  const timeLimitSec = parseInt(timeLimit || "0") || 0;
  const [remainingTime, setRemainingTime] = useState(timeLimitSec);
  const [timerExpired, setTimerExpired] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadQuiz();
  }, [id]);

  // Countdown timer for simulated mode
  useEffect(() => {
    if (isSimulated && timeLimitSec > 0 && !isReview && !showResult) {
      setRemainingTime(timeLimitSec);
      timerRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setTimerExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isSimulated, timeLimitSec, isReview, showResult]);

  // Auto-finish when timer expires
  useEffect(() => {
    if (timerExpired && quiz && !showResult && !isReview) {
      Alert.alert("Tempo Esgotado!", "O tempo do simulado acabou. Veja seu resultado.", [
        { text: "Ver Resultado", onPress: () => finishQuiz() },
      ]);
    }
  }, [timerExpired]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getTimerColor = () => {
    if (remainingTime <= 60) return colors.error;
    if (remainingTime <= 300) return colors.warning;
    return colors.foreground;
  };

  const loadQuiz = async () => {
    if (!id) return;
    const q = await getQuizById(id);
    if (q) {
      setQuiz(q);
      if (review === "true") {
        setIsReview(true);
        const attempts = await getAttemptsByQuizId(id);
        if (attempts.length > 0) {
          const lastAttempt = attempts[0];
          setAnswers(lastAttempt.answers);
          const rev: Record<number, boolean> = {};
          q.questions.forEach((_, i) => { rev[i] = true; });
          setRevealed(rev);
        }
      }
    }
  };

  const currentQuestion: QuizQuestion | undefined = quiz?.questions[currentIndex];
  const totalQuestions = quiz?.questions.length || 0;
  const isAnswered = revealed[currentIndex] === true;

  const handleSelectAnswer = (letter: AnswerLetter) => {
    if (isAnswered || isReview || timerExpired) return;
    setSelectedAnswer(letter);
  };

  const handleConfirm = () => {
    if (!selectedAnswer || !currentQuestion) return;

    const newAnswers = { ...answers, [currentIndex]: selectedAnswer };
    setAnswers(newAnswers);

    const newRevealed = { ...revealed, [currentIndex]: true };
    setRevealed(newRevealed);

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

    if (Platform.OS !== "web") {
      if (isCorrect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }

    setSelectedAnswer(null);
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      finishQuiz();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedAnswer(null);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const finishQuiz = async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (!quiz || isReview) {
      router.back();
      return;
    }

    let score = 0;
    quiz.questions.forEach((q, i) => {
      if (answers[i] === q.correctAnswer) score++;
    });

    const attempt: QuizAttempt = {
      id: `attempt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      quizId: quiz.id,
      quizTitle: quiz.title,
      subject: quiz.subject,
      answers,
      score,
      totalQuestions: quiz.questions.length,
      completedAt: new Date().toISOString(),
      timeSpentSeconds: Math.round((Date.now() - startTime) / 1000),
      isSimulated,
      timeLimitSeconds: timeLimitSec || undefined,
    };

    await saveAttempt(attempt);
    setShowResult(true);
  };

  // ---- PDF Export ----
  const exportResultPdf = async () => {
    if (!quiz) return;

    let score = 0;
    quiz.questions.forEach((q, i) => {
      if (answers[i] === q.correctAnswer) score++;
    });
    const pct = Math.round((score / quiz.questions.length) * 100);
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;
    const date = new Date().toLocaleDateString("pt-BR");

    const questionsHtml = quiz.questions
      .map((q, i) => {
        const userAnswer = answers[i] || "-";
        const correct = userAnswer === q.correctAnswer;
        const icon = correct ? "&#10004;" : "&#10008;";
        const iconColor = correct ? "#22C55E" : "#EF4444";

        const altsHtml = q.alternatives
          .map((alt) => {
            const isCorrect = alt.letter === q.correctAnswer;
            const isChosen = alt.letter === userAnswer;
            let bg = "#f9f9f9";
            let border = "#ddd";
            if (isCorrect) { bg = "#dcfce7"; border = "#22C55E"; }
            else if (isChosen) { bg = "#fee2e2"; border = "#EF4444"; }
            return `<div style="padding:6px 10px;margin:3px 0;border-radius:6px;border:1px solid ${border};background:${bg};font-size:12px;">
              <strong>${alt.letter})</strong> ${alt.text}
            </div>`;
          })
          .join("");

        return `
          <div style="page-break-inside:avoid;margin-bottom:18px;border:1px solid #ddd;border-radius:8px;padding:14px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <span style="color:${iconColor};font-size:18px;">${icon}</span>
              <strong style="font-size:13px;">Questão ${i + 1}</strong>
              <span style="color:#888;font-size:11px;margin-left:auto;">Sua: ${userAnswer} | Gabarito: ${q.correctAnswer}</span>
            </div>
            <p style="font-size:12px;line-height:1.5;margin:0 0 8px 0;">${q.statement}</p>
            ${altsHtml}
            <div style="margin-top:10px;padding:10px;background:#fffbeb;border-left:3px solid #F59E0B;border-radius:4px;">
              <strong style="font-size:11px;color:#B45309;">Gabarito Comentado:</strong>
              <p style="font-size:11px;line-height:1.5;margin:4px 0 0 0;color:#333;">${q.explanation}</p>
            </div>
          </div>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @page { margin: 20px; }
    body { font-family: Helvetica, Arial, sans-serif; color: #333; padding: 10px; }
  </style>
</head>
<body>
  <div style="text-align:center;padding:20px 0;border-bottom:2px solid #1B3A5C;">
    <h1 style="color:#1B3A5C;margin:0;font-size:22px;">Bizu do Cadete</h1>
    <p style="color:#888;margin:4px 0 0 0;font-size:12px;">Resultado do Questionário</p>
  </div>

  <div style="margin:16px 0;padding:16px;background:#f0f4f8;border-radius:8px;">
    <h2 style="margin:0 0 8px 0;font-size:16px;color:#1B3A5C;">${quiz.title}</h2>
    <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:13px;">
      <span><strong>Data:</strong> ${date}</span>
      <span><strong>Acertos:</strong> ${score}/${quiz.questions.length}</span>
      <span><strong>Aproveitamento:</strong> ${pct}%</span>
      <span><strong>Tempo:</strong> ${minutes}min ${seconds}s</span>
      ${isSimulated ? `<span><strong>Modo:</strong> Simulado (${Math.floor(timeLimitSec / 60)}min)</span>` : ""}
      ${quiz.subject ? `<span><strong>Matéria:</strong> ${quiz.subject}</span>` : ""}
    </div>
  </div>

  <h3 style="color:#1B3A5C;font-size:15px;margin:20px 0 10px 0;">Questões e Gabaritos</h3>
  ${questionsHtml}

  <div style="text-align:center;padding:16px 0;border-top:1px solid #ddd;margin-top:20px;">
    <p style="color:#aaa;font-size:10px;">Gerado pelo app Bizu do Cadete - ${date}</p>
  </div>
</body>
</html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Compartilhar Resultado" });
    } catch (err) {
      console.error("Erro ao exportar PDF:", err);
      Alert.alert("Erro", "Não foi possível gerar o PDF. Tente novamente.");
    }
  };

  const getAlternativeStyle = (letter: AnswerLetter) => {
    const isSelected = selectedAnswer === letter;
    const wasChosen = answers[currentIndex] === letter;
    const isCorrectAnswer = currentQuestion?.correctAnswer === letter;

    if (isAnswered || isReview) {
      if (isCorrectAnswer) {
        return { backgroundColor: colors.success + "20", borderColor: colors.success, borderWidth: 2 };
      }
      if (wasChosen && !isCorrectAnswer) {
        return { backgroundColor: colors.error + "20", borderColor: colors.error, borderWidth: 2 };
      }
      return { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, opacity: 0.6 };
    }

    if (isSelected) {
      return { backgroundColor: colors.primary + "15", borderColor: colors.primary, borderWidth: 2 };
    }

    return { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 };
  };

  const getLetterStyle = (letter: AnswerLetter) => {
    const isSelected = selectedAnswer === letter;
    const wasChosen = answers[currentIndex] === letter;
    const isCorrectAnswer = currentQuestion?.correctAnswer === letter;

    if (isAnswered || isReview) {
      if (isCorrectAnswer) return { backgroundColor: colors.success, color: "#FFFFFF" };
      if (wasChosen && !isCorrectAnswer) return { backgroundColor: colors.error, color: "#FFFFFF" };
      return { backgroundColor: colors.border, color: colors.muted };
    }

    if (isSelected) return { backgroundColor: colors.primary, color: "#FFFFFF" };
    return { backgroundColor: colors.border, color: colors.foreground };
  };

  // ---- Result screen ----
  if (showResult && quiz) {
    let score = 0;
    quiz.questions.forEach((q, i) => {
      if (answers[i] === q.correctAnswer) score++;
    });
    const pct = Math.round((score / quiz.questions.length) * 100);
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;

    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <ScrollView contentContainerStyle={styles.resultContainer}>
          <View style={[styles.resultHeader, { backgroundColor: pct >= 70 ? colors.success : colors.error }]}>
            <MaterialIcons
              name={pct >= 70 ? "emoji-events" : "sentiment-dissatisfied"}
              size={64}
              color="#FFFFFF"
            />
            <Text style={styles.resultScore}>{pct}%</Text>
            <Text style={styles.resultScoreDetail}>
              {score} de {quiz.questions.length} questões corretas
            </Text>
            <Text style={styles.resultTime}>
              Tempo: {minutes}min {seconds}s
              {isSimulated ? ` (Simulado ${Math.floor(timeLimitSec / 60)}min)` : ""}
            </Text>
            {quiz.subject ? (
              <View style={styles.resultSubjectBadge}>
                <MaterialIcons name="school" size={14} color="#FFFFFF" />
                <Text style={styles.resultSubjectText}>{quiz.subject}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.resultBody}>
            <Text style={[styles.resultSectionTitle, { color: colors.foreground }]}>
              Resumo das Questões
            </Text>
            {quiz.questions.map((q, i) => {
              const correct = answers[i] === q.correctAnswer;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.resultItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => {
                    setShowResult(false);
                    setCurrentIndex(i);
                    const rev: Record<number, boolean> = {};
                    quiz.questions.forEach((_, idx) => { rev[idx] = true; });
                    setRevealed(rev);
                    setIsReview(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.resultItemIcon,
                      { backgroundColor: correct ? colors.success + "20" : colors.error + "20" },
                    ]}
                  >
                    <MaterialIcons
                      name={correct ? "check" : "close"}
                      size={16}
                      color={correct ? colors.success : colors.error}
                    />
                  </View>
                  <Text style={[styles.resultItemText, { color: colors.foreground }]} numberOfLines={2}>
                    Questão {i + 1}
                  </Text>
                  <Text style={[styles.resultItemAnswer, { color: colors.muted }]}>
                    {answers[i] || "-"} / {q.correctAnswer}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <View style={styles.resultActions}>
              {/* Export PDF */}
              <TouchableOpacity
                style={[styles.resultButton, { backgroundColor: colors.warning }]}
                onPress={exportResultPdf}
                activeOpacity={0.8}
              >
                <MaterialIcons name="picture-as-pdf" size={20} color="#FFFFFF" />
                <Text style={styles.resultButtonText}>Exportar PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.resultButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setShowResult(false);
                  setIsReview(true);
                  setCurrentIndex(0);
                  const rev: Record<number, boolean> = {};
                  quiz.questions.forEach((_, i) => { rev[i] = true; });
                  setRevealed(rev);
                }}
                activeOpacity={0.8}
              >
                <MaterialIcons name="visibility" size={20} color="#FFFFFF" />
                <Text style={styles.resultButtonText}>Revisar Questões</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.resultButton, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }]}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <MaterialIcons name="home" size={20} color={colors.primary} />
                <Text style={[styles.resultButtonText, { color: colors.primary }]}>Voltar ao Início</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (!quiz || !currentQuestion) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.muted }]}>Carregando...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const answeredCount = Object.keys(revealed).length;
  const progressPct = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => {
          if (isReview) { router.back(); return; }
          Alert.alert("Sair do Questionário", "Seu progresso será perdido. Deseja sair?", [
            { text: "Cancelar", style: "cancel" },
            { text: "Sair", style: "destructive", onPress: () => router.back() },
          ]);
        }} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={[styles.topBarTitle, { color: colors.foreground }]}>
            {isReview ? "Revisão" : `Questão ${currentIndex + 1} de ${totalQuestions}`}
          </Text>
          {/* Timer for simulated mode */}
          {isSimulated && !isReview && (
            <View style={styles.timerRow}>
              <MaterialIcons name="timer" size={16} color={getTimerColor()} />
              <Text style={[styles.timerText, { color: getTimerColor() }]}>
                {formatTime(remainingTime)}
              </Text>
            </View>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: colors.primary }]} />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.quizContent}>
        {/* Question Number Badge */}
        <View style={[styles.questionBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.questionBadgeText}>Questão {currentIndex + 1}</Text>
        </View>

        {/* Statement */}
        <View style={[styles.statementCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statementText, { color: colors.foreground }]}>
            {currentQuestion.statement}
          </Text>
        </View>

        {/* Alternatives */}
        <View style={styles.alternativesContainer}>
          {currentQuestion.alternatives.map((alt) => {
            const altStyle = getAlternativeStyle(alt.letter);
            const letterStyle = getLetterStyle(alt.letter);
            const wasChosen = answers[currentIndex] === alt.letter;
            const isCorrectAnswer = currentQuestion.correctAnswer === alt.letter;

            return (
              <TouchableOpacity
                key={alt.letter}
                style={[styles.alternative, altStyle]}
                onPress={() => handleSelectAnswer(alt.letter)}
                activeOpacity={isAnswered || isReview ? 1 : 0.7}
                disabled={isAnswered || isReview}
              >
                <View style={[styles.letterBadge, { backgroundColor: letterStyle.backgroundColor }]}>
                  <Text style={[styles.letterText, { color: letterStyle.color }]}>{alt.letter}</Text>
                </View>
                <Text style={[styles.alternativeText, { color: colors.foreground, flex: 1 }]}>
                  {alt.text}
                </Text>
                {(isAnswered || isReview) && isCorrectAnswer && (
                  <MaterialIcons name="check-circle" size={22} color={colors.success} />
                )}
                {(isAnswered || isReview) && wasChosen && !isCorrectAnswer && (
                  <MaterialIcons name="cancel" size={22} color={colors.error} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Confirm Button */}
        {!isAnswered && !isReview && selectedAnswer && !timerExpired && (
          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: colors.primary }]}
            onPress={handleConfirm}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmButtonText}>Confirmar Resposta</Text>
          </TouchableOpacity>
        )}

        {/* Explanation */}
        {(isAnswered || isReview) && (
          <View style={[styles.explanationCard, { backgroundColor: colors.surface, borderColor: colors.warning, borderLeftWidth: 4 }]}>
            <View style={styles.explanationHeader}>
              <MaterialIcons name="lightbulb" size={20} color={colors.warning} />
              <Text style={[styles.explanationTitle, { color: colors.warning }]}>Gabarito Comentado</Text>
            </View>
            <Text style={[styles.explanationText, { color: colors.foreground }]}>
              {currentQuestion.explanation}
            </Text>
            {currentQuestion.sourceReference && (
              <Text style={[styles.sourceRef, { color: colors.muted }]}>
                Referência: {currentQuestion.sourceReference}
              </Text>
            )}
          </View>
        )}

        {/* Navigation */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[
              styles.navButton,
              {
                backgroundColor: currentIndex > 0 ? colors.surface : "transparent",
                borderColor: currentIndex > 0 ? colors.border : "transparent",
                borderWidth: 1,
              },
            ]}
            onPress={handlePrevious}
            disabled={currentIndex === 0}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={20} color={currentIndex > 0 ? colors.foreground : "transparent"} />
            <Text style={[styles.navButtonText, { color: currentIndex > 0 ? colors.foreground : "transparent" }]}>
              Anterior
            </Text>
          </TouchableOpacity>

          {(isAnswered || isReview) && (
            <TouchableOpacity
              style={[styles.navButton, { backgroundColor: colors.primary }]}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={[styles.navButtonText, { color: "#FFFFFF" }]}>
                {currentIndex < totalQuestions - 1
                  ? "Próxima"
                  : isReview
                  ? "Voltar"
                  : "Finalizar"}
              </Text>
              <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: 16 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  topBarCenter: { flex: 1, alignItems: "center" },
  topBarTitle: { fontSize: 16, fontWeight: "700" },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  timerText: { fontSize: 18, fontWeight: "800", fontVariant: ["tabular-nums"] },
  progressBar: { height: 4, width: "100%" },
  progressFill: { height: 4, borderRadius: 2 },
  quizContent: { padding: 16, gap: 16 },
  questionBadge: { alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  questionBadgeText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  statementCard: { padding: 18, borderRadius: 16, borderWidth: 1 },
  statementText: { fontSize: 15, lineHeight: 24, fontWeight: "500" },
  alternativesContainer: { gap: 10 },
  alternative: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, gap: 12 },
  letterBadge: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  letterText: { fontSize: 14, fontWeight: "700" },
  alternativeText: { fontSize: 14, lineHeight: 20 },
  confirmButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  explanationCard: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "transparent", gap: 10 },
  explanationHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  explanationTitle: { fontSize: 15, fontWeight: "700" },
  explanationText: { fontSize: 14, lineHeight: 22 },
  sourceRef: { fontSize: 12, fontStyle: "italic", marginTop: 4 },
  navRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 8 },
  navButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, gap: 8 },
  navButtonText: { fontSize: 14, fontWeight: "600" },
  // Result styles
  resultContainer: { flexGrow: 1 },
  resultHeader: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 20, gap: 8 },
  resultScore: { fontSize: 56, fontWeight: "800", color: "#FFFFFF" },
  resultScoreDetail: { fontSize: 16, color: "rgba(255,255,255,0.9)", fontWeight: "600" },
  resultTime: { fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  resultSubjectBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  resultSubjectText: { fontSize: 12, fontWeight: "600", color: "#FFFFFF" },
  resultBody: { padding: 16, gap: 12 },
  resultSectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 4 },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  resultItemIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  resultItemText: { flex: 1, fontSize: 14, fontWeight: "500" },
  resultItemAnswer: { fontSize: 13, fontWeight: "600" },
  resultActions: { gap: 12, marginTop: 16, marginBottom: 32 },
  resultButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  resultButtonText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
});
