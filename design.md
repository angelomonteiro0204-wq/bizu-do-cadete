# Design - Bizu do Cadete

## Identidade Visual

O aplicativo "Bizu do Cadete" é inspirado na Academia de Polícia Militar do Barro Branco (APMBB) da Polícia Militar do Estado de São Paulo. A paleta de cores remete ao brasão institucional, com azul marinho como cor principal, dourado para destaques e branco para textos e fundos claros.

### Paleta de Cores

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| primary | #1B3A6B | #2E5090 | Azul marinho APMBB - cor principal |
| background | #F5F6FA | #0F1117 | Fundo das telas |
| surface | #FFFFFF | #1A1D26 | Cards e superfícies elevadas |
| foreground | #1A1A2E | #E8E9ED | Texto principal |
| muted | #6B7280 | #9CA3AF | Texto secundário |
| border | #E2E4EA | #2D3142 | Bordas e divisores |
| success | #16A34A | #22C55E | Resposta correta (verde) |
| warning | #C4A35A | #D4B76A | Dourado APMBB - destaques |
| error | #DC2626 | #EF4444 | Resposta incorreta (vermelho) |

### Tipografia

Fontes do sistema (San Francisco no iOS, Roboto no Android) com hierarquia clara: títulos em bold, corpo em regular, labels em medium.

## Telas do Aplicativo

### 1. Home (Tab Principal)
Tela inicial com saudação ao cadete, estatísticas resumidas (total de questionários, questões respondidas, taxa de acerto) e acesso rápido para iniciar novo questionário ou acessar histórico. Header com brasão estilizado e nome "Bizu do Cadete". Cards com gradiente azul marinho para destaque.

### 2. Novo Questionário (Tab Upload)
Tela para upload de arquivos PDF ou PowerPoint. Área de drop/seleção de arquivo com ícone de documento. Após selecionar o arquivo, exibe nome do arquivo e botão "Gerar Questionário". Indicador de progresso durante a geração das questões pela IA. Campo opcional para nomear o questionário.

### 3. Quiz (Tela de Questões)
Tela de resolução do questionário no estilo Qconcursos. Exibe: número da questão (ex: "Questão 3 de 15"), enunciado da questão, 5 alternativas (A a E) como botões selecionáveis. Ao selecionar uma alternativa e confirmar: verde se acertar, vermelho se errar (com a correta em verde). Abaixo aparece o gabarito comentado explicando a resposta correta com referência ao conteúdo do slide/PDF. Botão "Próxima Questão" para avançar. Barra de progresso no topo.

### 4. Resultado (Tela Final do Quiz)
Exibida ao final do questionário. Mostra: nota final (acertos/total), porcentagem de acerto, tempo total, lista resumida de questões com indicador verde/vermelho. Botões: "Revisar Questões" (volta ao quiz em modo revisão) e "Voltar ao Início".

### 5. Histórico (Tab)
Lista de todos os questionários já realizados, salvos localmente. Cada item mostra: nome do questionário, data de realização, nota obtida, número de questões. Ao tocar, pode refazer o questionário ou revisar as respostas anteriores.

## Fluxos Principais

### Fluxo 1: Gerar e Resolver Questionário
1. Usuário toca na tab "Novo" ou no card "Novo Questionário" da Home
2. Seleciona arquivo PDF ou PPTX do dispositivo
3. Opcionalmente nomeia o questionário
4. Toca "Gerar Questionário" → loading com progresso
5. Questionário gerado → tela de Quiz
6. Responde questão por questão com feedback imediato
7. Ao final → tela de Resultado com estatísticas
8. Questionário salvo automaticamente no histórico

### Fluxo 2: Acessar Histórico
1. Usuário toca na tab "Histórico"
2. Vê lista de questionários anteriores
3. Toca em um questionário
4. Escolhe "Refazer" ou "Revisar"
5. Refazer: quiz limpo sem respostas anteriores
6. Revisar: quiz com respostas marcadas e gabaritos visíveis

## Layout e Navegação

Navegação por tabs na parte inferior com 3 abas:
- **Início** (ícone casa) - Tela Home com estatísticas
- **Novo** (ícone +/documento) - Upload e geração de questionário
- **Histórico** (ícone relógio/lista) - Questionários salvos

A tela de Quiz e Resultado são telas empilhadas (stack) acessíveis a partir das tabs.
