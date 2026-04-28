/** @type {const} */
const themeColors = {
  // PM-SP Official Colors: Azul Marinho, Dourado, Verde e Vermelho
  // Light mode: Cores claras e profissionais
  // Dark mode: Cores escuras com acentos dourados para manter identidade PM-SP
  primary: { light: '#003366', dark: '#0D47A1' },        // Azul Marinho PM-SP (mais escuro em dark)
  accent: { light: '#D4AF37', dark: '#FFD700' },         // Dourado PM-SP (mantém brilho em dark)
  success: { light: '#2E7D32', dark: '#66BB6A' },        // Verde (mais claro em dark)
  warning: { light: '#F57C00', dark: '#FFB74D' },        // Laranja (mais claro em dark)
  error: { light: '#C62828', dark: '#EF5350' },          // Vermelho (mais claro em dark)
  
  // Background e Surface - Dark mode com tons azulados para manter tema PM-SP
  background: { light: '#F8F9FB', dark: '#0A1428' },     // Azul muito escuro (quase preto)
  surface: { light: '#FFFFFF', dark: '#1A2332' },        // Azul escuro (cards/surfaces)
  foreground: { light: '#0D1117', dark: '#E6EDF3' },     // Texto branco em dark
  muted: { light: '#57606A', dark: '#8B949E' },          // Texto secundário
  border: { light: '#D0D7DE', dark: '#30363D' },         // Bordas sutis
};

module.exports = { themeColors };
