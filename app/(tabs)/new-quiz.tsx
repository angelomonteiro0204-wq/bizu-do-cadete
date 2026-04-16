import { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { saveQuiz } from "@/lib/quiz-store";
import { SUBJECT_OPTIONS } from "@/shared/quiz-types";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function NewQuizScreen() {
  const colors = useColors();
  const router = useRouter();
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [title, setTitle] = useState("");
  const [questionCount, setQuestionCount] = useState("10");
  const [subject, setSubject] = useState("");
  const [showSubjects, setShowSubjects] = useState(false);
  const [simulatedMode, setSimulatedMode] = useState(false);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("30");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  const uploadMutation = trpc.quiz.uploadAndGenerate.useMutation();

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "application/vnd.ms-powerpoint",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
          "application/vnd.oasis.opendocument.text",
          "application/vnd.oasis.opendocument.presentation",
          "application/vnd.oasis.opendocument.spreadsheet",
          "application/rtf",
          "text/rtf",
          "text/plain",
          "text/markdown",
          "text/csv",
          "text/html",
          "text/xml",
          "application/json",
          "application/xml",
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setFile(result.assets[0]);
      }
    } catch (err) {
      console.error("Erro ao selecionar arquivo:", err);
    }
  };

  const generateQuiz = async () => {
    if (!file) {
      Alert.alert("Atenção", "Selecione um arquivo primeiro.");
      return;
    }

    setLoading(true);
    setProgress("Lendo arquivo...");

    try {
      let base64Data = "";

      if (Platform.OS === "web") {
        if (file.uri.startsWith("data:")) {
          base64Data = file.uri.split(",")[1] || "";
        } else {
          const response = await fetch(file.uri);
          const blob = await response.blob();
          base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result.split(",")[1] || "");
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      } else {
        base64Data = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      setProgress("Extraindo conteúdo do arquivo...");

      const count = Math.min(30, Math.max(5, parseInt(questionCount) || 10));

      setProgress("Gerando questões com IA... Isso pode levar alguns segundos.");

      const quiz = await uploadMutation.mutateAsync({
        fileBase64: base64Data,
        fileName: file.name,
        mimeType: file.mimeType || "application/pdf",
        title: title.trim() || undefined,
        questionCount: count,
      });

      // Add subject to quiz
      if (subject) {
        (quiz as any).subject = subject;
      }

      setProgress("Salvando questionário...");
      await saveQuiz(quiz);

      const quizId = quiz.id;
      setFile(null);
      setTitle("");
      setQuestionCount("10");
      setLoading(false);
      setProgress("");

      // Navigate with simulated mode params if enabled
      if (simulatedMode) {
        const limitSec = Math.max(1, parseInt(timeLimitMinutes) || 30) * 60;
        router.push(`/quiz/${quizId}?simulated=true&timeLimit=${limitSec}` as any);
      } else {
        router.push(`/quiz/${quizId}` as any);
      }
    } catch (error: any) {
      setLoading(false);
      setProgress("");
      Alert.alert(
        "Erro",
        error?.message || "Não foi possível gerar o questionário. Tente novamente."
      );
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.headerTitle}>Novo Questionário</Text>
              <Text style={styles.headerSubtitle}>
                Envie um documento para gerar questões automaticamente
              </Text>
            </View>
            <View style={styles.headerIcon}>
              <MaterialIcons name="note-add" size={32} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* File Picker */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Arquivo</Text>
            <TouchableOpacity
              style={[
                styles.filePicker,
                {
                  backgroundColor: colors.surface,
                  borderColor: file ? colors.primary : colors.border,
                  borderStyle: file ? "solid" : "dashed",
                },
              ]}
              onPress={pickDocument}
              activeOpacity={0.7}
              disabled={loading}
            >
              {file ? (
                <View style={styles.fileSelected}>
                  <View style={[styles.fileIcon, { backgroundColor: colors.primary + "15" }]}>
                    <MaterialIcons name="description" size={28} color={colors.primary} />
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text style={[styles.fileSize, { color: colors.muted }]}>
                      {file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ""}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setFile(null)}
                    style={styles.removeFile}
                    disabled={loading}
                  >
                    <MaterialIcons name="close" size={20} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.fileEmpty}>
                  <MaterialIcons name="upload-file" size={40} color={colors.muted} />
                  <Text style={[styles.fileEmptyText, { color: colors.foreground }]}>
                    Toque para selecionar
                  </Text>
                  <Text style={[styles.fileEmptyHint, { color: colors.muted }]}>
                    PDF, PowerPoint, Word, TXT e outros formatos
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.formatHint}>
              <MaterialIcons name="info-outline" size={13} color={colors.muted} />
              <Text style={[styles.formatHintText, { color: colors.muted }]}>
                Em caso de incompatibilidade do formato do arquivo ou erro de extração do texto do documento, converta para PDF e tente novamente.
              </Text>
            </View>
          </View>

          {/* Subject / Matéria */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Matéria / Disciplina
            </Text>
            <TouchableOpacity
              style={[
                styles.subjectPicker,
                {
                  backgroundColor: colors.surface,
                  borderColor: subject ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setShowSubjects(!showSubjects)}
              activeOpacity={0.7}
              disabled={loading}
            >
              <MaterialIcons
                name="school"
                size={20}
                color={subject ? colors.primary : colors.muted}
              />
              <Text
                style={[
                  styles.subjectPickerText,
                  { color: subject ? colors.foreground : colors.muted },
                ]}
              >
                {subject || "Selecione a matéria (opcional)"}
              </Text>
              <MaterialIcons
                name={showSubjects ? "expand-less" : "expand-more"}
                size={22}
                color={colors.muted}
              />
            </TouchableOpacity>
            {showSubjects && (
              <View style={[styles.subjectList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[
                    styles.subjectItem,
                    !subject && { backgroundColor: colors.primary + "15" },
                  ]}
                  onPress={() => { setSubject(""); setShowSubjects(false); }}
                >
                  <Text style={[styles.subjectItemText, { color: colors.muted, fontStyle: "italic" }]}>
                    Nenhuma (não categorizar)
                  </Text>
                </TouchableOpacity>
                {SUBJECT_OPTIONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.subjectItem,
                      subject === s && { backgroundColor: colors.primary + "15" },
                    ]}
                    onPress={() => { setSubject(s); setShowSubjects(false); }}
                  >
                    <Text
                      style={[
                        styles.subjectItemText,
                        { color: subject === s ? colors.primary : colors.foreground },
                        subject === s && { fontWeight: "700" },
                      ]}
                    >
                      {s}
                    </Text>
                    {subject === s && (
                      <MaterialIcons name="check" size={18} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Title */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Título do Questionário (opcional)
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              placeholder="Ex: Direito Constitucional - Aula 3"
              placeholderTextColor={colors.muted}
              value={title}
              onChangeText={setTitle}
              editable={!loading}
              returnKeyType="done"
            />
          </View>

          {/* Question Count */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Número de Questões
            </Text>
            <View style={styles.counterRow}>
              {[5, 10, 15, 20].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.counterButton,
                    {
                      backgroundColor:
                        questionCount === String(n) ? colors.primary : colors.surface,
                      borderColor:
                        questionCount === String(n) ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setQuestionCount(String(n))}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.counterText,
                      {
                        color: questionCount === String(n) ? "#FFFFFF" : colors.foreground,
                      },
                    ]}
                  >
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Simulated Mode */}
          <View style={[styles.simulatedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.simulatedRow}>
              <View style={styles.simulatedInfo}>
                <View style={styles.simulatedTitleRow}>
                  <MaterialIcons name="timer" size={20} color={colors.warning} />
                  <Text style={[styles.simulatedTitle, { color: colors.foreground }]}>
                    Modo Simulado
                  </Text>
                </View>
                <Text style={[styles.simulatedDesc, { color: colors.muted }]}>
                  Cronômetro regressivo como em prova real
                </Text>
              </View>
              <Switch
                value={simulatedMode}
                onValueChange={setSimulatedMode}
                trackColor={{ false: colors.border, true: colors.warning + "80" }}
                thumbColor={simulatedMode ? colors.warning : colors.muted}
                disabled={loading}
              />
            </View>
            {simulatedMode && (
              <View style={styles.timeLimitRow}>
                <Text style={[styles.timeLimitLabel, { color: colors.foreground }]}>
                  Tempo limite:
                </Text>
                <View style={styles.timeLimitOptions}>
                  {[15, 30, 45, 60].map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.timeLimitButton,
                        {
                          backgroundColor:
                            timeLimitMinutes === String(m) ? colors.warning : colors.background,
                          borderColor:
                            timeLimitMinutes === String(m) ? colors.warning : colors.border,
                        },
                      ]}
                      onPress={() => setTimeLimitMinutes(String(m))}
                      disabled={loading}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.timeLimitText,
                          {
                            color: timeLimitMinutes === String(m) ? "#FFFFFF" : colors.foreground,
                          },
                        ]}
                      >
                        {m}min
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Generate Button */}
          <TouchableOpacity
            style={[
              styles.generateButton,
              {
                backgroundColor: file && !loading ? colors.primary : colors.muted,
              },
            ]}
            onPress={generateQuiz}
            disabled={!file || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.generateButtonText}>{progress}</Text>
              </View>
            ) : (
              <View style={styles.loadingRow}>
                <MaterialIcons name="auto-awesome" size={22} color="#FFFFFF" />
                <Text style={styles.generateButtonText}>Gerar Questionário</Text>
              </View>
            )}
          </TouchableOpacity>

          {loading && (
            <View style={styles.loadingHint}>
              <MaterialIcons name="info-outline" size={16} color={colors.muted} />
              <Text style={[styles.loadingHintText, { color: colors.muted }]}>
                A IA está analisando o conteúdo e gerando questões no estilo APMBB. Isso pode levar até 1 minuto.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
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
  headerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4, lineHeight: 20 },
  content: { padding: 16, gap: 20 },
  fieldGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600" },
  filePicker: { borderRadius: 16, borderWidth: 2, overflow: "hidden" },
  fileSelected: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  fileIcon: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: "600" },
  fileSize: { fontSize: 12, marginTop: 2 },
  removeFile: { padding: 4 },
  fileEmpty: { alignItems: "center", paddingVertical: 32, gap: 8 },
  fileEmptyText: { fontSize: 15, fontWeight: "600" },
  fileEmptyHint: { fontSize: 12 },
  formatHint: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 8, paddingHorizontal: 4 },
  formatHintText: { fontSize: 11, lineHeight: 16, flex: 1, fontStyle: "italic" },
  subjectPicker: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  subjectPickerText: { flex: 1, fontSize: 15 },
  subjectList: {
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 250,
    overflow: "hidden",
  },
  subjectItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  subjectItemText: { fontSize: 14 },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  counterRow: { flexDirection: "row", gap: 10 },
  counterButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  counterText: { fontSize: 16, fontWeight: "700" },
  simulatedCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  simulatedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  simulatedInfo: { flex: 1, paddingRight: 12 },
  simulatedTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  simulatedTitle: { fontSize: 15, fontWeight: "700" },
  simulatedDesc: { fontSize: 12, marginTop: 4, lineHeight: 18 },
  timeLimitRow: { gap: 8 },
  timeLimitLabel: { fontSize: 13, fontWeight: "600" },
  timeLimitOptions: { flexDirection: "row", gap: 8 },
  timeLimitButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  timeLimitText: { fontSize: 13, fontWeight: "700" },
  generateButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  generateButtonText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  loadingHint: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: 4 },
  loadingHintText: { fontSize: 12, lineHeight: 18, flex: 1 },
});
